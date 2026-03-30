import { normalizeDatasetConfiguration, uniqueNormalizedStrings } from '@/helpers/datasetConfiguration';
import type { IDataset } from '@/stores/context.store';

export type SharedDataset = {
    datasetId: string;
    apiKey: string;
    displayName?: string | null;
    language?: string | null;
    allLanguages?: string[];
    currencyCode?: string | null;
    allCurrencies?: string[];
    serverUrl?: string | null;
};

export type SharedDatasetCoreFieldChange = {
    key: 'displayName' | 'apiKey' | 'serverUrl';
    label: string;
    currentValue: string;
    nextValue: string;
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

    return {
        datasetId,
        apiKey,
        displayName: normalizeOptionalString(entry.displayName),
        language: normalizeOptionalString(entry.language),
        allLanguages: normalizeOptionalStringArray(entry.allLanguages),
        currencyCode: normalizeOptionalCurrency(entry.currencyCode),
        allCurrencies: normalizeOptionalCurrencyArray(entry.allCurrencies),
        serverUrl: normalizeOptionalString(entry.serverUrl),
    };
}

export function buildSharedDataset(dataset: IDataset, {
    language,
    currencyCode,
}: {
    language?: string;
    currencyCode?: string;
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
    });
}

export function mergeSharedDatasetIntoExistingDataset(dataset: IDataset, sharedDataset: SharedDataset) {
    dataset.displayName = sharedDataset.displayName ?? undefined;
    dataset.apiKey = sharedDataset.apiKey;
    dataset.serverUrl = sharedDataset.serverUrl ?? undefined;

    return mergeSharedDatasetLocalesIntoExistingDataset(dataset, sharedDataset);
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
            label: 'API key',
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
