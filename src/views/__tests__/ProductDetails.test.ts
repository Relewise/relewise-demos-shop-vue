import { DataValueFactory, type ProductResult } from '@relewise/client';
import { flushPromises, shallowMount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ProductDetails from '../ProductDetails.vue';

const { searchProducts } = vi.hoisted(() => ({ searchProducts: vi.fn() }));

vi.mock('@/stores/context.store', () => ({
    default: {
        context: { value: { storeQuantityDataKey: 'Stock' } },
        defaultSettings: { language: 'en', currency: 'EUR', displayedAtLocation: 'Product details', user: {} },
        selectedProductProperties: { allData: true, displayName: true },
        language: { value: 'en' },
        activeContextRevision: { value: 0 },
        productAvailabilityFilters: vi.fn(),
        getSearcher: () => ({ searchProducts }),
    },
}));

vi.mock('@/services/tracking.service', () => ({
    default: { trackProductView: vi.fn() },
}));

it('keeps the newest stock result when navigating from variant A to B and back to A', async() => {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/product/:id/variant/:variant', component: ProductDetails }],
    });
    await router.push('/product/drill/variant/a');

    const pendingRequests: Array<(variantId: string, quantity: number) => void> = [];
    searchProducts.mockImplementation(() => new Promise<{ results: ProductResult[] }>(resolve => {
        pendingRequests.push((variantId, quantity) => resolve({
            results: [{
                rank: 1,
                productId: 'drill',
                displayName: 'Workshop Drill',
                variant: { rank: 1, variantId, data: { Stock: DataValueFactory.number(quantity) } },
            }],
        }));
    }));

    const wrapper = shallowMount(ProductDetails, {
        global: { plugins: [router], mocks: { $format: () => '' } },
    });

    try {
        await router.push('/product/drill/variant/b');
        await router.push('/product/drill/variant/a');
        expect(pendingRequests).toHaveLength(3);

        pendingRequests[2]!('a', 8);
        await flushPromises();
        const stockPanel = wrapper.get('section[aria-labelledby="store-availability-heading"]');
        expect(stockPanel.text()).toContain('8 in stock');

        pendingRequests[1]!('b', 4);
        pendingRequests[0]!('a', 99);
        await flushPromises();
        expect(stockPanel.text()).toContain('8 in stock');
    }
    finally {
        wrapper.unmount();
    }
});
