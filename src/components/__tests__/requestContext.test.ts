import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { Recommender, Searcher, type SearchRequestCollection } from '@relewise/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import context from '@/stores/context.store';
import router from '@/router';
import SearchOverlay from '@/components/SearchOverlay.vue';
import Category from '@/views/Category.vue';

vi.mock('@/helpers/contextApi', async importOriginal => ({
    ...await importOriginal<typeof import('@/helpers/contextApi')>(),
    initializeWebComponentsForDataset: vi.fn(),
}));
vi.mock('@/router', async() => {
    const { createRouter, createWebHistory } = await import('vue-router');
    return { default: createRouter({
        history: createWebHistory(),
        routes: [{ path: '/', component: {} }, { path: '/category/:id', component: {} }],
    }) };
});
vi.mock('@/services/tracking.service', () => ({
    default: { trackProductCategoryView: vi.fn(), trackBrandView: vi.fn() },
}));
vi.mock('@/services/breakpoint.service', async() => {
    const { ref } = await import('vue');
    return { default: { active: ref('desktop') } };
});

const empty = { recommendations: [] };
const product = { productId: 'allowed', rank: 1 };
let wrapper: VueWrapper | undefined;
let batch: MockInstance<Searcher['batch']>;
let term: MockInstance<Recommender['recommendSearchTermBasedProducts']>;
let personal: MockInstance<Recommender['recommendPersonalProducts']>;

function select(second = false) {
    context.applySessionContext({
        datasetId: 'offline-fixture', language: second ? 'de' : 'en', currencyCode: second ? 'USD' : 'EUR',
        selectedUserIndex: second ? 1 : 0, selectedCompanyId: second ? 'second' : 'first',
    });
}

function expectContext(request: unknown, second = false, recommendation = false) {
    expect(request).toMatchObject({
        language: { value: second ? 'de' : 'en' }, currency: { value: second ? 'USD' : 'EUR' },
        [recommendation ? 'displayedAtLocationType' : 'displayedAtLocation']: 'Relewise Demo Store',
        user: {
            temporaryId: second ? 'shopper-two' : 'shopper-one',
            company: { id: second ? 'second' : 'first' },
            classifications: { country: second ? 'DE' : 'GB', channel: second ? 'store' : 'web' },
        },
    });
    expect((request as { user: object }).user).not.toHaveProperty('companyIds');
    expect((request as { user: { company: object } }).user.company).not.toHaveProperty('assortmentIds');
}

function expectAvailability(request: unknown, second = false, soldOut = false) {
    const items = (request as { filters: { items: unknown[] } }).filters.items;
    const eligibility = items.filter(item => {
        const filter = item as { assortments?: number[]; key?: string };
        return filter.assortments || ['AvailableInMarkets', 'AvailableInChannels', 'SoldOut'].includes(filter.key ?? '');
    });
    const dataFilter = (key: string, value: string, contains: boolean) => ({
        $type: 'Relewise.Client.Requests.Filters.ProductDataFilter, Relewise.Client',
        key, filterOutIfKeyIsNotFound: contains, mustMatchAllConditions: true, negated: false, settings: null,
        conditions: { items: [{
            $type: `Relewise.Client.Requests.Conditions.${contains ? 'Contains' : 'Equals'}Condition, Relewise.Client`,
            value: { type: 'String', value, isCollection: false }, negated: false,
            ...(contains ? { valueCollectionEvaluationMode: 'All' } : {}),
        }] },
    });
    expect(eligibility).toEqual([
        ...(soldOut ? [dataFilter('SoldOut', 'false', false)] : []),
        { $type: 'Relewise.Client.Requests.Filters.ProductAssortmentFilter, Relewise.Client',
            assortments: [second ? 22 : 11], negated: false, settings: null },
        dataFilter('AvailableInMarkets', second ? 'DE' : 'GB', true),
        dataFilter('AvailableInChannels', second ? 'store' : 'web', true),
    ]);
}

async function search(query = 'missing') {
    await router.replace('/');
    await router.push({ path: '/', query: { open: '1', term: query } });
    await flushPromises();
}

