#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$PrUrl,

    [Parameter(Mandatory = $false)]
    [switch]$AllowBranchSync,

    [Parameter(Mandatory = $false)]
    [bool]$RequireCleanTreeForSync = $true,

    [Parameter(Mandatory = $false)]
    [ValidateSet('markdown', 'json')]
    [string]$OutputFormat = 'markdown',

    [Parameter(Mandatory = $false)]
    [bool]$IncludeConversationComments = $true,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 500)]
    [int]$MaxPages = 50
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Exe,
        [Parameter(Mandatory = $false)]
        [string[]]$Args = @()
    )

    $output = & $Exe @Args 2>&1
    $exitCode = $LASTEXITCODE

    return [PSCustomObject]@{
        ExitCode = $exitCode
        Output   = @($output | ForEach-Object { $_.ToString() })
    }
}

function Invoke-GhGraphQl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Query,
        [Parameter(Mandatory = $false)]
        [hashtable]$Variables = @{}
    )

    $args = @('api', 'graphql', '-f', "query=$Query")

    foreach ($kv in $Variables.GetEnumerator()) {
        $name = [string]$kv.Key
        $value = $kv.Value
        if ($null -eq $value) {
            continue
        }

        if ($value -is [int] -or $value -is [long]) {
            $args += @('-F', "$name=$value")
        } elseif ($value -is [string]) {
            $args += @('-f', "$name=$value")
        } else {
            return [PSCustomObject]@{
                Success = $false
                Error   = "Unsupported GraphQL variable type for '$name': $($value.GetType().FullName). Supported types are string, int, and long."
                Data    = $null
            }
        }
    }

    $res = Invoke-External -Exe gh -Args $args
    if ($res.ExitCode -ne 0) {
        return [PSCustomObject]@{
            Success = $false
            Error   = "gh api graphql failed: $($res.Output -join ' ')"
            Data    = $null
        }
    }

    try {
        $json = ($res.Output -join "`n") | ConvertFrom-Json
    } catch {
        return [PSCustomObject]@{
            Success = $false
            Error   = "Failed to parse GraphQL response JSON: $($_.Exception.Message)"
            Data    = $null
        }
    }

    $errorsProp = $json.PSObject.Properties['errors']
    if ($null -ne $errorsProp -and $null -ne $errorsProp.Value -and @($errorsProp.Value).Count -gt 0) {
        $messages = @($errorsProp.Value | ForEach-Object { [string]$_.message }) -join '; '
        return [PSCustomObject]@{
            Success = $false
            Error   = "GraphQL returned errors: $messages"
            Data    = $json
        }
    }

    return [PSCustomObject]@{
        Success = $true
        Error   = $null
        Data    = $json
    }
}

function New-Result {
    return [ordered]@{
        pr_metadata = [ordered]@{
            number           = $null
            title            = $null
            url              = $null
            head_branch      = $null
            retrieved_at_utc = [DateTime]::UtcNow.ToString('o')
        }
        execution_status = [ordered]@{
            needs_sync               = $false
            sync_reason              = $null
            safe_to_sync             = $true
            retrieval_skipped_reason = $null
            error                    = $null
        }
        sync_commands = @()
        unresolved_review_comments = @()
        pr_conversation_comments   = @()
        warnings = @()
        totals = [ordered]@{
            unresolved_thread_count         = 0
            unresolved_review_comment_count = 0
            conversation_comment_count      = 0
        }
    }
}

function Emit-Result {
    param(
        [Parameter(Mandatory = $true)]
        $Result,
        [Parameter(Mandatory = $false)]
        [int]$ExitCode = 0
    )

    if ($OutputFormat -eq 'json') {
        $Result | ConvertTo-Json -Depth 60
    } else {
        Convert-ResultToMarkdown -Result $Result
    }

    exit $ExitCode
}

function Fail-WithResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [Parameter(Mandatory = $true)]
        $Result,
        [Parameter(Mandatory = $false)]
        [int]$ExitCode = 1
    )

    $Result.execution_status.error = $Message
    $Result.execution_status.safe_to_sync = $false
    Emit-Result -Result $Result -ExitCode $ExitCode
}

