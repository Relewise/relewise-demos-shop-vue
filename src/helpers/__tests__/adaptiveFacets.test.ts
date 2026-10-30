import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ProductSearchBuilder,
    SearchCollectionBuilder,
    SearchTermPredictionBuilder,
    UserFactory,
    type Searcher,
} from '@relewise/client';
import {
    addAdaptiveFacet,
    apiFacetRequest,
    attributeFromIdentity,
    batchWithAdaptiveFacets,
    discoveryKey,
    FacetDiscoveryCache,
    facetIdentity,
    invalidateFacetDiscovery,
    prepareProductSearch,
    rankAttributes,
    searchWithAdaptiveFacets,
} from '../adaptiveFacets';

const settings = {
    language: 'en',
    currency: 'EUR',
    displayedAtLocation: 'Search',
    user: UserFactory.anonymous(),
};
const signal = () => new AbortController().signal;
const product = (data: Record<string, unknown>) => ({
    data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, { value }]),
    ),
});
const sample = [
    product({ material: ['steel', 'steel'], size: 10 }),
    product({ material: 'wood', size: 'large' }),
];
const request = (term: string | null = 'tools') =>
    new ProductSearchBuilder(settings)
        .setTerm(term)
        .facets((f) => {
            f.addBrandFacet();
            f.addSalesPriceRangeFacet('Product');
        })
        .build();
const fakeSearcher = (results: any[] = sample) => ({
    searchProducts: vi.fn().mockResolvedValue({ results }),
});
const memoryStorage = () => {
    const entries: Record<string, any> = {};
    return {
        get: vi.fn(async(key: string) => ({ [key]: entries[key] })),
        set: vi.fn(async(value: object) => {
            Object.assign(entries, value);
        }),
        remove: vi.fn(async(key: string) => {
            delete entries[key];
        }),
    };
};
const diagnostic = vi.fn();

beforeEach(() => {
    sessionStorage.clear();
    invalidateFacetDiscovery();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
});
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('adaptive facet ranking', () => {
    it('ranks coverage and diversity; deduplicates lists and excludes empty or internal data', () => {
        const results = rankAttributes([
            product({
                material: ['steel', 'steel'],
                constant: 'same',
                sparse: 'a',
                image_url: 'one',
                description: 'one',
                demo_marker: 'a',
                empty: '',
                id: 'a',
                productId: 'a',
                productLink: 'https://example.com/a',
                manufacturerPartNumber: 'a',
                internal_marker: 'a',
            }),
            product({
                material: { $values: ['wood'] },
                constant: 'same',
                image_url: 'two',
                description: 'two',
                demo_marker: 'b',
                empty: null,
                id: 'b',
                productId: 'b',
                productLink: 'https://example.com/b',
                manufacturerPartNumber: 'b',
                internal_marker: 'b',
            }),
        ]);
        expect(results).toEqual([
            '__adaptive:String:material',
            '__adaptive:String:sparse',
        ]);
    });
    it('retains mixed scalar types under one canonical key, with independent control identities', () => {
        expect(rankAttributes(sample)).toEqual([
            '__adaptive:String:material',
            '__adaptive:Double:size',
            '__adaptive:String:size',
        ]);
        expect(
            attributeFromIdentity(
                facetIdentity({ key: 'key:with:colons', type: 'Boolean' }),
            ),
        ).toEqual({ key: 'key:with:colons', type: 'Boolean' });
    });
    it('uses deterministic key order for ties and budgets ten keys, not ten aliases', () => {
        const data = Object.fromEntries(
            Array.from({ length: 15 }, (_, index) => [
                `key${String(index).padStart(2, '0')}`,
                index,
            ]),
        );
        const results = rankAttributes([
            product(data),
            product(
                Object.fromEntries(
                    Object.keys(data).map((key) => [key, 'other']),
                ),
            ),
        ]);
        expect(results).toHaveLength(20);
        expect(
            new Set(
                results.map((identity) => attributeFromIdentity(identity)!.key),
            ).size,
        ).toBe(10);
        expect(results[results.length - 1]).toBe('__adaptive:String:key09');
        expect(rankAttributes([])).toEqual([]);
    });
});

