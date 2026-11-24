import { describe, expect, it } from 'vitest';
import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';

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

    it('trims configured store keys without changing their case and treats blank keys as defaults', () => {
        expect(normalizeDatasetConfiguration({
            ...dataset,
            storeQuantityDataKey: '  InventoryByLocation ',
            storeNameDataKey: '  ',
        })).toMatchObject({
            storeQuantityDataKey: 'InventoryByLocation',
            storeNameDataKey: undefined,
        });
    });
});
