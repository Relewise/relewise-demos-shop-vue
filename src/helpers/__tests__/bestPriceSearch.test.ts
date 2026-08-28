import { describe, expect, it, vi } from 'vitest';
import { ProductSearchBuilder, UserFactory } from '@relewise/client';
import type { SearchPricingContext } from '@/services/price.service';
import { addBestPriceFacet, removeEmptyBestPriceFacetSelection, sortByBestPrice } from '@/helpers/bestPriceSearch';
import { getFacetSettings, getRangeFacetResult } from '@/helpers/facetHelper';

vi.mock('@/stores/context.store', () => ({
    default: { context: { value: { allowThirdLevelCategories: false } } },
}));

const nowUnixMs = new Date('2026-06-01T12:00:00.000Z').getTime();

function pricingContext(numberOfIds: number): SearchPricingContext {
    return {
        accessiblePriceListIds: Array.from({ length: numberOfIds }, (_, index) => `price-list-${index}`),
        currency: 'DKK',
        nowUnixMs,
    };
}

function buildRequest(
    context: SearchPricingContext | null,
    order: 'Ascending' | 'Descending' = 'Ascending',
    filters: Record<string, string | string[]> = { price: ['150', '250'] },
) {
    return new ProductSearchBuilder({
        language: 'da-DK',
        currency: 'DKK',
        displayedAtLocation: 'Test',
        user: UserFactory.anonymous(),
    })
        .facets(builder => addBestPriceFacet(builder, filters, context))
        .sorting(builder => sortByBestPrice(builder, order, context))
        .build() as any;
}

describe('bestPriceSearch', () => {
    it.each([1, 50, 500])('sends %i accessible IDs in one StringList condition', numberOfIds => {
        const request = buildRequest(pricingContext(numberOfIds));
        const conditions = request.facets.items[0].filter.conditions;
        const priceListCondition = conditions[0];

        expect(priceListCondition.key).toBe('PriceListId');
        expect(priceListCondition.$type).toContain('ObjectValueEqualsCondition');
        expect(priceListCondition.value.type).toBe('StringList');
        expect(priceListCondition.value.value.$values).toHaveLength(numberOfIds);
    });

    it('uses access, currency, inclusive dates, and minimum selection for price evaluation', () => {
        const request = buildRequest(pricingContext(2));
        const conditions = request.facets.items[0].filter.conditions;

        expect(conditions.map((condition: any) => condition.key)).toEqual([
            'PriceListId',
            'Currency',
            'DateFrom',
            'DateTo',
            'Amount',
        ]);
        expect(conditions[1].value.value).toBe('DKK');
        expect(conditions[2].value).toBe(nowUnixMs + 1);
        expect(conditions[3].value).toBe(nowUnixMs - 1);
        expect(conditions[4].$type).toContain('ObjectValueMinByCondition');
    });

    it.each(['Ascending', 'Descending'] as const)('sorts numerically by the filtered minimum amount in %s order', order => {
        const request = buildRequest(pricingContext(2), order);

        expect(request.sorting.value).toMatchObject({
            dataSelectionStrategy: 'Product',
            mode: 'Numerical',
            order,
            valueSelector: {
                key: 'Prices',
                childSelector: { key: 'Amount' },
            },
            thenBy: { order: 'Descending' },
        });
        expect(request.sorting.value.valueSelector.filter.conditions.at(-1).$type).toContain('ObjectValueMinByCondition');
    });

    it('facets the filtered minimum amount with the selected URL bounds', () => {
        const request = buildRequest(pricingContext(2));
        const facet = request.facets.items[0];

        expect(facet).toMatchObject({
            key: 'Prices',
            dataSelectionStrategy: 'Product',
            items: [{ key: 'Amount', selected: { lowerBoundInclusive: 150, upperBoundInclusive: 250 } }],
        });
        expect(facet.filter.conditions.at(-1).$type).toContain('ObjectValueMinByCondition');
    });

    it('removes an empty nested amount selection without removing selected bounds', () => {
        const unselectedRequest = buildRequest(pricingContext(2), 'Ascending', {});
        const unselectedAmountFacet = unselectedRequest.facets.items[0].items[0];

        expect(unselectedAmountFacet.selected).toEqual({});
        removeEmptyBestPriceFacetSelection(unselectedRequest);
        expect(unselectedAmountFacet).not.toHaveProperty('selected');

        const selectedRequest = buildRequest(pricingContext(2));
        removeEmptyBestPriceFacetSelection(selectedRequest);
        expect(selectedRequest.facets.items[0].items[0].selected).toEqual({
            lowerBoundInclusive: 150,
            upperBoundInclusive: 250,
        });
    });

    it('falls back to built-in SalesPrice when access is empty', () => {
        const request = buildRequest(null);

        expect(request.filters?.items ?? []).toHaveLength(0);
        expect(request.facets.items[0].field).toBe('SalesPrice');
        expect(request.sorting.value).toMatchObject({ attribute: 'SalesPrice', order: 'Ascending' });
    });

    it('unwraps the nested best-price amount facet for the existing range UI', () => {
        const facet = {
            $type: 'ProductDataObjectFacetResult',
            field: 'Data',
            key: 'Prices',
            dataSelectionStrategy: 'Product',
            evaluationMode: 'And',
            items: [{
                $type: 'DataObjectDoubleRangeFacetResult',
                field: 'Data',
                key: 'Amount',
                selected: { lowerBoundInclusive: 150, upperBoundInclusive: 250 },
                available: {
                    value: { lowerBoundInclusive: 100, upperBoundInclusive: 300 },
                    hits: 10,
                    selected: true,
                },
            }],
        } as any;

        expect(getFacetSettings(facet)?.type).toBe('SalesPrice');
        expect(getRangeFacetResult(facet)).toBe(facet.items[0]);
    });
});