describe('request preparation', () => {
    it('discovers anonymously with selected facets, filters and channel; leaves display pagination and identity intact', async() => {
        const original = new ProductSearchBuilder({
            ...settings,
            user: UserFactory.byAuthenticatedId('private-user', undefined, {
                channel: { name: 'web' },
            }),
        })
            .setTerm(' tools ')
            .pagination((p) => p.setPageSize(20).setPage(3))
            .filters((f) =>
                f.addProductCategoryIdFilter('Ancestor', 'category'),
            )
            .sorting((s) => s.sortByProductPopularity())
            .facets((f) => {
                f.addBrandFacet(['brand']);
                f.addSalesPriceRangeFacet('Product');
                addAdaptiveFacet(f, { key: 'size', type: 'Double' }, ['10']);
            })
            .build();
        const searcher = fakeSearcher();
        const prepared = await prepareProductSearch(
            original,
            searcher,
            'dataset',
            signal(),
        );
        const probe = searcher.searchProducts.mock.calls[0]![0];
        expect(probe).toMatchObject({
            term: 'tools',
            skip: 0,
            take: 50,
            user: { channel: { name: 'web' } },
            filters: original.filters,
        });
        expect(probe.user).not.toHaveProperty('authenticatedId');
        expect(probe.sorting).toBeUndefined();
        expect(probe.retailMedia).toBeUndefined();
        expect(probe.facets.items).toHaveLength(2);
        expect(probe.facets.items[1]).toMatchObject({
            key: 'size',
            selected: [10],
        });
        expect(probe.settings.selectedProductProperties).toMatchObject({
            allData: true,
            allVariants: false,
            displayName: false,
            pricing: false,
        });
        expect(prepared.request).toMatchObject({
            term: original.term,
            skip: original.skip,
            take: original.take,
            user: original.user,
            sorting: original.sorting,
        });
        expect(
            prepared.request.facets!.items!.some(
                (item: any) =>
                    item.key === '__adaptive:Double:size' &&
                    item.selected[0] === 10,
            ),
        ).toBe(true);
    });
    it('reuses discovery across page and sort changes, but isolates filters and namespaces', async() => {
        const searcher = fakeSearcher();
        const original = request();
        await prepareProductSearch(original, searcher, 'dataset', signal());
        await prepareProductSearch(
            {
                ...original,
                skip: 100,
                sorting: { type: 'ProductPopularity' } as any,
            },
            searcher,
            'dataset',
            signal(),
        );
        expect(searcher.searchProducts).toHaveBeenCalledTimes(1);
        await prepareProductSearch(
            { ...original, term: 'tool' },
            searcher,
            'dataset',
            signal(),
        );
        await prepareProductSearch(
            original,
            searcher,
            'other-dataset',
            signal(),
        );
        expect(searcher.searchProducts).toHaveBeenCalledTimes(3);
    });
    it('discovers on category PLPs with no term; short terms bypass probes', async() => {
        const searcher = fakeSearcher();
        const short = await prepareProductSearch(
            request('ab'),
            searcher,
            'dataset',
            signal(),
        );
        expect(searcher.searchProducts).not.toHaveBeenCalled();
        expect(short.request.facets!.items.length).toBe(12);
        await prepareProductSearch(
            request(null),
            searcher,
            'dataset',
            signal(),
        );
        expect(searcher.searchProducts).toHaveBeenCalledOnce();
    });
    it('keeps pinned facets outside the budget, restores mixed aliases and does not invent sample counts', async() => {
        const original = request();
        const selected = new ProductSearchBuilder(settings)
            .facets((f) =>
                addAdaptiveFacet(f, { key: 'pinned', type: 'String' }, [
                    'chosen',
                ]),
            )
            .build().facets!.items;
        original.facets!.items.push(...selected);
        const prepared = await prepareProductSearch(
            original,
            fakeSearcher([]),
            'dataset',
            signal(),
        );
        expect(prepared.request.facets!.items).toHaveLength(3);
        const response = {
            hits: 0,
            results: [],
            facets: {
                items: [
                    { field: 'Brand' },
                    { field: 'SalesPrice' },
                    {
                        field: 'Data',
                        key: 'pinned',
                        available: [
                            { value: 'chosen', hits: 0, selected: true },
                        ],
                    },
                ],
            },
        } as any;
        expect(prepared.restore(response)?.facets?.items?.[2]).toMatchObject({
            key: '__adaptive:String:pinned',
            available: [{ hits: 0 }],
        });
        expect(prepared.restore(response)?.hits).toBe(0);
        expect(apiFacetRequest(prepared.request).facets.items[2].key).toBe(
            'pinned',
        );
    });
    it('runs a final product search even when discovery is empty and preserves batch response order', async() => {
        const searcher = {
            searchProducts: vi.fn().mockResolvedValue({ results: [] }),
            batch: vi.fn().mockResolvedValue({
                responses: [{ hits: 7 }, { predictions: ['example'] }],
            }),
        } as unknown as Searcher;
        await searchWithAdaptiveFacets(
            searcher,
            request(),
            'dataset',
            signal(),
        );
        expect(searcher.searchProducts).toHaveBeenCalledTimes(2);
        const batch = new SearchCollectionBuilder()
            .addRequest(request())
            .addRequest(
                new SearchTermPredictionBuilder(settings)
                    .setTerm('tools')
                    .build(),
            )
            .build();
        const response = await batchWithAdaptiveFacets(
            searcher,
            batch,
            'dataset',
            signal(),
        );
        expect(response?.responses).toEqual([
            { hits: 7 },
            { predictions: ['example'] },
        ]);
        const predictionOnly = { ...batch, requests: [batch.requests[1]!] };
        vi.mocked(searcher.batch).mockResolvedValueOnce({
            responses: [{ predictions: [] }],
        } as any);
        await batchWithAdaptiveFacets(
            searcher,
            predictionOnly,
            'dataset',
            signal(),
        );
        expect(searcher.searchProducts).toHaveBeenCalledTimes(2);
    });
});

