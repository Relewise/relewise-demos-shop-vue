import { Recommender, Searcher, Tracker, type ProductSearchResponse } from '@relewise/client';
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import contextStore from '@/stores/context.store';
import Feed from '@/views/Feed.vue';
import ProductDetails from '@/views/ProductDetails.vue';

vi.mock('@relewise/web-components', () => ({ initializeRelewiseUI: () => ({ useRecommendations: vi.fn() }) }));

enableAutoUnmount(afterEach);

beforeAll(() => {
    contextStore.addDataset({
        datasetId: 'demo',
        apiKey: 'fixture-key',
        allLanguages: ['en'],
        allCurrencies: ['EUR'],
        trackingEnabled: true,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

async function showRoute(component: Component, path: string) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/product/:id', component: ProductDetails },
            { path: '/product/:id/variant/:variant', component: ProductDetails },
            { path: '/product-feed/:id', component: Feed },
        ],
    });
    await router.push(path);
    const wrapper = shallowMount(component, { global: { plugins: [router], mocks: { $format: vi.fn() } } });
    return { router, wrapper };
}

describe('product view tracking', () => {
    it('reports an unavailable product without tracking a view', async() => {
        vi.spyOn(Searcher.prototype, 'searchProducts').mockResolvedValue({ hits: 0, results: [] });
        const track = vi.spyOn(Tracker.prototype, 'trackProductView').mockResolvedValue(undefined);

        const { wrapper } = await showRoute(ProductDetails, '/product/gloves');
        await flushPromises();

        expect(wrapper.text()).toContain('Product unavailable.');
        expect(track).not.toHaveBeenCalled();
    });

    it('only tracks the product from the current lookup after route changes', async() => {
        let resolveStaleLookup!: (response: ProductSearchResponse) => void;
        const staleLookup = new Promise<ProductSearchResponse>(resolve => { resolveStaleLookup = resolve; });
        vi.spyOn(Searcher.prototype, 'searchProducts')
            .mockReturnValueOnce(staleLookup)
            .mockResolvedValueOnce({ hits: 1, results: [{ productId: 'gloves', displayName: 'Safety gloves', rank: 1 }] });
        const track = vi.spyOn(Tracker.prototype, 'trackProductView').mockResolvedValue(undefined);

        const { router, wrapper } = await showRoute(ProductDetails, '/product/drill/variant/blue');
        expect(track).not.toHaveBeenCalled();
        await router.push('/product/gloves');
        await flushPromises();
        resolveStaleLookup({ hits: 1, results: [{ productId: 'drill', displayName: 'Drill', rank: 1 }] });
        await flushPromises();

        expect(wrapper.find('h1').text()).toBe('Safety gloves');
        expect(track).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ productId: 'gloves', variantId: undefined }));
    });

    it.each([false, true])('only seeds and tracks an available feed product (available: %s)', async(available) => {
        vi.stubGlobal('IntersectionObserver', class {
            observe() {}
            unobserve() {}
            disconnect() {}
        });
        vi.spyOn(Searcher.prototype, 'searchProducts').mockResolvedValue({
            hits: available ? 1 : 0,
            results: available ? [{ productId: 'gloves', displayName: 'Safety gloves', rank: 1 }] : [],
        });
        const track = vi.spyOn(Tracker.prototype, 'trackProductView').mockResolvedValue(undefined);
        const initializeFeed = vi.spyOn(Recommender.prototype, 'recommendFeedInitialization')
            .mockResolvedValue({ initializedFeedId: 'test-feed', recommendations: [] });
        vi.spyOn(Recommender.prototype, 'recommendFeedNextItems')
            .mockResolvedValue({ initializedFeedId: 'test-feed', recommendations: [] });

        const { wrapper } = await showRoute(Feed, '/product-feed/gloves');
        await flushPromises();

        expect(initializeFeed).toHaveBeenCalledTimes(1);
        const seed = initializeFeed.mock.calls[0]?.[0].feed.seed;
        if (available) {
            expect(seed?.productAndVariantIds).toEqual([{ productId: 'gloves' }]);
            expect(track).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ productId: 'gloves' }));
            expect(wrapper.text()).toContain('Safety gloves');
        } else {
            expect(seed?.productAndVariantIds).toBeUndefined();
            expect(track).not.toHaveBeenCalled();
            expect(wrapper.text()).not.toContain('Safety gloves');
        }
    });
});
