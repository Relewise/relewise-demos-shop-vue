import { formatCompanyDetails, formatUserDetails } from '@/helpers/contextSummary';
import { normalizeDatasetConfiguration, sanitizeCompanies, uniqueNormalizedStrings } from '@/helpers/datasetConfiguration';
import { datasetFeatureFields, type DatasetBooleanKey } from '@/helpers/datasetFeatures';
import { displayUser } from '@/helpers/userHelper';
import { sanitizeUser, sanitizeUsers } from '@/helpers/userContext';
import type { IDataset } from '@/stores/context.store';
import type { Company, DataValue, User } from '@relewise/client';

type SharedDatasetFeatureState = Partial<Pick<IDataset, DatasetBooleanKey | 'trackingEnabled'>>;
type SharedDatasetFeatureKey = DatasetBooleanKey | 'trackingEnabled';

export type SharedDataset = SharedDatasetFeatureState & {
    datasetId: string;
    apiKey: string;
    displayName?: string | null;
    language?: string | null;
    allLanguages?: string[];
    currencyCode?: string | null;
    allCurrencies?: string[];
    serverUrl?: string | null;
    users?: User[];
    companies?: Company[];
    selectedUserIndex?: number;
    selectedCompanyId?: string | null;
};

export type SharedDatasetCoreFieldChange = {
    key: 'displayName' | 'apiKey' | 'serverUrl';
    label: string;
    currentValue: string;
    nextValue: string;
};

export type SharedDatasetFeatureChange = {
    key: SharedDatasetFeatureKey;
    label: string;
    description: string;
    currentValue: boolean;
    nextValue: boolean;
};

export type SharedDatasetUserAddition = {
    comparableKey: string;
    label: string;
    details: string;
};

export type SharedDatasetUserConflict = {
    conflictKey: string;
    label: string;
    localComparableKey: string;
    sharedComparableKey: string;
    currentDetails: string;
    nextDetails: string;
};

export type SharedDatasetCompanyAddition = {
    companyId: string;
    details: string;
};

export type SharedDatasetCompanyConflict = {
    companyId: string;
    currentDetails: string;
    nextDetails: string;
};

export type SharedDatasetUserChanges = {
    incomingCount: number;
    matchedCount: number;
    additions: SharedDatasetUserAddition[];
    conflicts: SharedDatasetUserConflict[];
};

export type SharedDatasetCompanyChanges = {
    incomingCount: number;
    matchedCount: number;
    additions: SharedDatasetCompanyAddition[];
    conflicts: SharedDatasetCompanyConflict[];
};

export type SharedDatasetSelectionSummary = {
    selectedUserLabel: string;
    selectedCompanyLabel: string;
    hasSelection: boolean;
};

export type SharedDatasetDiff = {
    coreFieldChanges: SharedDatasetCoreFieldChange[];
    featureChanges: SharedDatasetFeatureChange[];
    userChanges: SharedDatasetUserChanges;
    companyChanges: SharedDatasetCompanyChanges;
    sharedSelection: SharedDatasetSelectionSummary;
    hasChanges: boolean;
    requiresReview: boolean;
};

export type SharedDatasetImportDecision = {
    coreFields: 'incoming' | 'local';
    features: 'replace' | 'merge' | 'local';
    users: 'shared' | 'local';
    companies: 'shared' | 'local';
};

const trackingFeatureDefinition = {
    key: 'trackingEnabled' as const,
    label: 'Tracking',
    description: 'Enable tracking for this dataset.',
};

export function parseSharedDataset(value: unknown): SharedDataset | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const entry = value as Record<string, unknown>;
    const datasetId = normalizeRequiredString(entry.datasetId);
    const apiKey = normalizeRequiredString(entry.apiKey);
    if (!datasetId || !apiKey) {
        return null;
    }

    const users = normalizeOptionalUsers(entry.users);

    return {
        datasetId,
        apiKey,
        displayName: normalizeOptionalString(entry.displayName),
        language: normalizeOptionalString(entry.language),
        allLanguages: normalizeOptionalStringArray(entry.allLanguages),
        currencyCode: normalizeOptionalCurrency(entry.currencyCode),
        allCurrencies: normalizeOptionalCurrencyArray(entry.allCurrencies),
        serverUrl: normalizeOptionalString(entry.serverUrl),
        users,
        companies: normalizeOptionalCompanies(entry.companies),
        trackingEnabled: normalizeOptionalBoolean(entry.trackingEnabled),
        ...parseSharedFeatureFlags(entry),
        selectedUserIndex: normalizeOptionalUserIndex(entry.selectedUserIndex, users),
        selectedCompanyId: normalizeOptionalString(entry.selectedCompanyId),
    };
}

