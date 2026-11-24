import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { ProductSearchRequest, SearchRequestCollection } from '@relewise/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import router from '@/router';
import SearchOverlay from '@/components/SearchOverlay.vue';
import Category from '@/views/Category.vue';
import { facetConfig } from '@/facetConfig';

const api = vi.hoisted(() => ({
    batch: vi.fn<(request: SearchRequestCollection) => Promise<unknown>>(),
    searchProducts: vi.fn<(request: ProductSearchRequest) => Promise<unknown>>(),
    searchProductCategories: vi.fn(),
    recommendSearchTermBasedProducts: vi.fn(),
    recommendPersonalProducts: vi.fn(),
}));

vi.mock('@/router', async() => {
    const { createRouter, createWebHistory } = await import('vue-router');
    const emptyView = { render: () => null };
    return {
        default: createRouter({
            history: createWebHistory(),
            routes: [
                { path: '/', component: emptyView },
                { path: '/category/:id', component: emptyView },
            ],
        }),
    };
});

vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    return {
        default: {
            context: ref({ contentSearch: true }),
            defaultSettings: { language: 'en', currency: 'EUR', user: {}, displayedAtLocation: 'Test' },
            selectedProductProperties: {},
            selectedContentProperties: {},
            numberOfProductsToRecommend: 5,
            assertApiCall: vi.fn(),
            getSearcher: () => api,
            getRecommender: () => api,
            userClassificationBasedFilters: vi.fn(),
        },
    };
});

vi.mock('@/services/tracking.service', () => ({
    default: { trackProductCategoryView: vi.fn(), trackBrandView: vi.fn() },
}));

vi.mock('@/services/breakpoint.service', async() => {
    const { ref } = await import('vue');
    return { default: { active: ref('desktop') } };
});

const noProducts = { hits: 0, results: [] };
const withProducts = { hits: 85, results: [] };
const categoryPriceFacets = {
    items: [{ field: 'Category', nodes: [] }, {
        field: 'SalesPrice',
        available: { value: { lowerBoundInclusive: 0, upperBoundInclusive: 100 } },
    }],
};
let wrapper: VueWrapper | undefined;

function searchResponse(products = noProducts, content = noProducts) {
    return { responses: [products, { predictions: [] }, content] };
}

function resetButton(view: VueWrapper) {
    return view.findAll('button').find(button => button.text() === 'Reset filters');
}

async function reset(view: VueWrapper) {
    const button = resetButton(view);
    expect(button).toBeDefined();
    await button!.trigger('click');
    await flushPromises();
}

function mountSearch() {
    return mount(SearchOverlay, {
        global: { plugins: [router], stubs: { Teleport: true, PopularCategories: true } },
    });
}

beforeEach(async() => {
    vi.resetAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
    await router.replace('/');
});

afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
});

