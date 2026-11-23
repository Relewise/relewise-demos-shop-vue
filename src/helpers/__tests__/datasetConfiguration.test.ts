import { describe, expect, it } from 'vitest';
import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import { applySharedDatasetImportDecision, buildSharedDataset, createDatasetFromSharedDataset, getDefaultSharedDatasetImportDecision, parseSharedDataset } from '@/helpers/sharedDataset';

const dataset = {
    datasetId: 'dataset',
    apiKey: 'api-key',
    allLanguages: ['en'],
    allCurrencies: ['USD'],
};

describe('datasetConfiguration', () => {
    it('disables conversational search by default', () => {
        expect(normalizeDatasetConfiguration(dataset).conversationalSearchEnabled).toBe(false);
    });

    it('preserves enabled conversational search', () => {
        expect(normalizeDatasetConfiguration({
            ...dataset,
            conversationalSearchEnabled: true,
        }).conversationalSearchEnabled).toBe(true);
    });

    it('round-trips placeholder URLs and preserves local URLs on older imports', () => {
        const configured = normalizeDatasetConfiguration({
            ...dataset,
            productPlaceholderImageUrl: ' /product.png ',
            categoryPlaceholderImageUrl: ' ',
        });
        const shared = parseSharedDataset(JSON.parse(JSON.stringify(buildSharedDataset(configured))))!;
        const imported = createDatasetFromSharedDataset(shared);
        expect(imported.productPlaceholderImageUrl).toBe('/product.png');
        expect(imported.categoryPlaceholderImageUrl).toBeUndefined();

        const decision = getDefaultSharedDatasetImportDecision();
        applySharedDatasetImportDecision(configured, parseSharedDataset(dataset)!, decision);
        expect(configured.productPlaceholderImageUrl).toBe('/product.png');
        applySharedDatasetImportDecision(configured, { ...shared, productPlaceholderImageUrl: null }, decision);
        expect(configured.productPlaceholderImageUrl).toBeUndefined();
    });
});