export function buildSharedDataset(dataset: IDataset, {
    language,
    currencyCode,
    selectedUserIndex,
    selectedCompanyId,
}: {
    language?: string;
    currencyCode?: string;
    selectedUserIndex?: number;
    selectedCompanyId?: string;
} = {}): SharedDataset {
    return {
        datasetId: dataset.datasetId.trim(),
        apiKey: dataset.apiKey.trim(),
        displayName: normalizeOptionalString(dataset.displayName),
        language: normalizeOptionalString(language),
        allLanguages: uniqueNormalizedStrings(dataset.allLanguages ?? []),
        currencyCode: normalizeOptionalCurrency(currencyCode),
        allCurrencies: uniqueNormalizedStrings(dataset.allCurrencies ?? [], { uppercase: true }),
        serverUrl: normalizeOptionalString(dataset.serverUrl),
        users: sanitizeUsers(dataset.users),
        companies: sanitizeCompanies(dataset.companies),
        trackingEnabled: dataset.trackingEnabled ?? false,
        ...buildSharedFeatureFlags(dataset),
        selectedUserIndex: normalizeOptionalUserIndex(selectedUserIndex, dataset.users),
        selectedCompanyId: normalizeOptionalString(selectedCompanyId),
    };
}

export function createDatasetFromSharedDataset(sharedDataset: SharedDataset): IDataset {
    return normalizeDatasetConfiguration({
        datasetId: sharedDataset.datasetId,
        apiKey: sharedDataset.apiKey,
        displayName: sharedDataset.displayName,
        language: sharedDataset.language ?? undefined,
        allLanguages: sharedDataset.allLanguages ?? [],
        currencyCode: sharedDataset.currencyCode ?? undefined,
        allCurrencies: sharedDataset.allCurrencies ?? [],
        serverUrl: sharedDataset.serverUrl ?? undefined,
        users: sharedDataset.users,
        companies: sharedDataset.companies,
        trackingEnabled: sharedDataset.trackingEnabled,
        ...pickSharedFeatureFlags(sharedDataset),
    });
}

export function getDefaultSharedDatasetImportDecision(): SharedDatasetImportDecision {
    return {
        coreFields: 'incoming',
        features: 'replace',
        users: 'shared',
        companies: 'shared',
    };
}

export function getSharedDatasetDiff(existingDataset: IDataset, sharedDataset: SharedDataset): SharedDatasetDiff {
    const coreFieldChanges = getSharedDatasetCoreFieldChanges(existingDataset, sharedDataset);
    const featureChanges = getSharedDatasetFeatureChanges(existingDataset, sharedDataset);
    const userChanges = getSharedDatasetUserChanges(existingDataset, sharedDataset);
    const companyChanges = getSharedDatasetCompanyChanges(existingDataset, sharedDataset);
    const sharedSelection = getSharedDatasetSelectionSummary(sharedDataset);

    return {
        coreFieldChanges,
        featureChanges,
        userChanges,
        companyChanges,
        sharedSelection,
        hasChanges: coreFieldChanges.length > 0
            || featureChanges.length > 0
            || userChanges.additions.length > 0
            || userChanges.conflicts.length > 0
            || companyChanges.additions.length > 0
            || companyChanges.conflicts.length > 0,
        requiresReview: coreFieldChanges.length > 0
            || featureChanges.length > 0
            || userChanges.conflicts.length > 0
            || companyChanges.conflicts.length > 0,
    };
}