function Convert-ToGitHubSlug {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RemoteUrl
    )

    $url = $RemoteUrl.Trim()
    if ([string]::IsNullOrWhiteSpace($url)) {
        return $null
    }

    if ($url -match '^https?://github\.com/(?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?/?$') {
        return "$($Matches.owner)/$($Matches.repo)".ToLowerInvariant()
    }

    if ($url -match '^git@github\.com:(?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?$') {
        return "$($Matches.owner)/$($Matches.repo)".ToLowerInvariant()
    }

    if ($url -match '^ssh://git@github\.com/(?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?/?$') {
        return "$($Matches.owner)/$($Matches.repo)".ToLowerInvariant()
    }

    return $null
}

function Parse-PrUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    $trimmed = $Url.Trim()
    if ($trimmed -match '^https?://github\.com/(?<owner>[^/]+)/(?<repo>[^/]+)/pull/(?<number>\d+)(?:[/?#].*)?$') {
        return [PSCustomObject]@{
            Owner  = $Matches.owner
            Repo   = $Matches.repo
            Number = [int]$Matches.number
        }
    }

    return $null
}

function Get-BranchDivergence {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LocalRef,
        [Parameter(Mandatory = $true)]
        [string]$RemoteRef
    )

    $res = Invoke-External -Exe git -Args @('rev-list', '--left-right', '--count', "$LocalRef...$RemoteRef")
    if ($res.ExitCode -ne 0) {
        return $null
    }

    $line = ($res.Output | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
    if ($null -eq $line) {
        return $null
    }

    $tokens = ([string]$line).Trim() -split '\s+'
    if ($tokens.Count -ne 2) {
        return $null
    }

    $ahead = 0
    $behind = 0
    if ([int]::TryParse($tokens[0], [ref]$ahead) -and [int]::TryParse($tokens[1], [ref]$behind) -and $ahead -ge 0 -and $behind -ge 0) {
        return [PSCustomObject]@{
            Ahead  = $ahead
            Behind = $behind
        }
    }

    return $null
}

function Test-GitSwitchSupport {
    $listCmds = Invoke-External -Exe git -Args @('--list-cmds=main,others,alias,nohelpers')
    if ($listCmds.ExitCode -eq 0) {
        return [bool](($listCmds.Output -join "`n") -match '(^|\s)switch($|\s)')
    }

    $helpAll = Invoke-External -Exe git -Args @('help', '-a')
    if ($helpAll.ExitCode -eq 0) {
        return [bool](($helpAll.Output -join "`n") -match '(^|\s)switch($|\s)')
    }

    return $false
}

function Switch-LocalBranch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BranchName
    )

    $localBranchExists = Invoke-External -Exe git -Args @('show-ref', '--verify', '--quiet', "refs/heads/$BranchName")
    $hasLocalBranch = ($localBranchExists.ExitCode -eq 0)

    if ($hasLocalBranch) {
        return Invoke-External -Exe git -Args @('switch', $BranchName)
    }
    return Invoke-External -Exe git -Args @('switch', '--track', "origin/$BranchName")
}

function Convert-ToBlockQuote {
    param(
        [Parameter(Mandatory = $false)]
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return '> (No comment text)'
    }

    $normalized = $Text -replace "`r`n", "`n" -replace "`r", "`n"
    $lines = $normalized -split "`n"
    return ($lines | ForEach-Object { "> $_" }) -join "`n"
}

function Convert-ToUtcInfo {
    param(
        [Parameter(Mandatory = $false)]
        $Value
    )

    if ($null -eq $Value) {
        return [PSCustomObject]@{
            IsoUtc      = $null
            Raw         = $null
            ParseFailed = $false
        }
    }

    if ($Value -is [DateTime]) {
        return [PSCustomObject]@{
            IsoUtc      = $Value.ToUniversalTime().ToString('o')
            Raw         = $null
            ParseFailed = $false
        }
    }

    $asString = [string]$Value
    if ([string]::IsNullOrWhiteSpace($asString)) {
        return [PSCustomObject]@{
            IsoUtc      = $null
            Raw         = $null
            ParseFailed = $false
        }
    }

    $dto = [DateTimeOffset]::MinValue
    if ([DateTimeOffset]::TryParse($asString, [ref]$dto)) {
        return [PSCustomObject]@{
            IsoUtc      = $dto.UtcDateTime.ToString('o')
            Raw         = $null
            ParseFailed = $false
        }
    }

    return [PSCustomObject]@{
        IsoUtc      = $null
        Raw         = $asString.Trim()
        ParseFailed = $true
    }
}

