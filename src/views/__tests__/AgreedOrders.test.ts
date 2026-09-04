import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchPricingContext } from '@/services/price.service';

const testState = vi.hoisted(() => ({
    pricingContext: {
        accessibleScopeIds: ['price-list', 'agreement-1'],
        accessibleAgreedOrderScopeIds: ['agreement-1'],
        accessibleCompanyIds: ['customer-1'],
        currency: 'DKK',
        nowUnixMs: Date.parse('2026-09-04T12:00:00.000Z'),
    } as SearchPricingContext | null,
    searchProducts: vi.fn(),
    replaceRoute: vi.fn(),
}));

vi.mock('@/router', () => ({
    default: {
        currentRoute: { value: { query: {} } },
        replace: testState.replaceRoute,
    },
}));

vi.mock('@/stores/context.store', () => ({
    default: {
        defaultSettings: { language: 'da-DK', currency: 'DKK', displayedAtLocation: 'Agreed Orders', user: {} },
        selectedProductProperties: { allData: true },
        context: { value: {} },
        createSearchPricingContext: () => testState.pricingContext,
        getSearcher: () => ({ searchProducts: testState.searchProducts }),
        userClassificationBasedFilters: vi.fn(),
    },
}));

import AgreedOrders from '@/views/AgreedOrders.vue';

describe('AgreedOrders', () => {
    beforeEach(() => {
        testState.pricingContext = {
            accessibleScopeIds: ['price-list', 'agreement-1'],
            accessibleAgreedOrderScopeIds: ['agreement-1'],
            accessibleCompanyIds: ['customer-1'],
            currency: 'DKK',
            nowUnixMs: Date.parse('2026-09-04T12:00:00.000Z'),
        };
        testState.searchProducts.mockReset().mockResolvedValue({ hits: 0, results: [] });
        testState.replaceRoute.mockReset().mockResolvedValue(undefined);
    });

    it('requests purchasable products within the current customer agreement scopes', async() => {
        const wrapper = renderView();
        await flushPromises();

        expect(wrapper.text()).toContain('My Agreed Orders');
        expect(testState.searchProducts).toHaveBeenCalledOnce();
        const request = testState.searchProducts.mock.calls[0]![0] as any;
        expect(request.filters.items.map((filter: any) => filter.key)).toEqual(['Prices', 'AgreedOrderScopeIds']);
        expect(request.filters.items[1].conditions.items[0].value.value.$values).toEqual(['agreement-1']);
        expect(request.facets.items.map((facet: any) => facet.key ?? facet.field)).toEqual([
            'Category',
            'Brand',
            'Prices',
        ]);
        expect(testState.replaceRoute).toHaveBeenCalledWith({
            path: '/agreed-orders',
            query: { sort: '' },
        });
    });

    it('shows an empty access state without making a request', async() => {
        testState.pricingContext = {
            accessibleScopeIds: ['default'],
            accessibleAgreedOrderScopeIds: [],
            accessibleCompanyIds: [],
            currency: 'DKK',
            nowUnixMs: Date.parse('2026-09-04T12:00:00.000Z'),
        };

        const wrapper = renderView();
        await flushPromises();

        expect(wrapper.text()).toContain('No agreed orders available');
        expect(testState.searchProducts).not.toHaveBeenCalled();
    });
});

function renderView() {
    return mount(AgreedOrders, {
        global: {
            stubs: {
                Breadcrumb: true,
                Pagination: true,
                ProductTile: true,
            },
        },
    });
}
