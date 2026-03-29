import type { IDataset } from '@/stores/context.store';

export interface SessionSelections {
    selectedLanguage?: string;
    selectedCurrencyCode?: string;
    selectedUserIndex?: number;
    selectedCompanyId?: string;
}

function reportMissingLocaleConfiguration(dataset: IDataset) {
    if ((dataset.allLanguages ?? []).length === 0) {
        console.error(`Dataset "${dataset.datasetId}" has no configured languages.`);
    }

    if ((dataset.allCurrencies ?? []).length === 0) {
        console.error(`Dataset "${dataset.datasetId}" has no configured currencies.`);
    }
}

export function clearSessionSelections(): SessionSelections {
    return {
        selectedLanguage: undefined,
        selectedCurrencyCode: undefined,
        selectedUserIndex: undefined,
        selectedCompanyId: undefined,
    };
}

export function createSessionSelectionsForDataset(dataset?: IDataset): SessionSelections {
    if (!dataset) {
        return clearSessionSelections();
    }

    reportMissingLocaleConfiguration(dataset);

    return {
        selectedLanguage: dataset.allLanguages?.[0] ?? undefined,
        selectedCurrencyCode: dataset.allCurrencies?.[0] ?? undefined,
        selectedUserIndex: (dataset.users?.length ?? 0) > 0 ? 0 : undefined,
        selectedCompanyId: dataset.companies?.[0]?.id || undefined,
    };
}

export function normalizeSessionSelectionsForDataset(dataset: IDataset | undefined, selections: SessionSelections): SessionSelections {
    if (!dataset) {
        return clearSessionSelections();
    }

    const normalizedSelections = { ...selections };

    const availableLanguages = dataset.allLanguages ?? [];
    if (!normalizedSelections.selectedLanguage || !availableLanguages.includes(normalizedSelections.selectedLanguage)) {
        if (availableLanguages.length === 0) {
            console.error(`Dataset "${dataset.datasetId}" has no configured languages.`);
        }

        normalizedSelections.selectedLanguage = availableLanguages[0] ?? undefined;
    }

    const availableCurrencies = dataset.allCurrencies ?? [];
    if (!normalizedSelections.selectedCurrencyCode || !availableCurrencies.includes(normalizedSelections.selectedCurrencyCode)) {
        if (availableCurrencies.length === 0) {
            console.error(`Dataset "${dataset.datasetId}" has no configured currencies.`);
        }

        normalizedSelections.selectedCurrencyCode = availableCurrencies[0] ?? undefined;
    }

    const users = dataset.users ?? [];
    if (normalizedSelections.selectedUserIndex === undefined
        || normalizedSelections.selectedUserIndex < 0
        || normalizedSelections.selectedUserIndex >= users.length) {
        normalizedSelections.selectedUserIndex = undefined;
    }

    const companies = dataset.companies ?? [];
    if (!normalizedSelections.selectedCompanyId || !companies.some((company) => company.id === normalizedSelections.selectedCompanyId)) {
        normalizedSelections.selectedCompanyId = undefined;
    }

    return normalizedSelections;
}