function Get-PrMetadata {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [Parameter(Mandatory = $true)]
        [string]$Repo,
        [Parameter(Mandatory = $true)]
        [int]$Number
    )

    $query = @'
query($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      number
      title
      url
      headRefName
    }
  }
}
'@

    $res = Invoke-GhGraphQl -Query $query -Variables @{
        owner  = $Owner
        repo   = $Repo
        number = $Number
    }

    if (-not $res.Success) {
        return [PSCustomObject]@{
            Success = $false
            Error   = $res.Error
            Data    = $null
        }
    }

    $prData = $res.Data.data.repository.pullRequest
    if ($null -eq $prData) {
        return [PSCustomObject]@{
            Success = $false
            Error   = "PR #$Number was not found through GraphQL."
            Data    = $null
        }
    }

    return [PSCustomObject]@{
        Success = $true
        Error   = $null
        Data    = $prData
    }
}

function Get-ReviewThreadsPaginated {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [Parameter(Mandatory = $true)]
        [string]$Repo,
        [Parameter(Mandatory = $true)]
        [int]$Number,
        [Parameter(Mandatory = $true)]
        [int]$PageLimit
    )

    $query = @'
query($owner:String!, $repo:String!, $number:Int!, $after:String) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      reviewThreads(first:100, after:$after) {
        nodes {
          isResolved
          isOutdated
          path
          line
          startLine
          originalLine
          originalStartLine
          comments(first:100) {
            nodes {
              author { login }
              body
              createdAt
              url
            }
            pageInfo {
              hasNextPage
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
'@

    $items = @()
    $warnings = New-Object System.Collections.Generic.List[string]
    $hasNext = $true
    $after = $null
    $page = 0

    while ($hasNext) {
        $page++
        if ($page -gt $PageLimit) {
            $warnings.Add("Review thread pagination hit the MaxPages limit ($PageLimit); output may be partial.")
            break
        }

        $vars = @{
            owner  = $Owner
            repo   = $Repo
            number = $Number
        }
        if (-not [string]::IsNullOrWhiteSpace([string]$after)) {
            $vars.after = $after
        }

        $res = Invoke-GhGraphQl -Query $query -Variables $vars
        if (-not $res.Success) {
            return [PSCustomObject]@{
                Success  = $false
                Error    = $res.Error
                Threads  = @()
                Warnings = @($warnings)
            }
        }

        $connection = $res.Data.data.repository.pullRequest.reviewThreads
        if ($null -eq $connection) {
            return [PSCustomObject]@{
                Success  = $false
                Error    = 'GraphQL response did not contain reviewThreads.'
                Threads  = @()
                Warnings = @($warnings)
            }
        }

        $items += @($connection.nodes)
        $hasNext = [bool]$connection.pageInfo.hasNextPage
        $after = if ($hasNext) { [string]$connection.pageInfo.endCursor } else { $null }

        if ($hasNext -and [string]::IsNullOrWhiteSpace($after)) {
            $warnings.Add('Review thread pagination stopped because endCursor was missing.')
            break
        }
    }

    return [PSCustomObject]@{
        Success  = $true
        Error    = $null
        Threads  = @($items)
        Warnings = @($warnings)
    }
}

function Get-PrCommentsPaginated {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [Parameter(Mandatory = $true)]
        [string]$Repo,
        [Parameter(Mandatory = $true)]
        [int]$Number,
        [Parameter(Mandatory = $true)]
        [int]$PageLimit
    )

    $query = @'
query($owner:String!, $repo:String!, $number:Int!, $after:String) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      comments(first:100, after:$after) {
        nodes {
          author { login }
          body
          createdAt
          url
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
'@

    $items = @()
    $warnings = New-Object System.Collections.Generic.List[string]
    $hasNext = $true
    $after = $null
    $page = 0

    while ($hasNext) {
        $page++
        if ($page -gt $PageLimit) {
            $warnings.Add("PR conversation comment pagination hit the MaxPages limit ($PageLimit); output may be partial.")
            break
        }

        $vars = @{
            owner  = $Owner
            repo   = $Repo
            number = $Number
        }
        if (-not [string]::IsNullOrWhiteSpace([string]$after)) {
            $vars.after = $after
        }

        $res = Invoke-GhGraphQl -Query $query -Variables $vars
        if (-not $res.Success) {
            return [PSCustomObject]@{
                Success  = $false
                Error    = $res.Error
                Comments = @()
                Warnings = @($warnings)
            }
        }

        $connection = $res.Data.data.repository.pullRequest.comments
        if ($null -eq $connection) {
            return [PSCustomObject]@{
                Success  = $false
                Error    = 'GraphQL response did not contain PR conversation comments.'
                Comments = @()
                Warnings = @($warnings)
            }
        }

        $items += @($connection.nodes)
        $hasNext = [bool]$connection.pageInfo.hasNextPage
        $after = if ($hasNext) { [string]$connection.pageInfo.endCursor } else { $null }

        if ($hasNext -and [string]::IsNullOrWhiteSpace($after)) {
            $warnings.Add('PR conversation comment pagination stopped because endCursor was missing.')
            break
        }
    }

    return [PSCustomObject]@{
        Success  = $true
        Error    = $null
        Comments = @($items)
        Warnings = @($warnings)
    }
}

function Convert-ResultToMarkdown {
    param(
        [Parameter(Mandatory = $true)]
        $Result
    )

    $sb = [System.Text.StringBuilder]::new()

    if (-not [string]::IsNullOrWhiteSpace([string]$Result.execution_status.error)) {
        [void]$sb.AppendLine('## Error')
        [void]$sb.AppendLine($Result.execution_status.error)
        [void]$sb.AppendLine()
    }

    [void]$sb.AppendLine('## PR Metadata')
    [void]$sb.AppendLine("- Number: $($Result.pr_metadata.number)")
    [void]$sb.AppendLine("- Title: $($Result.pr_metadata.title)")
    [void]$sb.AppendLine("- URL: $($Result.pr_metadata.url)")
    [void]$sb.AppendLine("- Head Branch: $($Result.pr_metadata.head_branch)")
    [void]$sb.AppendLine("- Retrieved At (UTC): $($Result.pr_metadata.retrieved_at_utc)")
    [void]$sb.AppendLine()

    if ($Result.execution_status.needs_sync) {
        [void]$sb.AppendLine('## Sync Required')
        [void]$sb.AppendLine("- Needs Sync: $($Result.execution_status.needs_sync)")
        [void]$sb.AppendLine("- Reason: $($Result.execution_status.sync_reason)")
        [void]$sb.AppendLine("- Safe To Sync: $($Result.execution_status.safe_to_sync)")
        [void]$sb.AppendLine("- Retrieval Skipped Reason: $($Result.execution_status.retrieval_skipped_reason)")
        [void]$sb.AppendLine('- Note: Comment retrieval was intentionally skipped until branch sync is approved and completed.')
        if ($Result.sync_commands.Count -gt 0) {
            [void]$sb.AppendLine('- Suggested Commands:')
            foreach ($cmd in $Result.sync_commands) {
                [void]$sb.AppendLine(('  - `' + $cmd + '`'))
            }
        }
        return $sb.ToString().TrimEnd()
    }

    [void]$sb.AppendLine('## Unresolved Review Threads')
    $reviewComments = @($Result.unresolved_review_comments)
    if ($reviewComments.Count -eq 0) {
        [void]$sb.AppendLine('No unresolved review-thread comments found.')
    } else {
        $groups = $reviewComments | Group-Object -Property file_path
        foreach ($group in ($groups | Sort-Object Name)) {
            $groupName = if ([string]::IsNullOrWhiteSpace($group.Name)) { '(No File Reference)' } else { $group.Name }
            [void]$sb.AppendLine("### $groupName")
            $idx = 1
            foreach ($entry in ($group.Group | Sort-Object created_at_utc, created_at_raw)) {
                $createdAtText = if (-not [string]::IsNullOrWhiteSpace([string]$entry.created_at_utc)) { [string]$entry.created_at_utc } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.created_at_raw)) { "Unparsed: $($entry.created_at_raw)" } else { '(Not available)' }
                [void]$sb.AppendLine("$idx. Author: $($entry.author)")
                [void]$sb.AppendLine("   File Reference: $($entry.file_reference)")
                [void]$sb.AppendLine("   Outdated: $($entry.is_outdated)")
                [void]$sb.AppendLine("   Created At (UTC): $createdAtText")
                [void]$sb.AppendLine("   Comment URL: $($entry.comment_url)")
                [void]$sb.AppendLine('   Comment Text:')
                [void]$sb.AppendLine((Convert-ToBlockQuote -Text $entry.body))
                [void]$sb.AppendLine()
                $idx++
            }
        }
    }

    [void]$sb.AppendLine('## PR Conversation Comments')
    $conversationComments = @($Result.pr_conversation_comments)
    if ($conversationComments.Count -eq 0) {
        [void]$sb.AppendLine('No PR conversation comments found.')
    } else {
        $idx = 1
        foreach ($entry in ($conversationComments | Sort-Object created_at_utc, created_at_raw)) {
            $createdAtText = if (-not [string]::IsNullOrWhiteSpace([string]$entry.created_at_utc)) { [string]$entry.created_at_utc } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.created_at_raw)) { "Unparsed: $($entry.created_at_raw)" } else { '(Not available)' }
            [void]$sb.AppendLine("$idx. Author: $($entry.author)")
            [void]$sb.AppendLine('   File Reference: No File Reference')
            [void]$sb.AppendLine("   Created At (UTC): $createdAtText")
            [void]$sb.AppendLine("   Comment URL: $($entry.comment_url)")
            [void]$sb.AppendLine('   Comment Text:')
            [void]$sb.AppendLine((Convert-ToBlockQuote -Text $entry.body))
            [void]$sb.AppendLine()
            $idx++
        }
    }

    [void]$sb.AppendLine('## Totals')
    [void]$sb.AppendLine("- Unresolved Thread Count: $($Result.totals.unresolved_thread_count)")
    [void]$sb.AppendLine("- Unresolved Review Comment Count: $($Result.totals.unresolved_review_comment_count)")
    [void]$sb.AppendLine("- PR Conversation Comment Count: $($Result.totals.conversation_comment_count)")

    if (@($Result.warnings).Count -gt 0) {
        [void]$sb.AppendLine()
        [void]$sb.AppendLine('## Warnings')
        foreach ($warning in $Result.warnings) {
            [void]$sb.AppendLine("- $warning")
        }
    }

    return $sb.ToString().TrimEnd()
}