describe('selection and cancellation boundaries', () => {
    it('reconsiders keys when filters are selected or cleared, without prefix or language sharing', async() => {
        const searcher = fakeSearcher();
        const base = request('tools');
        const filtered = new ProductSearchBuilder(settings)
            .setTerm('tools')
            .facets((f) => {
                f.addBrandFacet();
                addAdaptiveFacet(f, { key: 'material', type: 'String' }, [
                    'Steel',
                ]);
            })
            .build();
        await prepareProductSearch(base, searcher, 'dataset', signal());
        await prepareProductSearch(filtered, searcher, 'dataset', signal());
        await prepareProductSearch(base, searcher, 'dataset', signal());
        expect(searcher.searchProducts).toHaveBeenCalledTimes(2);
        await prepareProductSearch(
            { ...base, language: { value: 'fr' } },
            searcher,
            'dataset',
            signal(),
        );
        await prepareProductSearch(
            { ...base, term: 'tool' },
            searcher,
            'dataset',
            signal(),
        );
        expect(searcher.searchProducts).toHaveBeenCalledTimes(4);
    });
    it('does not start the display stage when discovery is canceled', async() => {
        const controller = new AbortController();
        const searcher = {
            searchProducts: vi.fn(() => new Promise(() => {})),
        } as unknown as Searcher;
        const pending = searchWithAdaptiveFacets(
            searcher,
            request(),
            'dataset',
            controller.signal,
        ).catch((error) => error.name);
        await vi.waitFor(() =>
            expect(searcher.searchProducts).toHaveBeenCalledOnce(),
        );
        controller.abort();
        expect(await pending).toBe('AbortError');
        expect(searcher.searchProducts).toHaveBeenCalledOnce();
    });
    it('restores each mixed-type response to the matching URL identity', async() => {
        const prepared = await prepareProductSearch(
            request(),
            fakeSearcher(),
            'dataset',
            signal(),
        );
        const wire = apiFacetRequest(prepared.request);
        const response = prepared.restore({
            facets: {
                items: wire.facets.items.map((facet: any) => ({
                    field: facet.field,
                    key: facet.key,
                    available: [],
                })),
            },
        } as any);
        const keys = response?.facets?.items
            ?.filter((facet: any) => facet.field === 'Data')
            .map((facet: any) => facet.key);
        expect(keys).toEqual([
            '__adaptive:String:material',
            '__adaptive:Double:size',
            '__adaptive:String:size',
        ]);
    });
    it('never returns a stale final response after cancellation', async() => {
        const controller = new AbortController();
        let finish!: (value: any) => void;
        const searcher = {
            searchProducts: vi
                .fn()
                .mockResolvedValueOnce({ results: [] })
                .mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            finish = resolve;
                        }),
                ),
        } as unknown as Searcher;
        const pending = searchWithAdaptiveFacets(
            searcher,
            request(),
            'dataset',
            controller.signal,
        ).catch((error) => error.name);
        await vi.waitFor(() =>
            expect(searcher.searchProducts).toHaveBeenCalledTimes(2),
        );
        controller.abort();
        finish({ results: [], hits: 0 });
        expect(await pending).toBe('AbortError');
    });
});