export function applySharedDatasetImportDecision(dataset: IDataset, sharedDataset: SharedDataset, decision: SharedDatasetImportDecision) {
    if (decision.coreFields === 'incoming') {
        dataset.displayName = sharedDataset.displayName ?? undefined;
        dataset.apiKey = sharedDataset.apiKey;
        dataset.serverUrl = sharedDataset.serverUrl ?? undefined;
    }

    mergeSharedDatasetLocalesIntoExistingDataset(dataset, sharedDataset);
    applySharedDatasetFeatureDecision(dataset, sharedDataset, decision.features);
    applySharedDatasetUsers(dataset, sharedDataset, decision.users);
    applySharedDatasetCompanies(dataset, sharedDataset, decision.companies);

    return dataset;
}

export function mergeSharedDatasetLocalesIntoExistingDataset(dataset: IDataset, sharedDataset: SharedDataset) {
    const nextLanguage = normalizeOptionalString(sharedDataset.language);
    const nextCurrency = normalizeOptionalCurrency(sharedDataset.currencyCode);

    if (nextLanguage) {
        dataset.allLanguages = uniqueNormalizedStrings([...(dataset.allLanguages ?? []), nextLanguage]);
    }

    if (nextCurrency) {
        dataset.allCurrencies = uniqueNormalizedStrings([...(dataset.allCurrencies ?? []), nextCurrency], { uppercase: true });
    }

    return {
        language: nextLanguage ?? undefined,
        currencyCode: nextCurrency ?? undefined,
    };
}

export function resolveSharedDatasetSessionSelections(dataset: IDataset, sharedDataset: SharedDataset) {
    const resolvedSelectedCompanyId = normalizeOptionalString(sharedDataset.selectedCompanyId);
    const selectedCompanyId = resolvedSelectedCompanyId && (dataset.companies ?? []).some((company) => company.id === resolvedSelectedCompanyId)
        ? resolvedSelectedCompanyId
        : undefined;

    const sharedUsers = sanitizeUsers(sharedDataset.users);
    const selectedSharedUserIndex = normalizeOptionalUserIndex(sharedDataset.selectedUserIndex, sharedUsers);
    if (selectedSharedUserIndex === undefined) {
        return {
            selectedUserIndex: undefined,
            selectedCompanyId,
        };
    }

    const selectedSharedUserKey = createComparableUserKey(sharedUsers[selectedSharedUserIndex]!);
    const resolvedSelectedUserIndex = (dataset.users ?? [])
        .findIndex((user) => createComparableUserKey(user) === selectedSharedUserKey);

    return {
        selectedUserIndex: resolvedSelectedUserIndex >= 0 ? resolvedSelectedUserIndex : undefined,
        selectedCompanyId,
    };
}

export function getSharedDatasetCoreFieldChanges(dataset: IDataset, sharedDataset: SharedDataset) {
    const changes: SharedDatasetCoreFieldChange[] = [];

    const currentDisplayName = normalizeOptionalString(dataset.displayName) ?? '';
    const nextDisplayName = sharedDataset.displayName ?? '';
    if (currentDisplayName !== nextDisplayName) {
        changes.push({
            key: 'displayName',
            label: 'Name',
            currentValue: currentDisplayName,
            nextValue: nextDisplayName,
        });
    }

    const currentApiKey = dataset.apiKey.trim();
    if (currentApiKey !== sharedDataset.apiKey) {
        changes.push({
            key: 'apiKey',
            label: 'API Key',
            currentValue: currentApiKey,
            nextValue: sharedDataset.apiKey,
        });
    }

    const currentServerUrl = normalizeOptionalString(dataset.serverUrl) ?? '';
    const nextServerUrl = sharedDataset.serverUrl ?? '';
    if (currentServerUrl !== nextServerUrl) {
        changes.push({
            key: 'serverUrl',
            label: 'Server URL',
            currentValue: currentServerUrl,
            nextValue: nextServerUrl,
        });
    }

    return changes;
}

function getSharedDatasetFeatureChanges(dataset: IDataset, sharedDataset: SharedDataset) {
    return getSharedFeatureDefinitions()
        .map((feature) => ({
            key: feature.key,
            label: feature.label,
            description: feature.description,
            currentValue: Boolean(dataset[feature.key]),
            nextValue: sharedDataset[feature.key],
        }))
        .filter((feature): feature is SharedDatasetFeatureChange => typeof feature.nextValue === 'boolean' && feature.currentValue !== feature.nextValue)
        .map((feature) => ({
            key: feature.key,
            label: feature.label,
            description: feature.description,
            currentValue: feature.currentValue,
            nextValue: feature.nextValue,
        }));
}