$result = New-Result

if ([string]::IsNullOrWhiteSpace($PrUrl)) {
    Fail-WithResult -Message 'PR URL is required. Ask the user for the GitHub PR URL and run the script again.' -Result $result -ExitCode 1
}

$prInfo = Parse-PrUrl -Url $PrUrl
if ($null -eq $prInfo) {
    Fail-WithResult -Message 'Invalid PR URL. Expected format: https://github.com/<owner>/<repo>/pull/<number>' -Result $result -ExitCode 1
}

$repoSlug = "$($prInfo.Owner)/$($prInfo.Repo)"
$result.pr_metadata.number = $prInfo.Number
$result.pr_metadata.url = $PrUrl

$insideRepo = Invoke-External -Exe git -Args @('rev-parse', '--is-inside-work-tree')
if ($insideRepo.ExitCode -ne 0 -or (($insideRepo.Output -join '').Trim() -ne 'true')) {
    Fail-WithResult -Message 'Current directory is not a git repository.' -Result $result -ExitCode 1
}

$origin = Invoke-External -Exe git -Args @('remote', 'get-url', 'origin')
if ($origin.ExitCode -ne 0) {
    Fail-WithResult -Message 'Missing git remote "origin".' -Result $result -ExitCode 1
}

$originUrl = ($origin.Output -join '').Trim()
$originSlug = Convert-ToGitHubSlug -RemoteUrl $originUrl
if ([string]::IsNullOrWhiteSpace($originSlug)) {
    Fail-WithResult -Message "Unable to parse origin remote URL as a GitHub repository: $originUrl" -Result $result -ExitCode 1
}