describe('discovery cache', () => {
    it('hashes canonical request objects without storing terms or values in keys', async() => {
        expect(await discoveryKey('dataset', { b: 2, a: 1 })).toBe(
            await discoveryKey('dataset', { a: 1, b: 2 }),
        );
        expect(await discoveryKey('dataset', { term: 'private' })).toMatch(
            /^[0-9a-f]{64}$/,
        );
    });
    it('persists only identities and expires successes after ten minutes across instances', async() => {
        let now = 0;
        const storage = memoryStorage();
        const cache = new FacetDiscoveryCache(storage, () => now);
        const run = vi.fn(async() => ['__adaptive:String:material']);
        await cache.get('hash', signal(), run, diagnostic);
        await new FacetDiscoveryCache(storage, () => now).get(
            'hash',
            signal(),
            run,
            diagnostic,
        );
        expect(run).toHaveBeenCalledOnce();
        now = 600001;
        await cache.get('hash', signal(), run, diagnostic);
        expect(run).toHaveBeenCalledTimes(2);
        expect(JSON.stringify(storage.set.mock.calls)).not.toContain('results');
    });
    it('uses a 30 second failure cache and a two second timeout', async() => {
        vi.useFakeTimers();
        let now = 0;
        const cache = new FacetDiscoveryCache(memoryStorage(), () => now);
        const run = vi.fn(() => new Promise<string[]>(() => {}));
        const pending = cache.get('hash', signal(), run, diagnostic);
        await vi.advanceTimersByTimeAsync(2001);
        expect(await pending).toContain('__adaptive:String:material');
        await cache.get('hash', signal(), run, diagnostic);
        expect(run).toHaveBeenCalledOnce();
        now = 30001;
        const retry = cache.get('hash', signal(), run, diagnostic);
        await vi.advanceTimersByTimeAsync(2001);
        await retry;
        expect(run).toHaveBeenCalledTimes(2);
    });
    it('deduplicates consumers; aborting one does not cancel the remaining search', async() => {
        const cache = new FacetDiscoveryCache(memoryStorage());
        let finish!: (value: string[]) => void;
        let probeSignal!: AbortSignal;
        const run = vi.fn((signal: AbortSignal) => {
            probeSignal = signal;
            return new Promise<string[]>((resolve) => {
                finish = resolve;
            });
        });
        const first = new AbortController();
        const a = cache
            .get('hash', first.signal, run, diagnostic)
            .catch((error) => error.name);
        const b = cache.get('hash', signal(), run, diagnostic);
        await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
        first.abort();
        expect(await a).toBe('AbortError');
        expect(probeSignal.aborted).toBe(false);
        finish(['__adaptive:String:material']);
        expect(await b).toEqual(['__adaptive:String:material']);
    });
    it('cancels abandoned probes and prevents cache writes after invalidation', async() => {
        const storage = memoryStorage();
        const cache = new FacetDiscoveryCache(storage);
        const controller = new AbortController();
        let probeSignal!: AbortSignal;
        const run = vi.fn((signal: AbortSignal) => {
            probeSignal = signal;
            return new Promise<string[]>(() => {});
        });
        const pending = cache
            .get('hash', controller.signal, run, diagnostic)
            .catch((error) => error.name);
        await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
        controller.abort();
        expect(await pending).toBe('AbortError');
        expect(probeSignal.aborted).toBe(true);
        cache.invalidate();
        await Promise.resolve();
        expect(storage.set).not.toHaveBeenCalled();
    });
    it('invalidates a shared discovery and allows a fresh lookup', async() => {
        const cache = new FacetDiscoveryCache(memoryStorage());
        const run = vi.fn(() => new Promise<string[]>(() => {}));
        const pending = cache
            .get('hash', signal(), run, diagnostic)
            .catch((error) => error.name);
        await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
        cache.invalidate();
        expect(await pending).toBe('AbortError');
        const fresh = await cache.get(
            'hash',
            signal(),
            async() => ['fresh-identity'],
            diagnostic,
        );
        expect(fresh).toEqual(['fresh-identity']);
    });
    it('evicts the least recently used identities above 200 entries', async() => {
        const now = 0;
        const cache = new FacetDiscoveryCache(memoryStorage(), () => now);
        const run = vi.fn(async() => ['identity']);
        for (let i = 0; i < 200; i++)
            await cache.get(String(i), signal(), run, diagnostic);
        await cache.get('0', signal(), run, diagnostic);
        await cache.get('200', signal(), run, diagnostic);
        await cache.get('0', signal(), run, diagnostic);
        expect(run).toHaveBeenCalledTimes(201);
        await cache.get('1', signal(), run, diagnostic);
        expect(run).toHaveBeenCalledTimes(202);
    });
});

