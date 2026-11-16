import type { Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { batchWithAdaptiveFacets } from '@/helpers/adaptiveFacets';
import router from '@/router';
import contextStore from '@/stores/context.store';
import SearchOverlay from '../SearchOverlay.vue';

vi.mock('@/router', async() => {
    const { createRouter, createMemoryHistory } = await import('vue-router');
    return { default: createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] }) };
});
vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    return { default: {
        context: ref({ serverUrl: 'https://example.invalid', datasetId: 'test', contentSearch: true }),
        activeContextRevision: ref(0), defaultSettings: { language: 'sv-se', currency: 'SEK', user: {} },
        selectedProductProperties: {}, selectedContentProperties: {}, numberOfProductsToRecommend: 5,
        getSearcher: () => ({}), assertApiCall: vi.fn(), userClassificationBasedFilters: vi.fn(),
        getRecommender: () => ({ recommendSearchTermBasedProducts: vi.fn().mockResolvedValue({ recommendations: [] }), recommendPersonalProducts: vi.fn().mockResolvedValue({ recommendations: [] }) }),
    } };
});
vi.mock('@/helpers/adaptiveFacets', () => ({ batchWithAdaptiveFacets: vi.fn() }));
vi.mock('@/helpers/facetHelper', () => ({ getFacets: vi.fn() }));
vi.mock('@/helpers/relevanceModifierHelper', () => ({ addRelevanceModifiers: vi.fn() }));
vi.mock('@/stores/globalProductFilters', () => ({ globalProductRecommendationFilters: vi.fn() }));
vi.mock('@/services/tracking.service', () => ({ default: { trackBrandView: vi.fn() } }));
vi.mock('@/services/breakpoint.service', async() => ({ default: { active: (await import('vue')).ref('desktop') } }));

const batch = vi.mocked(batchWithAdaptiveFacets);
const response = (id: string) => ({ responses: [{ hits: 1, results: [{ productId: id, rank: 1 }] }, { predictions: [] }, { hits: 0, results: [] }] });
function deferred() {
    let resolve!: (value: ReturnType<typeof response>) => void;
    const promise = new Promise<ReturnType<typeof response>>(r => { resolve = r; });
    return { promise, resolve };
}
let wrapper: ReturnType<typeof mount>;
async function query(term: string) {
    window.history.replaceState({}, '', '/?term=' + encodeURIComponent(term) + '&sort=&open=1&page=1');
    await wrapper.get('input').setValue(term);
    await wrapper.get('input').trigger('keyup');
    await flushPromises();
}
beforeEach(async() => {
    vi.clearAllMocks();
    batch.mockReset();
    HTMLElement.prototype.scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', vi.fn());
    document.body.innerHTML = '<div id="modal"></div>';
    window.history.replaceState({}, '', '/');
    await router.push('/');
    wrapper = mount(SearchOverlay, { global: { plugins: [router], stubs: {
        ProductSearchOverlayResult: { props: ['productSearchResult'], template: '<div>{{ productSearchResult.results[0]?.productId }}</div>' },
        ContentSearchOverlayResult: true,
    } } });
});
afterEach(() => { wrapper.unmount(); vi.unstubAllGlobals(); });

describe('search lifecycle', () => {
    it('uses the restored URL term when navigating within an open overlay', async() => {
        batch.mockResolvedValueOnce(response('FIRST')).mockResolvedValueOnce(response('RESTORED'));
        await query('first');
        window.history.replaceState({}, '', '/?term=restored&sort=&open=1&page=1');
        await router.push('/?term=restored&sort=&open=1&page=1');
        await flushPromises();
        expect(wrapper.get('input').element.value).toBe('restored');
        expect(document.body.textContent).toContain('RESTORED');
    });

    it('clears old results on failure and allows retry without showing a no-result fallback', async() => {
        batch.mockResolvedValueOnce(response('OLD')).mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(response('NEW'));
        await query('old');
        expect(document.body.textContent).toContain('OLD');
        await query('new');
        expect(document.body.textContent).not.toContain('OLD');
        expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('Search could not be loaded');
        expect(document.body.textContent).not.toContain('No products found');
        (document.body.querySelector('[role="alert"] button') as HTMLButtonElement).click();
        await flushPromises();
        expect(document.body.textContent).toContain('NEW');
        expect(document.body.querySelector('[role="alert"]')).toBeNull();
    });

    it('ignores a superseded response even if its transport resolves after cancellation', async() => {
        const old = deferred();
        batch.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response('LATEST'));
        await query('first');
        expect(document.body.querySelector('[role="status"]')).not.toBeNull();
        await query('second');
        old.resolve(response('STALE'));
        await flushPromises();
        expect(document.body.textContent).toContain('LATEST');
        expect(document.body.textContent).not.toContain('STALE');
    });

    it('clears prior results while a changed company context is loading', async() => {
        const next = deferred();
        batch.mockResolvedValueOnce(response('OLD')).mockReturnValueOnce(next.promise);
        await query('pipe');
        (contextStore.activeContextRevision as Ref<number>).value++;
        await flushPromises();
        expect(document.body.textContent).not.toContain('OLD');
        expect(document.body.querySelector('[role="status"]')).not.toBeNull();
        next.resolve(response('NEW-CONTEXT'));
        await flushPromises();
        expect(document.body.textContent).toContain('NEW-CONTEXT');
    });
});