function getSharedDatasetUserChanges(dataset: IDataset, sharedDataset: SharedDataset): SharedDatasetUserChanges {
    const existingUsers = dataset.users ?? [];
    const knownUsers = new Set(existingUsers.map(createComparableUserKey));
    const existingUsersByConflictKey = buildExistingUsersByConflictKey(existingUsers);
    const additions: SharedDatasetUserAddition[] = [];
    const conflicts: SharedDatasetUserConflict[] = [];
    let matchedCount = 0;
    const seenComparableKeys = new Set<string>();
    const seenConflictKeys = new Set<string>();

    for (const sharedUser of sanitizeUsers(sharedDataset.users)) {
        const comparableKey = createComparableUserKey(sharedUser);
        if (seenComparableKeys.has(comparableKey)) {
            continue;
        }

        seenComparableKeys.add(comparableKey);
        if (knownUsers.has(comparableKey)) {
            matchedCount += 1;
            continue;
        }

        const conflictKey = getFirstUserConflictKey(sharedUser, existingUsersByConflictKey);
        if (conflictKey) {
            const conflictingLocalUser = existingUsersByConflictKey.get(conflictKey)!;
            if (!seenConflictKeys.has(conflictKey)) {
                conflicts.push({
                    conflictKey,
                    label: displayUser(sharedUser) || 'Anonymous user',
                    localComparableKey: createComparableUserKey(conflictingLocalUser),
                    sharedComparableKey: comparableKey,
                    currentDetails: formatUserDetails(conflictingLocalUser),
                    nextDetails: formatUserDetails(sharedUser),
                });
                seenConflictKeys.add(conflictKey);
            }
            continue;
        }

        knownUsers.add(comparableKey);
        additions.push({
            comparableKey,
            label: displayUser(sharedUser) || 'Anonymous user',
            details: formatUserDetails(sharedUser),
        });
    }

    return {
        incomingCount: sharedDataset.users?.length ?? 0,
        matchedCount,
        additions,
        conflicts,
    };
}

function getSharedDatasetCompanyChanges(dataset: IDataset, sharedDataset: SharedDataset): SharedDatasetCompanyChanges {
    const existingCompanies = new Map((dataset.companies ?? []).map((company) => [company.id, company] as const));
    const additions: SharedDatasetCompanyAddition[] = [];
    const conflicts: SharedDatasetCompanyConflict[] = [];
    let matchedCount = 0;
    const seenCompanyIds = new Set<string>();

    for (const sharedCompany of sanitizeCompanies(sharedDataset.companies)) {
        if (!sharedCompany.id || seenCompanyIds.has(sharedCompany.id)) {
            continue;
        }

        seenCompanyIds.add(sharedCompany.id);
        const existingCompany = existingCompanies.get(sharedCompany.id);
        if (!existingCompany) {
            additions.push({
                companyId: sharedCompany.id,
                details: formatCompanyDetails(sharedCompany),
            });
            continue;
        }

        if (createComparableCompanyKey(existingCompany) === createComparableCompanyKey(sharedCompany)) {
            matchedCount += 1;
            continue;
        }

        conflicts.push({
            companyId: sharedCompany.id,
            currentDetails: formatCompanyDetails(existingCompany),
            nextDetails: formatCompanyDetails(sharedCompany),
        });
    }

    return {
        incomingCount: sharedDataset.companies?.length ?? 0,
        matchedCount,
        additions,
        conflicts,
    };
}

function getSharedDatasetSelectionSummary(sharedDataset: SharedDataset): SharedDatasetSelectionSummary {
    const sharedUsers = sanitizeUsers(sharedDataset.users);
    const selectedSharedUserIndex = normalizeOptionalUserIndex(sharedDataset.selectedUserIndex, sharedUsers);
    const selectedUser = selectedSharedUserIndex === undefined ? undefined : sharedUsers[selectedSharedUserIndex];
    const selectedUserLabel = selectedUser ? displayUser(selectedUser) || 'Anonymous user' : '(None)';
    const selectedCompanyLabel = normalizeOptionalString(sharedDataset.selectedCompanyId) ?? '(None)';

    return {
        selectedUserLabel,
        selectedCompanyLabel,
        hasSelection: selectedUserLabel !== '(None)' || selectedCompanyLabel !== '(None)',
    };
}

