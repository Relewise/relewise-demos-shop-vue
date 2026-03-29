import { WebComponentProductTemplate } from '@/components/WebComponentProductTemplate';
import { initializeRelewiseUI } from '@relewise/web-components';
import { Recommender, Searcher, Tracker, type SelectedProductPropertiesSettings, type User } from '@relewise/client';
import type { IDataset } from '@/stores/context.store';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';

function assertDatasetCredentials(dataset?: IDataset): asserts dataset is IDataset {
    if (!dataset?.apiKey || !dataset.datasetId) {
        throw new Error('Missing apiKey or datasetId');
    }
}

export function createSearcherForDataset(dataset?: IDataset): Searcher {
    assertDatasetCredentials(dataset);
    return new Searcher(dataset.datasetId, dataset.apiKey, { serverUrl: dataset.serverUrl });
}

export function createRecommenderForDataset(dataset?: IDataset): Recommender {
    assertDatasetCredentials(dataset);
    return new Recommender(dataset.datasetId, dataset.apiKey, { serverUrl: dataset.serverUrl });
}

export function createTrackerForDataset(dataset?: IDataset): Tracker {
    assertDatasetCredentials(dataset);
    return new Tracker(dataset.datasetId, dataset.apiKey, { serverUrl: dataset.serverUrl });
}

export function initializeWebComponentsForDataset({
    dataset,
    language,
    currencyCode,
    user,
    selectedProductProperties,
}: {
    dataset: IDataset;
    language: string;
    currencyCode: string;
    user: User;
    selectedProductProperties: SelectedProductPropertiesSettings;
}) {
    initializeRelewiseUI(
        {
            contextSettings: {
                getUser: () => user,
                language,
                currency: currencyCode,
            },
            datasetId: dataset.datasetId,
            apiKey: dataset.apiKey,
            clientOptions: {
                serverUrl: dataset.serverUrl,
            },
            selectedPropertiesSettings: {
                product: selectedProductProperties,
                variant: { allData: true },
            },
            templates: {
                product: (product, extentions) => {
                    return WebComponentProductTemplate(product, extentions);
                },
            },
            filters: {
                product(builder) {
                    globalProductRecommendationFilters(builder);
                },
            },
            userEngagement: {
                product: {
                    favorite: true,
                },
                content: {
                    sentiment: true,
                },
            },
        }).useRecommendations();
}