describe('Reset filters', () => {
    it('recovers product search from zero hits and resets the URL and page together', async() => {
        api.batch.mockResolvedValueOnce(searchResponse()).mockResolvedValue(searchResponse(withProducts));
        wrapper = mountSearch();
        await router.push('/?open=1&term=shoes&sort=Popular&page=3&Brand=a&Brand=b&category=sports&price=50&price=75');
        await flushPromises();

        expect(wrapper.text()).toContain('No products found');
        expect(api.batch.mock.calls[0]?.[0].requests?.[0]).toMatchObject({ skip: 80 });
        await reset(wrapper);

        expect(router.currentRoute.value.query).toEqual({ open: '1', term: 'shoes', sort: 'Popular', page: '1' });
        expect(api.batch).toHaveBeenCalledTimes(2);
        expect(api.batch.mock.lastCall?.[0].requests?.[0]).toMatchObject({ term: 'shoes', skip: 0 });
        expect(wrapper.text()).not.toContain('No products found');
        expect(resetButton(wrapper)).toBeUndefined();
    });

    it('keeps the page scoped to the named brand when resetting its facets', async() => {
        api.batch.mockResolvedValue(searchResponse());
        wrapper = mountSearch();
        await router.push('/?open=1&brand=acme&brandName=Acme&price=50&price=75');
        await flushPromises();

        await reset(wrapper);

        const query = new URLSearchParams(window.location.search);
        expect(query.get('open')).toBe('1');
        expect(query.get('brand')).toBe('acme');
        expect(query.get('brandName')).toBe('Acme');
        expect(router.currentRoute.value.query).not.toHaveProperty('price');
        expect(resetButton(wrapper)).toBeUndefined();
    });

    it('shows reset on the content tab with zero hits and no facet response', async() => {
        api.batch.mockResolvedValue(searchResponse(withProducts));
        wrapper = mountSearch();
        await router.push('/?open=1&term=guide');
        await flushPromises();
        const contentTab = wrapper.findAll('div').find(item => item.text() === 'Content (0)');
        await contentTab!.trigger('click');
        await router.replace('/?open=1&term=guide&Category=guides&Brand=acme');
        await flushPromises();

        expect(wrapper.text()).toContain('No content found');
        await reset(wrapper);

        expect(router.currentRoute.value.query).toEqual({ open: '1', term: 'guide', sort: '', page: '1' });
        expect(resetButton(wrapper)).toBeUndefined();
    });

    it('recovers a category listing with an empty facet response', async() => {
        api.searchProductCategories.mockResolvedValue({ results: [{ categoryId: 'outdoor', displayName: 'Outdoor' }] });
        api.searchProducts.mockResolvedValueOnce({ ...noProducts, facets: { items: [] } }).mockResolvedValue(withProducts);
        await router.push('/category/outdoor?sort=Popular&page=3&Brand=a&price=50&price=75');
        wrapper = mount(Category, { global: { plugins: [router], stubs: { Breadcrumb: true } } });
        await flushPromises();

        await reset(wrapper);

        expect(router.currentRoute.value.path).toBe('/category/outdoor');
        expect(router.currentRoute.value.query).toEqual({ sort: 'Popular' });
        expect(api.searchProducts).toHaveBeenCalledTimes(2);
        expect(api.searchProducts.mock.lastCall?.[0]).toMatchObject({
            skip: 0,
            filters: { items: [{ categoryIds: ['outdoor'] }] },
        });
        expect(wrapper.text()).toContain('of 85 products');
        expect(resetButton(wrapper)).toBeUndefined();
    });

    it('commits decimal price bounds on change and preserves drafts during result updates', async() => {
        const result = { ...withProducts, facets: categoryPriceFacets };
        let resolvePreviousSearch!: (response: typeof result) => void;
        const previousSearch = new Promise<typeof result>(resolve => { resolvePreviousSearch = resolve; });
        api.searchProductCategories.mockResolvedValue({ results: [{ categoryId: 'outdoor' }] });
        api.searchProducts
            .mockResolvedValueOnce(structuredClone(result))
            .mockReturnValueOnce(previousSearch)
            .mockResolvedValue(structuredClone(result));
        await router.push('/category/outdoor?price=5&price=100');
        wrapper = mount(Category, { global: { plugins: [router], stubs: { Breadcrumb: true } } });
        await flushPromises();

        const [minimum, maximum] = wrapper.findAll('input');
        minimum!.element.value = '9.';
        await minimum!.trigger('input');
        await flushPromises();
        expect(minimum!.element.value).toBe('9.');
        expect(router.currentRoute.value.query.price).toEqual(['5', '100']);
        expect(api.searchProducts).toHaveBeenCalledTimes(1);

        await minimum!.setValue('9.5');
        await flushPromises();
        expect(api.searchProducts).toHaveBeenCalledTimes(2);

        maximum!.element.value = '85.';
        await maximum!.trigger('input');
        resolvePreviousSearch(structuredClone(result));
        await flushPromises();

        expect(maximum!.element.value).toBe('85.');
        expect(router.currentRoute.value.query.price).toEqual(['9.5', '100']);
        expect(api.searchProducts).toHaveBeenCalledTimes(2);

        await maximum!.setValue('85.5');
        await flushPromises();
        expect(router.currentRoute.value.query.price).toEqual(['9.5', '85.5']);
        expect(api.searchProducts).toHaveBeenCalledTimes(3);
    });

    it('restores the price slider and searches once when resetting from a later category page', async() => {
        api.searchProductCategories.mockResolvedValue({ results: [{ categoryId: 'outdoor' }] });
        api.searchProducts.mockResolvedValue({ ...withProducts, facets: categoryPriceFacets });
        await router.push('/category/outdoor');
        wrapper = mount(Category, { global: { plugins: [router], stubs: { Breadcrumb: true } } });
        await flushPromises();

        expect(resetButton(wrapper)).toBeUndefined();
        await wrapper.get('input').setValue('50');
        await flushPromises();
        expect(router.currentRoute.value.query.price).toEqual(['50', '100']);

        const nextPage = wrapper.findAll('button').find(button => button.text() === 'Next');
        await nextPage!.trigger('click');
        await flushPromises();
        expect(api.searchProducts.mock.lastCall?.[0].skip).toBe(40);
        expect(wrapper.findAll('input').map(input => input.element.value)).toEqual(['50', '100']);

        const searchesBeforeReset = api.searchProducts.mock.calls.length;
        await reset(wrapper);

        expect(api.searchProducts).toHaveBeenCalledTimes(searchesBeforeReset + 1);
        expect(api.searchProducts.mock.lastCall?.[0].skip).toBe(0);
        expect(wrapper.findAll('input').map(input => input.element.value)).toEqual(['0', '100']);
        expect(resetButton(wrapper)).toBeUndefined();
    });
});