function applySharedDatasetFeatureDecision(
    dataset: IDataset,
    sharedDataset: SharedDataset,
    decision: SharedDatasetImportDecision['features'],
) {
    if (decision === 'local') {
        return;
    }

    for (const feature of getSharedFeatureDefinitions()) {
        const nextValue = sharedDataset[feature.key];
        if (typeof nextValue !== 'boolean') {
            continue;
        }

        if (decision === 'replace') {
            dataset[feature.key] = nextValue;
            continue;
        }

        if (nextValue) {
            dataset[feature.key] = true;
        }
    }
}

function applySharedDatasetUsers(dataset: IDataset, sharedDataset: SharedDataset, decision: SharedDatasetImportDecision['users']) {
    const nextUsers = [...(dataset.users ?? [])];

    for (const sharedUser of sanitizeUsers(sharedDataset.users)) {
        const sharedComparableKey = createComparableUserKey(sharedUser);
        const existingMatchIndex = nextUsers.findIndex((existingUser) => createComparableUserKey(existingUser) === sharedComparableKey);
        if (existingMatchIndex >= 0) {
            continue;
        }

        const conflictIndex = nextUsers.findIndex((existingUser) => userConflictExists(sharedUser, existingUser));
        if (conflictIndex >= 0) {
            if (decision === 'shared') {
                nextUsers[conflictIndex] = sharedUser;
            }
            continue;
        }

        nextUsers.push(sharedUser);
    }

    dataset.users = nextUsers;
}

function applySharedDatasetCompanies(dataset: IDataset, sharedDataset: SharedDataset, decision: SharedDatasetImportDecision['companies']) {
    const nextCompanies = [...(dataset.companies ?? [])];

    for (const sharedCompany of sanitizeCompanies(sharedDataset.companies)) {
        if (!sharedCompany.id) {
            continue;
        }

        const existingCompanyIndex = nextCompanies.findIndex((existingCompany) => existingCompany.id === sharedCompany.id);
        if (existingCompanyIndex < 0) {
            nextCompanies.push(sharedCompany);
            continue;
        }

        if (createComparableCompanyKey(nextCompanies[existingCompanyIndex]!) === createComparableCompanyKey(sharedCompany)) {
            continue;
        }

        if (decision === 'shared') {
            nextCompanies[existingCompanyIndex] = sharedCompany;
        }
    }

    dataset.companies = nextCompanies;
}

function getSharedFeatureDefinitions() {
    return [trackingFeatureDefinition, ...datasetFeatureFields];
}

function buildSharedFeatureFlags(dataset: IDataset) {
    return datasetFeatureFields.reduce((sharedFeatureState, feature) => {
        sharedFeatureState[feature.key] = dataset[feature.key] ?? false;
        return sharedFeatureState;
    }, {} as Partial<Record<DatasetBooleanKey, boolean>>);
}

function parseSharedFeatureFlags(entry: Record<string, unknown>) {
    return datasetFeatureFields.reduce((sharedFeatureState, feature) => {
        const value = normalizeOptionalBoolean(entry[feature.key]);
        if (value !== undefined) {
            sharedFeatureState[feature.key] = value;
        }

        return sharedFeatureState;
    }, {} as Partial<Record<DatasetBooleanKey, boolean>>);
}

function pickSharedFeatureFlags(sharedDataset: SharedDataset) {
    return datasetFeatureFields.reduce((featureState, feature) => {
        featureState[feature.key] = sharedDataset[feature.key];
        return featureState;
    }, {} as Partial<Record<DatasetBooleanKey, boolean | undefined>>);
}

function normalizeRequiredString(value: unknown) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
}

function normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

function normalizeOptionalCurrency(value: unknown) {
    const normalizedValue = normalizeOptionalString(value);
    return normalizedValue ? normalizedValue.toUpperCase() : null;
}

function normalizeOptionalStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return uniqueNormalizedStrings(value.filter((entry): entry is string => typeof entry === 'string'));
}

