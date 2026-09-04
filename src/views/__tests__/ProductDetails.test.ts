import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductResult } from '@relewise/client';

const testState = vi.hoisted(() => ({
    resolveProductPrice: vi.fn(),
    searchProducts: vi.fn(),
    route: { params: { id: 'product-1' } },
}));

vi.mock('vue-router', () => ({
    useRoute: () => reactive(testState.route),
}));

vi.mock('@/stores/context.store', () => ({
    default: {
        defaultSettings: { language: 'da-DK', currency: 'DKK', displayedAtLocation: 'PDP', user: {} },
        selectedProductProperties: { allData: true },
        context: { value: { similarProductsOnPdp: false } },
        language: { value: 'da-DK' },
        getSearcher: () => ({ searchProducts: testState.searchProducts }),
        userClassificationBasedFilters: vi.fn(),
        createSearchPricingContext: vi.fn(() => null),
        resolveProductPrice: testState.resolveProductPrice,
    },
}));

vi.mock('@/services/tracking.service', () => ({
    default: { trackProductView: vi.fn(), trackCart: vi.fn() },
}));

vi.mock('@/services/basket.service', () => ({
    default: { addProduct: vi.fn(), model: { value: { lineItems: [] } } },
}));

import ProductDetails from '@/views/ProductDetails.vue';

const product = {
    productId: 'product-1',
    displayName: 'Test product',
    salesPrice: 80,
    listPrice: 100,
    rank: 1,
} as ProductResult;

describe('ProductDetails pricing', () => {
    beforeEach(() => {
        testState.searchProducts.mockReset().mockResolvedValue({ results: [product] });
        testState.resolveProductPrice.mockReset();
    });

    it('shows a resolved scoped amount without sale presentation', async() => {
        testState.resolveProductPrice.mockReturnValue({ amount: 70, currency: 'DKK', source: 'AgreedOrder' });

        const wrapper = renderProductDetails();
        await flushPromises();

        expect(wrapper.text()).toContain('70');
        expect(wrapper.text()).not.toContain('ON SALE');
        expect(wrapper.text()).not.toContain('100');
    });

    it('does not render native sales or list prices when no scoped price resolves', async() => {
        testState.resolveProductPrice.mockReturnValue({ amount: null, currency: 'DKK', source: null });

        const wrapper = renderProductDetails();
        await flushPromises();

        expect(wrapper.text()).not.toContain('80');
        expect(wrapper.text()).not.toContain('100');
        expect(wrapper.text()).not.toContain('ON SALE');
    });
});

function renderProductDetails() {
    return mount(ProductDetails, {
        global: {
            mocks: { $format: (value: number | null | undefined) => value == null ? '' : String(value) },
            stubs: {
                RouterLink: { template: '<a><slot /></a>' },
                Breadcrumb: true,
                Image: true,
                ProductVariants: true,
                SimilarProductsRecommendation: true,
                DataValueList: true,
            },
        },
    });
}