if ($originSlug -ne $repoSlug.ToLowerInvariant()) {
    Fail-WithResult -Message "Origin remote ($originSlug) does not match PR repository ($repoSlug)." -Result $result -ExitCode 1
}

$prRefs = Invoke-External -Exe git -Args @('ls-remote', 'origin', "refs/pull/$($prInfo.Number)/*")
if ($prRefs.ExitCode -ne 0 -or $prRefs.Output.Count -eq 0) {
    Fail-WithResult -Message "PR #$($prInfo.Number) was not found or is not accessible through origin." -Result $result -ExitCode 1
}

$prMetaResult = Get-PrMetadata -Owner $prInfo.Owner -Repo $prInfo.Repo -Number $prInfo.Number
if (-not $prMetaResult.Success) {
    Fail-WithResult -Message "Failed to read PR metadata via GraphQL: $($prMetaResult.Error)" -Result $result -ExitCode 1
}

$prMeta = $prMetaResult.Data
$headBranch = [string]$prMeta.headRefName
$result.pr_metadata.number = [int]$prMeta.number
$result.pr_metadata.title = [string]$prMeta.title
$result.pr_metadata.url = [string]$prMeta.url
$result.pr_metadata.head_branch = $headBranch
$result.pr_metadata.retrieved_at_utc = [DateTime]::UtcNow.ToString('o')

