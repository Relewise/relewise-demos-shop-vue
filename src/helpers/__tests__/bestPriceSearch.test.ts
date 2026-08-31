import { describe, expect, it, vi } from 'vitest';
import { ProductSearchBuilder, UserFactory } from '@relewise/client';
import type { SearchPricingContext } from '@/services/price.service';
import {
    addAgreedOrderFacet,
    addAgreedOrderFilter,
    addBestPriceFacet,
    addScopedPriceEligibilityFilter,
    AGREED_ORDER_SORT,
    removeEmptyBestPriceFacetSelection,
    sanitizeAgreedOrderSelections,
    sortByAgreedOrder,
    sortByBestPrice,
} from '@/helpers/bestPriceSearch';
import { getAgreedOrderFacetHitCount, getFacetSettings, getRangeFacetResult } from '@/helpers/facetHelper';

vi.mock('@/stores/context.store', () => ({
    default: { context: { value: { allowThirdLevelCategories: false } } },
}));

const nowUnixMs = new Date('2026-06-01T12:00:00.000Z').getTime();

function pricingContext(numberOfIds: number, agreementIds = ['agreement-1']): SearchPricingContext {
    return {
        accessibleScopeIds: Array.from({ length: numberOfIds }, (_, index) => `scope-${index}`),
        accessibleAgreedOrderScopeIds: agreementIds,
        accessibleCompanyIds: agreementIds.length > 0 ? ['company-1'] : [],
        currency: 'DKK',
        nowUnixMs,
    };
}

function builder() {
    return new ProductSearchBuilder({
        language: 'da-DK',
        currency: 'DKK',
        displayedAtLocation: 'Test',
        user: UserFactory.anonymous(),
    });
}

function buildPriceRequest(
    context: SearchPricingContext | null,
    order: 'Ascending' | 'Descending' = 'Ascending',
    filters: Record<string, string | string[]> = { price: ['150', '250'] },
) {
    return builder()
        .filters(filterBuilder => addScopedPriceEligibilityFilter(filterBuilder, context))
        .facets(facetBuilder => addBestPriceFacet(facetBuilder, filters, context))
        .sorting(sortingBuilder => sortByBestPrice(sortingBuilder, order, context))
        .build() as any;
}

