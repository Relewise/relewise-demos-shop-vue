import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import ProductSearchOverlayResult from '../ProductSearchOverlayResult.vue';
vi.mock('@/stores/context.store', async() => ({ default: { context: (await import('vue')).ref({ variantBasedSearchOverlay: true }) } }));

it('renders TOP sponsored products and display ads separately before the organic variant list', async() => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });
    await router.push('/');
    const wrapper = mount(ProductSearchOverlayResult, {
        props: { sort: '', noResultProductRecommendationsTitle: 'Recommended for you', rightSide: null, contentRecommendationResult: null, productSearchResult: { hits: 1, results: [{ productId: 'organic', rank: 1 }] }, pageSize: 40, term: 'fan', filters: {}, predictionsList: [],
            products: [{ isPromotion: true, product: { productId: 'fan', rank: 1 } }, { isPromotion: true, displayAd: { campaignId: 'campaign', result: { displayAdId: 'ad' } } }, { isPromotion: false, product: { productId: 'organic', rank: 1 } }],
        },
        global: { plugins: [router], stubs: {
            ProductTile: { props: ['product', 'isPromotion'], template: '<div>Sponsored {{ isPromotion }} {{ product.productId }}</div>' },
            DisplayAdTile: { template: '<div>Sponsored display ad</div>' },
            VariantBasedProductList: { props: ['productResult'], template: '<div>Organic {{ productResult.results[0].productId }}</div>' },
            Facets: true, Sorting: true, Pagination: true,
        } },
    });
    expect(wrapper.text()).toContain('Sponsored true fan');
    expect(wrapper.text()).toContain('Sponsored display ad');
    expect(wrapper.text()).toContain('Organic organic');
    expect(wrapper.text().indexOf('Sponsored')).toBeLessThan(wrapper.text().indexOf('Organic'));
    expect(wrapper.text()).toContain('1');
});