$fetch = Invoke-External -Exe git -Args @('fetch', 'origin', '--prune')
if ($fetch.ExitCode -ne 0) {
    Fail-WithResult -Message "Failed to fetch origin: $($fetch.Output -join ' ')" -Result $result -ExitCode 1
}

$currentBranchRes = Invoke-External -Exe git -Args @('branch', '--show-current')
if ($currentBranchRes.ExitCode -ne 0) {
    Fail-WithResult -Message 'Failed to read current branch.' -Result $result -ExitCode 1
}
$currentBranch = ($currentBranchRes.Output -join '').Trim()

$gitSwitchSupported = Test-GitSwitchSupport
if (-not $gitSwitchSupported) {
    Fail-WithResult -Message 'This skill requires Git with `git switch` support.' -Result $result -ExitCode 1
}
$switchCommandHint = "git switch $headBranch"

$syncReasons = New-Object System.Collections.Generic.List[string]
$syncCommands = New-Object System.Collections.Generic.List[string]

if ($currentBranch -ne $headBranch) {
    $syncReasons.Add("Current branch '$currentBranch' does not match PR head branch '$headBranch'.")
    $syncCommands.Add('git fetch origin --prune')
    $syncCommands.Add($switchCommandHint)
    $syncCommands.Add("git pull --ff-only origin $headBranch")
}

$remoteBranchExists = Invoke-External -Exe git -Args @('rev-parse', '--verify', "refs/remotes/origin/$headBranch")
if ($remoteBranchExists.ExitCode -ne 0) {
    Fail-WithResult -Message "Remote branch 'origin/$headBranch' was not found." -Result $result -ExitCode 1
}

if ($currentBranch -eq $headBranch) {
    $divergence = Get-BranchDivergence -LocalRef $headBranch -RemoteRef "origin/$headBranch"
    if ($null -eq $divergence) {
        Fail-WithResult -Message 'Failed to determine branch divergence against origin.' -Result $result -ExitCode 1
    }

    if ($divergence.Behind -gt 0) {
        $syncReasons.Add("Local branch '$headBranch' is behind origin/$headBranch by $($divergence.Behind) commit(s).")
        $syncCommands.Add('git fetch origin --prune')
        $syncCommands.Add("git pull --ff-only origin $headBranch")
    }

    if ($divergence.Ahead -gt 0) {
        $result.warnings += "Local branch '$headBranch' is ahead of origin/$headBranch by $($divergence.Ahead) commit(s)."
    }
}

$needsSync = $syncReasons.Count -gt 0

if ($needsSync -and -not $AllowBranchSync.IsPresent) {
    $safeToSync = $true
    if ($RequireCleanTreeForSync) {
        $statusRes = Invoke-External -Exe git -Args @('status', '--porcelain')
        if ($statusRes.ExitCode -ne 0) {
            Fail-WithResult -Message 'Failed to inspect working tree status.' -Result $result -ExitCode 1
        }

        if ($statusRes.Output.Count -gt 0) {
            $safeToSync = $false
            $syncReasons.Add('Working tree is not clean, so branch sync is unsafe.')
        }
    }

    $result.execution_status.needs_sync = $true
    $result.execution_status.sync_reason = ($syncReasons -join ' ')
    $result.execution_status.safe_to_sync = $safeToSync
    $result.execution_status.retrieval_skipped_reason = 'branch_sync_required'
    $result.sync_commands = @($syncCommands | Select-Object -Unique)
    Emit-Result -Result $result -ExitCode 3
}

