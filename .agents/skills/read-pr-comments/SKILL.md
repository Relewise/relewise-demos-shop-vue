---
name: read-pr-comments
description: Read pull request comments and review feedback from a GitHub PR URL and present unresolved feedback as structured Markdown for planning in relewise-demos-shop-vue. Use when asked to read comments from a PR, summarize review threads, or prepare a response plan for PR feedback.
---

# Read PR Comments

## Goal
Read unresolved PR review feedback and PR conversation comments, then return a structured Markdown report for planning in this repository. This skill is read-only analysis support and must not apply code changes.

## Required Input
Require a GitHub PR URL.

If the initial prompt does not include a PR URL, ask for it before running commands.

## Core Command
Run the bundled script from repository root:

```powershell
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL>"
```

Optional pagination cap:

```powershell
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL>" -MaxPages 50
```

## Branch Safety Rules
The script enforces:
1. PR access validation through `git`.
2. Local branch must match PR head branch.
3. Local branch must be up to date with `origin/<head-branch>`.

If branch mismatch or local branch is behind:
1. Ask user permission before syncing branch.
2. Re-run with:

```powershell
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL>" -AllowBranchSync
```

If syncing is unsafe, for example a dirty worktree and sync is needed, explain and abort.

This skill requires a Git version that supports `git switch`.

When sync is required and not approved, retrieval is intentionally skipped and the output includes `retrieval_skipped_reason: branch_sync_required`.

## Output Contract
Default output is structured Markdown with these sections:
1. `PR Metadata`
2. `Unresolved Review Threads` grouped by file
3. `PR Conversation Comments`
4. `Totals`
5. `Warnings` only when relevant

Each comment entry includes:
1. Author
2. File Reference when available
3. Outdated flag for review-thread comments
4. Created At in UTC
5. Comment URL
6. Comment text

Pagination behavior:
1. Review threads and PR conversation comments are fetched with cursor pagination.
2. `-MaxPages` limits pagination loops and emits warnings if the cap is reached.
3. Per-thread comments are fetched up to 100 comments per thread, with a warning when truncated.

## JSON Mode
For machine-readable output:

```powershell
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL>" -OutputFormat json
```

## Script Validation Commands
Use these commands to verify script behavior during skill maintenance:

```powershell
# Missing URL must fail with a clear prompt for PR URL
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1

# Happy path
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL>"

# Sync needed, no sync permission
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL_WITH_DIFFERENT_HEAD_BRANCH>"

# Sync requested but unsafe dirty worktree
pwsh .agents/skills/read-pr-comments/scripts/read_pr_comments.ps1 -PrUrl "<PR_URL_WITH_DIFFERENT_HEAD_BRANCH>" -AllowBranchSync
```

## Record Shapes
`ReviewCommentRecord`
1. `comment_type: unresolved_review_thread`
2. `author`
3. `file_path` nullable
4. `line` nullable
5. `is_outdated`
6. `created_at_utc`
7. `created_at_raw` nullable, set when timestamp parsing fails
8. `comment_url`
9. `body`

`PrConversationRecord`
1. `comment_type: pr_conversation`
2. `author`
3. `file_path: null`
4. `line: null`
5. `created_at_utc`
6. `created_at_raw` nullable, set when timestamp parsing fails
7. `comment_url`
8. `body`

`ExecutionStatus`
1. `needs_sync`
2. `sync_reason`
3. `safe_to_sync`
4. `retrieval_skipped_reason`
5. `error`

## Notes
1. This skill reads data and structures it for planning.
2. This skill does not resolve comments, edit files, or push commits.