describe('bestPriceSearch', () => {
    it.each([1, 50, 500])('sends %i accessible scopes in one StringList condition', numberOfIds => {
        const request = buildPriceRequest(pricingContext(numberOfIds));
        const scopeCondition = request.facets.items[0].filter.conditions[0];

        expect(scopeCondition.key).toBe('ScopeId');
        expect(scopeCondition.$type).toContain('ObjectValueEqualsCondition');
        expect(scopeCondition.value.type).toBe('StringList');
        expect(scopeCondition.value.value.$values).toHaveLength(numberOfIds);
    });

    it('uses scope, allowed sources, currency, inclusive dates, and minimum amount', () => {
        const request = buildPriceRequest(pricingContext(2));
        const conditions = request.facets.items[0].filter.conditions;

        expect(conditions.map((condition: any) => condition.key)).toEqual([
            'ScopeId',
            'Source',
            'Currency',
            'DateFrom',
            'DateTo',
            'Amount',
        ]);
        expect(conditions[1].value.value.$values).toEqual(['PriceList', 'AgreedOrder']);
        expect(conditions[2].value.value).toBe('DKK');
        expect(conditions[3].value).toBe(nowUnixMs + 1);
        expect(conditions[4].value).toBe(nowUnixMs - 1);
        expect(conditions[5].$type).toContain('ObjectValueMinByCondition');
    });

    it('requires every scoped result to contain an eligible Prices object', () => {
        const request = buildPriceRequest(pricingContext(2));
        const filter = request.filters.items[0];
        const objectConditions = filter.conditions.items[0].objectFilter.conditions;

        expect(filter.key).toBe('Prices');
        expect(objectConditions.map((condition: any) => condition.key)).toEqual([
            'ScopeId',
            'Source',
            'Currency',
            'DateFrom',
            'DateTo',
        ]);
    });

    it.each(['Ascending', 'Descending'] as const)('sorts numerically by the scoped minimum amount in %s order', order => {
        const request = buildPriceRequest(pricingContext(2), order);

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

    it('facets the scoped minimum amount with the selected URL bounds', () => {
        const request = buildPriceRequest(pricingContext(2));
        const facet = request.facets.items[0];

        expect(facet).toMatchObject({
            key: 'Prices',
            dataSelectionStrategy: 'Product',
            items: [{ key: 'Amount', selected: { lowerBoundInclusive: 150, upperBoundInclusive: 250 } }],
        });
        expect(facet.filter.conditions.at(-1).$type).toContain('ObjectValueMinByCondition');
    });

    it('removes an empty nested amount selection without removing selected bounds', () => {
        const unselectedRequest = buildPriceRequest(pricingContext(2), 'Ascending', {});
        const unselectedAmountFacet = unselectedRequest.facets.items[0].items[0];

        expect(unselectedAmountFacet.selected).toEqual({});
        removeEmptyBestPriceFacetSelection(unselectedRequest);
        expect(unselectedAmountFacet).not.toHaveProperty('selected');

        const selectedRequest = buildPriceRequest(pricingContext(2));
        removeEmptyBestPriceFacetSelection(selectedRequest);
        expect(selectedRequest.facets.items[0].items[0].selected).toEqual({
            lowerBoundInclusive: 150,
            upperBoundInclusive: 250,
        });
    });

    it('filters agreed orders through the flat scope projection only when selected', () => {
        const context = pricingContext(2);
        const selected = builder()
            .filters(filterBuilder => addAgreedOrderFilter(filterBuilder, { agreedOrder: ['true'] }, context))
            .build() as any;
        const unselected = builder()
            .filters(filterBuilder => addAgreedOrderFilter(filterBuilder, {}, context))
            .build() as any;

        expect(selected.filters.items[0]).toMatchObject({ key: 'AgreedOrderScopeIds' });
        expect(selected.filters.items[0].conditions.items[0]).toMatchObject({
            valueCollectionEvaluationMode: 'Any',
            value: { type: 'StringList' },
        });
        expect(selected.filters.items[0].conditions.items[0].value.value.$values).toEqual(['agreement-1']);
        expect(unselected.filters?.items ?? []).toHaveLength(0);
    });

    it('facets and sorts agreed orders using identical company, scope, value, and date restrictions', () => {
        const context = pricingContext(2);
        const request = builder()
            .facets(facetBuilder => addAgreedOrderFacet(facetBuilder, context))
            .sorting(sortingBuilder => sortByAgreedOrder(sortingBuilder, context))
            .build() as any;
        const facet = request.facets.items[0];
        const facetConditions = facet.filter.conditions;
        const sortConditions = request.sorting.value.valueSelector.filter.conditions;

        expect(facet).toMatchObject({
            key: 'AgreedOrders',
            items: [{ key: 'HasAgreedOrder' }],
        });
        expect(facetConditions.map((condition: any) => condition.key)).toEqual([
            'ScopeId',
            'CompanyId',
            'HasAgreedOrder',
            'DateFrom',
            'DateTo',
        ]);
        expect(sortConditions).toEqual(facetConditions);
        expect(request.sorting.value).toMatchObject({
            order: 'Descending',
            mode: 'Numerical',
            valueSelector: {
                key: 'AgreedOrders',
                childSelector: { key: 'HasAgreedOrder' },
            },
            thenBy: { order: 'Descending' },
        });
    });

    it('omits agreement behavior and clears stale URL selections without agreement access', () => {
        const context = pricingContext(2, []);
        const filters: Record<string, string | string[]> = {
            agreedOrder: ['true'],
            sort: AGREED_ORDER_SORT,
        };
        const request = builder()
            .facets(facetBuilder => addAgreedOrderFacet(facetBuilder, context))
            .filters(filterBuilder => addAgreedOrderFilter(filterBuilder, filters, context))
            .build() as any;

        expect(request.facets?.items ?? []).toHaveLength(0);
        expect(request.filters?.items ?? []).toHaveLength(0);
        expect(sanitizeAgreedOrderSelections(filters, context)).toBe(true);
        expect(filters).toEqual({ sort: '' });
    });

    it('falls back to native SalesPrice behavior when scope access is empty', () => {
        const request = buildPriceRequest(null);

        expect(request.filters?.items ?? []).toHaveLength(0);
        expect(request.facets.items[0].field).toBe('SalesPrice');
        expect(request.sorting.value).toMatchObject({ attribute: 'SalesPrice', order: 'Ascending' });
    });

    it('adapts nested price and agreed-order facet results for the existing UI', () => {
        const priceFacet = {
            $type: 'ProductDataObjectFacetResult',
            field: 'Data',
            key: 'Prices',
            items: [{
                field: 'Data',
                key: 'Amount',
                available: { value: { lowerBoundInclusive: 100, upperBoundInclusive: 300 }, hits: 10 },
            }],
        } as any;
        const agreementFacet = {
            $type: 'ProductDataObjectFacetResult',
            field: 'Data',
            key: 'AgreedOrders',
            items: [{
                field: 'Data',
                key: 'HasAgreedOrder',
                available: [{ value: 1, hits: 7, selected: false }],
            }],
        } as any;

        expect(getFacetSettings(priceFacet)?.type).toBe('SalesPrice');
        expect(getRangeFacetResult(priceFacet)).toBe(priceFacet.items[0]);
        expect(getFacetSettings(agreementFacet)?.type).toBe('AgreedOrder');
        expect(getAgreedOrderFacetHitCount(agreementFacet)).toBe(7);
    });
});