if ($needsSync -and $AllowBranchSync.IsPresent) {
    if ($RequireCleanTreeForSync) {
        $statusRes = Invoke-External -Exe git -Args @('status', '--porcelain')
        if ($statusRes.ExitCode -ne 0) {
            Fail-WithResult -Message 'Failed to inspect working tree status.' -Result $result -ExitCode 1
        }

        if ($statusRes.Output.Count -gt 0) {
            Fail-WithResult -Message 'Branch sync was requested, but the working tree is not clean. Abort to avoid unsafe switching/pulling.' -Result $result -ExitCode 1
        }
    }

    $fetchAgain = Invoke-External -Exe git -Args @('fetch', 'origin', '--prune')
    if ($fetchAgain.ExitCode -ne 0) {
        Fail-WithResult -Message "Failed to fetch origin during branch sync: $($fetchAgain.Output -join ' ')" -Result $result -ExitCode 1
    }

    if ($currentBranch -ne $headBranch) {
        $switchRes = Switch-LocalBranch -BranchName $headBranch
        if ($switchRes.ExitCode -ne 0) {
            Fail-WithResult -Message "Failed to switch to PR head branch '$headBranch': $($switchRes.Output -join ' ')" -Result $result -ExitCode 1
        }
    }

    $divergenceAfterSwitch = Get-BranchDivergence -LocalRef $headBranch -RemoteRef "origin/$headBranch"
    if ($null -eq $divergenceAfterSwitch) {
        Fail-WithResult -Message 'Failed to determine branch divergence after switching branches.' -Result $result -ExitCode 1
    }

    if ($divergenceAfterSwitch.Behind -gt 0) {
        $pullRes = Invoke-External -Exe git -Args @('pull', '--ff-only', 'origin', $headBranch)
        if ($pullRes.ExitCode -ne 0) {
            Fail-WithResult -Message "Failed to pull latest commits with --ff-only: $($pullRes.Output -join ' ')" -Result $result -ExitCode 1
        }
    }

    $finalDivergence = Get-BranchDivergence -LocalRef $headBranch -RemoteRef "origin/$headBranch"
    if ($null -eq $finalDivergence) {
        Fail-WithResult -Message 'Failed to verify final branch divergence.' -Result $result -ExitCode 1
    }

    if ($finalDivergence.Behind -gt 0) {
        Fail-WithResult -Message "Local branch '$headBranch' is still behind origin/$headBranch after sync." -Result $result -ExitCode 1
    }

    $result.execution_status.needs_sync = $false
    $result.execution_status.sync_reason = $null
    $result.execution_status.safe_to_sync = $true
    $result.execution_status.retrieval_skipped_reason = $null
}

$reviewThreadResult = Get-ReviewThreadsPaginated -Owner $prInfo.Owner -Repo $prInfo.Repo -Number $prInfo.Number -PageLimit $MaxPages
if (-not $reviewThreadResult.Success) {
    Fail-WithResult -Message "Failed to fetch review threads: $($reviewThreadResult.Error)" -Result $result -ExitCode 1
}

$result.warnings += @($reviewThreadResult.Warnings)
$threads = @($reviewThreadResult.Threads | Where-Object { -not $_.isResolved })
$result.totals.unresolved_thread_count = $threads.Count

$reviewRecords = @()
$threadCommentCount = 0
$threadIndex = 0
$threadCommentPageTruncatedCount = 0
$timestampParseWarningCount = 0

