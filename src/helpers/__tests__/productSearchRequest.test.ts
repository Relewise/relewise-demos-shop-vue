import { describe, expect, it } from 'vitest';
import type { ProductResult, SelectedProductPropertiesSettings } from '@relewise/client';
import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import {
    findTermMatchedVariantImage,
    getDefaultMaxVariantsPerProduct,
    getMaxVariantsPerProduct,
    getVariantRequestSorting,
    selectedProductPropertiesForTermSearch,
} from '@/helpers/productSearchRequest';

describe('productSearchRequest', () => {
    it('uses one shared max variants default', () => {
        expect(getDefaultMaxVariantsPerProduct()).toBe(1);
        expect(getMaxVariantsPerProduct({ maxVariantsPerProduct: undefined })).toBe(1);
        expect(getMaxVariantsPerProduct({ maxVariantsPerProduct: 2 })).toBe(2);
    });

    it('defaults variant request sorting to grouped by product', () => {
        expect(getVariantRequestSorting({})).toBe('GroupedByProduct');
        expect(getVariantRequestSorting({ variantRequestSorting: 'ByRelevance' })).toBe('ByRelevance');
    });

    it('does not materialize max variants when absent during dataset normalization', () => {
        const normalizedDataset = normalizeDatasetConfiguration({
            datasetId: 'dataset',
            apiKey: 'api-key',
            allLanguages: ['en'],
            allCurrencies: ['USD'],
            variantBasedSearchOverlay: true,
        });

        expect(normalizedDataset.maxVariantsPerProduct).toBeUndefined();
    });

    it('normalizes explicit max variants during dataset normalization', () => {
        const normalizedDataset = normalizeDatasetConfiguration({
            datasetId: 'dataset',
            apiKey: 'api-key',
            allLanguages: ['en'],
            allCurrencies: ['USD'],
            maxVariantsPerProduct: 2,
        });

        expect(normalizedDataset.maxVariantsPerProduct).toBe(2);
    });

    it('selects variant resolution only for opted-in term searches', () => {
        const selectedProperties = { displayName: true } as SelectedProductPropertiesSettings;

        expect(selectedProductPropertiesForTermSearch(selectedProperties, false)).toBe(selectedProperties);
        expect(selectedProductPropertiesForTermSearch(selectedProperties, true)).toEqual({
            displayName: true,
            variantResolution: true,
        });
    });

    it('uses selected variant images only for term-matched variant resolutions', () => {
        const product = {
            variantResolution: { source: 'MatchByTerm' },
            variant: {
                data: {
                    Image: { type: 'String', value: 'https://example.com/variant.jpg' },
                },
            },
        } as unknown as ProductResult;

        expect(findTermMatchedVariantImage(product)).toBe('https://example.com/variant.jpg');
        expect(findTermMatchedVariantImage({ ...product, variantResolution: { source: 'Default' } } as ProductResult)).toBe('');
        expect(findTermMatchedVariantImage({ ...product, variant: undefined } as ProductResult)).toBe('');
    });
});
