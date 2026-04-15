import type { IDataset } from '@/stores/context.store';
import { getUserCompanyIds } from '@/helpers/userContext';
import type { User } from '@relewise/client';

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

    const validUserSelection = getDefaultUserSelection(dataset);

    return {
        selectedLanguage: dataset.allLanguages?.[0] ?? undefined,
        selectedCurrencyCode: dataset.allCurrencies?.[0] ?? undefined,
        selectedUserIndex: validUserSelection.selectedUserIndex,
        selectedCompanyId: validUserSelection.selectedCompanyId,
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

    if (normalizedSelections.selectedUserIndex === undefined) {
        normalizedSelections.selectedCompanyId = undefined;
        return normalizedSelections;
    }

    const selectedUser = users[normalizedSelections.selectedUserIndex];
    const validCompanyIds = getSelectableCompanyIdsForUser(selectedUser, dataset);
    if (validCompanyIds.length === 0) {
        normalizedSelections.selectedCompanyId = undefined;
        return normalizedSelections;
    }

    if (normalizedSelections.selectedCompanyId && !validCompanyIds.includes(normalizedSelections.selectedCompanyId)) {
        normalizedSelections.selectedCompanyId = undefined;
    }

    return normalizedSelections;
}

export function getSelectableCompanyIdsForUser(user: User | undefined, dataset?: IDataset) {
    if (!user || !dataset) {
        return [];
    }

    const knownCompanyIds = new Set((dataset.companies ?? []).map((company) => company.id).filter(Boolean));
    return getUserCompanyIds(user).filter((companyId) => knownCompanyIds.has(companyId));
}

export function hasSelectableCompaniesForUser(user: User | undefined, dataset?: IDataset) {
    return getSelectableCompanyIdsForUser(user, dataset).length > 0;
}

function getDefaultUserSelection(dataset: IDataset) {
    const users = dataset.users ?? [];
    if (users.length > 0) {
        return {
            selectedUserIndex: 0,
            selectedCompanyId: undefined,
        };
    }

    return {
        selectedUserIndex: undefined,
        selectedCompanyId: undefined,
    };
}