describe('variant-owned discovery', () => {
    const rows = [
        { productId: 'family-a', ...product({ forbidden_parent_only: 'one' }), variant: { variantId: 'article-a', ...product({ length: '293 mm', diameter: '20 mm', AvailableInMarkets: ['se'], SoldOut: false }) } },
        { productId: 'family-a', ...product({ forbidden_parent_only: 'two' }), variant: { variantId: 'article-b', ...product({ length: '325 mm', diameter: '30 mm', AvailableInMarkets: ['fi'], SoldOut: true }) } },
    ];
    it('ranks physical article data without parent unions or operational fields', () => {
        const keys = rankAttributes(rows, true);
        expect(keys).toEqual(['__adaptive:String:diameter', '__adaptive:String:length']);
        expect(rankAttributes([...rows, rows[0]], true)).toEqual(keys);
        expect(rankAttributes([product({ material: 'steel' })], true)).toEqual([]);
    });
    it('requests article data and produces only variant-scoped generated controls', async() => {
        const searcher = fakeSearcher(rows);
        const prepared = await prepareProductSearch(request(), searcher as any, 'variant-catalogue', signal(), true);
        const probe = searcher.searchProducts.mock.calls[0]![0] as any;
        expect(probe.settings.selectedProductProperties.allData).toBe(false);
        expect(probe.settings.selectedVariantProperties.allData).toBe(true);
        expect(probe.settings.variantRequestSettings.maxVariantsPerProduct).toBe(5);
        const attributes = prepared.request.facets!.items!.filter((item: any) => item.field === 'Data');
        expect(attributes).toHaveLength(2);
        expect(attributes.every((item: any) => item.dataSelectionStrategy === 'Variant')).toBe(true);
        expect(attributes.map((item: any) => item.key)).not.toContain('__adaptive:String:forbidden_parent_only');
    });
    it('keeps selected article controls variant-scoped through API alias conversion', () => {
        const built = new ProductSearchBuilder(settings).facets(f => addAdaptiveFacet(f, { key: 'length', type: 'String' }, ['293 mm'], 'Variant')).build();
        expect(apiFacetRequest(built).facets.items[0]).toMatchObject({ key: 'length', dataSelectionStrategy: 'Variant', selected: ['293 mm'] });
    });
});

describe('explicit facet publication policy', () => {
    it('keeps PDP-only attributes and price facets out of search controls', async() => {
        const rows = [
            { productId: 'family-a', ...product({}), variant: { variantId: 'a', ...product({ length_mm: 293, colour: 'White', pdp_only_specification: 'one', ...Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['a_pdp_' + i, 'one'])) }) } },
            { productId: 'family-b', ...product({}), variant: { variantId: 'b', ...product({ length_mm: 325, colour: 'Black', pdp_only_specification: 'two', ...Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['a_pdp_' + i, 'two'])) }) } },
        ];
        const searcher = fakeSearcher(rows);
        const prepared = await prepareProductSearch(request(), searcher as any, 'policy-catalogue', signal(), true, { dataKeys: ['length_mm'], includePriceFacets: false });
        const facets = prepared.request.facets!.items! as any[];
        expect(facets.some(facet => facet.field === 'SalesPrice')).toBe(false);
        expect(facets.filter(facet => facet.field === 'Data').map(facet => facet.key)).toEqual(['__adaptive:Double:length_mm']);
        expect(facets.some(facet => facet.key?.includes('pdp_only_specification'))).toBe(false);
    });
});