function normalizeOptionalCurrencyArray(value: unknown) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return uniqueNormalizedStrings(value.filter((entry): entry is string => typeof entry === 'string'), { uppercase: true });
}

function normalizeOptionalUsers(value: unknown) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return sanitizeUsers(value.filter(isUserLike));
}

function normalizeOptionalCompanies(value: unknown) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return sanitizeCompanies(value.filter(isCompanyLike));
}

function normalizeOptionalBoolean(value: unknown) {
    return typeof value === 'boolean' ? value : undefined;
}

function normalizeOptionalUserIndex(value: unknown, users?: User[]) {
    if (!Number.isInteger(value) || Number(value) < 0) {
        return undefined;
    }

    const selectedUserIndex = Number(value);
    if (!users || selectedUserIndex < users.length) {
        return selectedUserIndex;
    }

    return undefined;
}

function createComparableUserKey(user: User) {
    const comparableUser = sanitizeUser(user);

    return JSON.stringify({
        authenticatedId: normalizeOptionalString(comparableUser.authenticatedId),
        email: normalizeOptionalString(comparableUser.email)?.toLowerCase() ?? null,
        temporaryId: normalizeOptionalString(comparableUser.temporaryId),
        classifications: normalizeComparableStringRecord(comparableUser.classifications),
        identifiers: normalizeComparableStringRecord(comparableUser.identifiers),
        data: normalizeComparableDataRecord(comparableUser.data),
    });
}

function buildExistingUsersByConflictKey(users: User[]) {
    const usersByConflictKey = new Map<string, User>();

    for (const user of users) {
        for (const conflictKey of getUserConflictKeys(user)) {
            if (!usersByConflictKey.has(conflictKey)) {
                usersByConflictKey.set(conflictKey, user);
            }
        }
    }

    return usersByConflictKey;
}

function getFirstUserConflictKey(user: User, existingUsersByConflictKey: Map<string, User>) {
    return getUserConflictKeys(user).find((conflictKey) => existingUsersByConflictKey.has(conflictKey));
}

function userConflictExists(leftUser: User, rightUser: User) {
    const rightConflictKeys = new Set(getUserConflictKeys(rightUser));
    return getUserConflictKeys(leftUser).some((conflictKey) => rightConflictKeys.has(conflictKey));
}

function getUserConflictKeys(user: User) {
    const sanitizedUser = sanitizeUser(user);
    const conflictKeys: string[] = [];
    const authenticatedId = normalizeOptionalString(sanitizedUser.authenticatedId);
    const email = normalizeOptionalString(sanitizedUser.email)?.toLowerCase() ?? null;
    const temporaryId = normalizeOptionalString(sanitizedUser.temporaryId);

    if (authenticatedId) {
        conflictKeys.push(`authenticated:${authenticatedId}`);
    }

    if (email) {
        conflictKeys.push(`email:${email}`);
    }

    if (temporaryId) {
        conflictKeys.push(`temporary:${temporaryId}`);
    }

    return conflictKeys;
}

function createComparableCompanyKey(company: Company) {
    const [normalizedCompany] = sanitizeCompanies([company]);

    return JSON.stringify({
        id: normalizedCompany?.id ?? '',
        parentId: normalizeOptionalString(normalizedCompany?.parent?.id),
        data: normalizeComparableDataRecord(normalizedCompany?.data),
    });
}

function normalizeComparableStringRecord(record?: Record<string, string | null>) {
    return Object.entries(record ?? {})
        .map(([key, value]) => [key.trim(), value?.trim() ?? ''] as const)
        .filter(([key, value]) => key && value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
}

function normalizeComparableDataRecord(record?: Record<string, DataValue>) {
    return Object.entries(record ?? {})
        .map(([key, value]) => [key.trim(), normalizeComparableDataValue(value)] as const)
        .filter(([key, value]) => key && value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
}

function normalizeComparableDataValue(value: DataValue | undefined) {
    if (!value) {
        return '';
    }

    return `${value.type}:${String(value.value ?? '')}`;
}

function isUserLike(value: unknown): value is User {
    return !!value && typeof value === 'object';
}

function isCompanyLike(value: unknown): value is Company {
    return !!value && typeof value === 'object';
}