describe('Numeric facet selections', () => {
    it('selects and deselects zero and decimal values across URL updates', async() => {
        facetConfig.push({
            contexts: ['SearchOverlay'],
            type: 'DataDouble',
            renderType: 'Checklist',
            label: 'Weight',
            dataKey: 'Weight',
            dataSelectionStrategy: 'VariantWithFallbackToProduct',
        });

        try {
            api.batch.mockImplementation(async request => {
                const productRequest = request.requests?.[0] as ProductSearchRequest | undefined;
                const weight = productRequest?.facets?.items?.find(facet => 'key' in facet && facet.key === 'Weight');
                const selected: unknown[] = weight && 'selected' in weight && Array.isArray(weight.selected) ? weight.selected : [];
                const available = [0, 2.5].map(value => ({ value, selected: selected.some(option => option === value), hits: 1 }));
                const facets = { items: [{ field: 'Data', key: 'Weight', available }] };
                const products = { ...withProducts, facets };
                return searchResponse(products);
            });
            wrapper = mountSearch();
            await router.push('/?open=1&term=boots');
            await flushPromises();

            for (const value of [0, 2.5]) {
                const selector = `input[type="checkbox"][value="${value}"]`;
                await wrapper.get(selector).trigger('click');
                await flushPromises();
                expect(new URLSearchParams(window.location.search).getAll('Weight')).toEqual([String(value)]);
                expect(api.batch.mock.lastCall?.[0].requests?.[0]).toMatchObject({
                    facets: { items: expect.arrayContaining([expect.objectContaining({ key: 'Weight', selected: [value] })]) },
                });

                await wrapper.get(selector).trigger('click');
                await flushPromises();
                expect(new URLSearchParams(window.location.search).has('Weight')).toBe(false);
                expect(api.batch.mock.lastCall?.[0].requests?.[0]).toMatchObject({
                    facets: { items: expect.arrayContaining([expect.objectContaining({ key: 'Weight', selected: null })]) },
                });
            }
        } finally {
            facetConfig.pop();
        }
    });
});
