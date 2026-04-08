import type { IDataset } from '@/stores/context.store';
import { getCompanyDataDraft, getUserMetadataDraft } from '@/helpers/keyValueMetadata';
import { sanitizeUsers } from '@/helpers/userContext';
import type { Company } from '@relewise/client';

type DatasetNormalizationInput = Partial<IDataset> & {
    language?: string;
    currencyCode?: string;
};

export function uniqueNormalizedStrings(
    values: Array<string | undefined | null>,
    { uppercase = false }: { uppercase?: boolean } = {},
) {
    const normalized: string[] = [];

    for (const value of values) {
        const trimmedValue = uppercase ? value?.trim().toUpperCase() ?? '' : value?.trim() ?? '';
        if (!trimmedValue || normalized.some((existingValue) => existingValue.toLowerCase() === trimmedValue.toLowerCase())) {
            continue;
        }

        normalized.push(trimmedValue);
    }

    return normalized;
}

function sanitizeCompanies(companies?: Company[]) {
    return (companies ?? []).map((company) => ({
        ...company,
        id: company.id?.trim() ?? '',
        parent: company.parent?.id?.trim() ? { id: company.parent.id.trim() } as Company : undefined,
        data: company.data ? { ...company.data } : undefined,
    }));
}

export function normalizeDatasetConfiguration(dataset: DatasetNormalizationInput): IDataset {
    return {
        datasetId: dataset.datasetId?.trim() ?? '',
        apiKey: dataset.apiKey?.trim() ?? '',
        displayName: dataset.displayName?.trim() ?? '',
        allLanguages: uniqueNormalizedStrings([...(dataset.allLanguages ?? []), dataset.language]),
        allCurrencies: uniqueNormalizedStrings([...(dataset.allCurrencies ?? []), dataset.currencyCode], { uppercase: true }),
        serverUrl: dataset.serverUrl?.trim() ?? '',
        users: sanitizeUsers(dataset.users),
        companies: sanitizeCompanies(dataset.companies),
        trackingEnabled: dataset.trackingEnabled ?? false,
        allowThirdLevelCategories: dataset.allowThirdLevelCategories ?? false,
        hideSoldOutProducts: dataset.hideSoldOutProducts ?? false,
        userClassificationFilters: dataset.userClassificationFilters ?? false,
        recommendationsMinutesAgo: dataset.recommendationsMinutesAgo ?? 20160,
        showProductRelevanceScore: dataset.showProductRelevanceScore ?? false,
        B2bRecommendations: dataset.B2bRecommendations ?? false,
        showVariantsBadge: dataset.showVariantsBadge ?? false,
        similarProductsOnPdp: dataset.similarProductsOnPdp ?? false,
        variantBasedSearchOverlay: dataset.variantBasedSearchOverlay ?? false,
        contentSearch: dataset.contentSearch ?? false,
        searchHighlight: dataset.searchHighlight ?? false,
        shoppertainmentEnabled: dataset.shoppertainmentEnabled ?? false,
    };
}

export function cloneDatasetConfiguration(dataset: IDataset): IDataset {
    return JSON.parse(JSON.stringify(dataset)) as IDataset;
}

export function createDatasetSnapshot(dataset: IDataset, trackingEnabled = dataset.trackingEnabled ?? false) {
    return JSON.stringify({
        tracking: trackingEnabled,
        dataset: normalizeDatasetConfiguration(dataset),
        drafts: {
            users: (dataset.users ?? []).map((user) => getUserMetadataDraft(user) ?? null),
            companies: (dataset.companies ?? []).map((company) => getCompanyDataDraft(company) ?? null),
        },
    });
}