foreach ($thread in $threads) {
    $threadIndex++

    if ([bool]$thread.comments.pageInfo.hasNextPage) {
        $threadCommentPageTruncatedCount++
    }

    $path = $null
    if (-not [string]::IsNullOrWhiteSpace([string]$thread.path)) {
        $path = [string]$thread.path
    }

    $currentStart = $null
    if ($null -ne $thread.startLine) {
        $currentStart = [int]$thread.startLine
    }
    $currentEnd = $null
    if ($null -ne $thread.line) {
        $currentEnd = [int]$thread.line
    }
    $originalStart = $null
    if ($null -ne $thread.originalStartLine) {
        $originalStart = [int]$thread.originalStartLine
    }
    $originalEnd = $null
    if ($null -ne $thread.originalLine) {
        $originalEnd = [int]$thread.originalLine
    }

    $line = if ($null -ne $currentEnd) { $currentEnd } elseif ($null -ne $originalEnd) { $originalEnd } else { $null }

    $fileReference = $null
    if (-not [string]::IsNullOrWhiteSpace($path)) {
        if ($null -ne $currentStart -and $null -ne $currentEnd) {
            if ($currentStart -ne $currentEnd) {
                $fileReference = "${path}:$currentStart-$currentEnd"
            } else {
                $fileReference = "${path}:$currentEnd"
            }
        } elseif ($null -ne $originalStart -and $null -ne $originalEnd) {
            if ($originalStart -ne $originalEnd) {
                $fileReference = "${path}:$originalStart-$originalEnd"
            } else {
                $fileReference = "${path}:$originalEnd"
            }
        } elseif ($null -ne $currentEnd) {
            $fileReference = "${path}:$currentEnd"
        } elseif ($null -ne $originalEnd) {
            $fileReference = "${path}:$originalEnd"
        } elseif ($null -ne $originalStart) {
            $fileReference = "${path}:$originalStart"
        } else {
            $fileReference = $path
        }
    } else {
        $fileReference = 'No File Reference'
    }

    foreach ($comment in @($thread.comments.nodes)) {
        $threadCommentCount++
        $timestamp = Convert-ToUtcInfo -Value $comment.createdAt
        if ($timestamp.ParseFailed) {
            $timestampParseWarningCount++
        }

        $reviewRecords += [PSCustomObject]@{
            comment_type    = 'unresolved_review_thread'
            thread_index    = $threadIndex
            author          = [string]$comment.author.login
            file_path       = $path
            line            = $line
            file_reference  = $fileReference
            is_outdated     = [bool]$thread.isOutdated
            created_at_utc  = $timestamp.IsoUtc
            created_at_raw  = $timestamp.Raw
            comment_url     = [string]$comment.url
            body            = [string]$comment.body
        }
    }
}

$result.unresolved_review_comments = @($reviewRecords)
$result.totals.unresolved_review_comment_count = $threadCommentCount

$conversationRecords = @()
if ($IncludeConversationComments) {
    $conversationResult = Get-PrCommentsPaginated -Owner $prInfo.Owner -Repo $prInfo.Repo -Number $prInfo.Number -PageLimit $MaxPages
    if (-not $conversationResult.Success) {
        Fail-WithResult -Message "Failed to fetch PR conversation comments: $($conversationResult.Error)" -Result $result -ExitCode 1
    }

    $result.warnings += @($conversationResult.Warnings)

    foreach ($comment in @($conversationResult.Comments)) {
        $timestamp = Convert-ToUtcInfo -Value $comment.createdAt
        if ($timestamp.ParseFailed) {
            $timestampParseWarningCount++
        }

        $conversationRecords += [PSCustomObject]@{
            comment_type    = 'pr_conversation'
            author          = [string]$comment.author.login
            file_path       = $null
            line            = $null
            created_at_utc  = $timestamp.IsoUtc
            created_at_raw  = $timestamp.Raw
            comment_url     = [string]$comment.url
            body            = [string]$comment.body
        }
    }
}

$result.pr_conversation_comments = @($conversationRecords)
$result.totals.conversation_comment_count = $conversationRecords.Count

if ($threadCommentPageTruncatedCount -gt 0) {
    $result.warnings += "$threadCommentPageTruncatedCount unresolved review thread(s) have more than 100 comments; only the first 100 comments were included per thread."
}

if ($timestampParseWarningCount -gt 0) {
    $result.warnings += "$timestampParseWarningCount comment timestamp value(s) could not be parsed into UTC ISO format; created_at_utc was set to null and created_at_raw was populated."
}

Emit-Result -Result $result -ExitCode 0