beforeEach(async() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network is forbidden in payload tests'); }));
    vi.stubGlobal('scrollTo', vi.fn());
    context.addDataset({
        datasetId: 'offline-fixture', apiKey: 'fixture-key', serverUrl: 'https://offline.invalid',
        allLanguages: ['en', 'de'], allCurrencies: ['EUR', 'USD'],
        trackingEnabled: false, userClassificationFilters: true, hideSoldOutProducts: true,
        users: [
            { temporaryId: 'shopper-one', classifications: { country: 'GB', channel: 'web' } },
            { temporaryId: 'shopper-two', classifications: { country: 'DE', channel: 'store' } },
        ],
        companies: [{ id: 'first', assortmentIds: [11] }, { id: 'second', assortmentIds: [22] }],
    });
    select();
    batch = vi.spyOn(Searcher.prototype, 'batch').mockResolvedValue({ responses: [
        { hits: 0, results: [] }, { predictions: [] }, { hits: 0, results: [] },
    ] });
    term = vi.spyOn(Recommender.prototype, 'recommendSearchTermBasedProducts').mockResolvedValue(empty);
    personal = vi.spyOn(Recommender.prototype, 'recommendPersonalProducts').mockResolvedValue(empty);
    await router.replace('/');
});

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
});

describe('offline request context payloads', () => {
    it('uses the switched context in all three searches and both zero-hit fallbacks', async() => {
        wrapper = shallowMount(SearchOverlay, { global: { plugins: [router] } });
        for (const second of [false, true]) {
            select(second);
            await search();
            const collection = batch.mock.calls[batch.mock.calls.length - 1]![0] as SearchRequestCollection;
            expect(collection.requests).toHaveLength(3);
            collection.requests!.forEach(request => expectContext(request, second));
            expectAvailability(collection.requests![0], second);
            expectAvailability(collection.requests![1], second, true);
            // Content search has separate content facets, not product eligibility filters.
            expect(collection.requests![2]).toHaveProperty('filters', null);
            for (const call of [term.mock.calls[term.mock.calls.length - 1]!, personal.mock.calls[personal.mock.calls.length - 1]!]) {
                expectContext(call[0], second, true);
                expectAvailability(call[0], second, true);
            }
        }
        expect(batch).toHaveBeenCalledTimes(2);
        expectContext(batch.mock.calls[0]![0].requests![0]);
        expectContext(term.mock.calls[0]![0], false, true);
        expectContext(personal.mock.calls[0]![0], false, true);
        expect(term).toHaveBeenCalledTimes(2);
        expect(personal).toHaveBeenCalledTimes(2);
        expect(term.mock.invocationCallOrder[0]).toBeLessThan(personal.mock.invocationCallOrder[0]!);
    });

    it('does not request personal recommendations when the term fallback has results', async() => {
        term.mockResolvedValue({ recommendations: [product] });
        wrapper = shallowMount(SearchOverlay, { global: { plugins: [router] } });
        await search();
        expect(batch).toHaveBeenCalledTimes(1);
        expect(term).toHaveBeenCalledTimes(1);
        expect(term.mock.calls[0]![0]).toMatchObject({ term: 'missing' });
        expect(personal).not.toHaveBeenCalled();
    });

    it('skips the term fallback for a blank query', async() => {
        wrapper = shallowMount(SearchOverlay, { global: { plugins: [router] } });
        await search('');
        expect(batch).toHaveBeenCalledTimes(1);
        expect(term).not.toHaveBeenCalled();
        expect(personal).toHaveBeenCalledTimes(1);
        expectAvailability(personal.mock.calls[0]![0], false, true);
    });

    it('does not call either fallback when product search has hits', async() => {
        batch.mockResolvedValue({ responses: [{ hits: 1, results: [product] }, { predictions: [] }, { hits: 0, results: [] }] });
        wrapper = shallowMount(SearchOverlay, { global: { plugins: [router] } });
        await search();
        expect(batch).toHaveBeenCalledTimes(1);
        expect(term).not.toHaveBeenCalled();
        expect(personal).not.toHaveBeenCalled();
    });

    it('uses the switched context and assortment in category product payloads', async() => {
        const products = vi.spyOn(Searcher.prototype, 'searchProducts').mockResolvedValue({ hits: 0, results: [] });
        const categories = vi.spyOn(Searcher.prototype, 'searchProductCategories').mockResolvedValue({ hits: 0, results: [] });
        for (const second of [false, true]) {
            select(second);
            await router.replace('/category/tools');
            wrapper = shallowMount(Category, { global: { plugins: [router] } });
            await flushPromises();
            expectContext(categories.mock.calls[categories.mock.calls.length - 1]![0], second);
            expectContext(products.mock.calls[products.mock.calls.length - 1]![0], second);
            expectAvailability(products.mock.calls[products.mock.calls.length - 1]![0], second);
            wrapper.unmount();
            wrapper = undefined;
        }
        expect(products).toHaveBeenCalledTimes(2);
        expect(categories).toHaveBeenCalledTimes(2);
    });
});
