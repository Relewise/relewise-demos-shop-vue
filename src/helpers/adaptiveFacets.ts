import {
    ProductSearchBuilder,
    UserFactory,
    type ProductSearchRequest,
    type ProductSearchResponse,
    type SearchRequestCollection,
    type SearchResponseCollection,
    type Searcher,
    type FacetBuilder,
} from '@relewise/client';

export const fallbackKeys = [
    'material',
    'color',
    'size',
    'diameter',
    'length',
    'width',
    'height',
    'thickness',
    'surface_protection',
    'type',
];
const excluded =
    /^(?:demo_|source_|internal_|search_terms$|(?:additional_)?information$)|(?:article_numbers?|product_numbers?|product_ids|gtins?$|image|link|description|provenance|manufacturer_part_number|supplier_code|product_code|barcode|(?:^|_)(?:sku|ean|mpn)$|(?:^|_)urls?$|(?:^|_)ids?$|contract|search_config)/i;
const prefix = '__adaptive:';
type AttributeType = 'String' | 'Double' | 'Boolean';
type Attribute = { key: string; type: AttributeType };
export const facetIdentity = ({ key, type }: Attribute) =>
    `${prefix}${type}:${key}`;
export function attributeFromIdentity(identity: string): Attribute | undefined {
    const match = /^__adaptive:(String|Double|Boolean):(.+)$/.exec(identity);
    return match
        ? { type: match[1] as AttributeType, key: match[2]! }
        : undefined;
}
const selected = (facet: any) =>
    Array.isArray(facet.selected)
        ? facet.selected.length > 0
        : facet.selected != null;
const aborted = () => new DOMException('Search canceled', 'AbortError');
function check(signal: AbortSignal) {
    if (signal.aborted) throw aborted();
}
function abortable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) return Promise.reject(aborted());
    return new Promise((resolve, reject) => {
        const abort = () => {
            signal.removeEventListener('abort', abort);
            reject(aborted());
        };
        signal.addEventListener('abort', abort, { once: true });
        task.then(
            (value) => {
                signal.removeEventListener('abort', abort);
                resolve(value);
            },
            (error) => {
                signal.removeEventListener('abort', abort);
                reject(error);
            },
        );
    });
}

// Count a value once per base product, including scalar and wrapped list values.
export function rankAttributes(products: any[]): string[] {
    const keys = [
        ...new Set<string>(
            products.flatMap((product) => Object.keys(product.data ?? {})),
        ),
    ]
        .filter((key) => !excluded.test(key.replace(/([a-z0-9])([A-Z])/g, '$1_$2')))
        .sort();
    return keys
        .map((key, index) => {
            let coverage = 0;
            const counts = new Map<string, number>();
            const types = new Set<AttributeType>();
            for (const product of products) {
                const value = product.data?.[key]?.value;
                const values = Array.isArray(value)
                    ? value
                    : Array.isArray(value?.$values)
                      ? value.$values
                      : [value];
                const unique = new Set<string>();
                for (const item of values) {
                    if (typeof item === 'string' && item.trim()) {
                        types.add('String');
                        unique.add('string:' + item);
                    }
                    if (typeof item === 'number' && Number.isFinite(item)) {
                        types.add('Double');
                        unique.add('number:' + item);
                    }
                    if (typeof item === 'boolean') {
                        types.add('Boolean');
                        unique.add('boolean:' + item);
                    }
                }
                if (unique.size) coverage++;
                for (const item of unique)
                    counts.set(item, (counts.get(item) ?? 0) + 1);
            }
            const score =
                (coverage / products.length) *
                (1 - Math.max(0, ...counts.values()) / products.length);
            return { key, index, score, types };
        })
        .filter((attribute) => attribute.score > 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, 10)
        .flatMap((attribute) =>
            [...attribute.types]
                .sort()
                .map((type) => facetIdentity({ key: attribute.key, type })),
        );
}

const canonical = (v: any): any =>
    Array.isArray(v)
        ? v.map(canonical)
        : v && typeof v === 'object'
          ? Object.fromEntries(
                Object.keys(v)
                    .sort()
                    .filter((k) => v[k] !== undefined)
                    .map((k) => [k, canonical(v[k])]),
            )
          : v;
export async function discoveryKey(namespace: string, request: any) {
    const bytes = new TextEncoder().encode(
        JSON.stringify([storageKey, namespace, canonical(request)]),
    );
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
}
type Entry = { keys: string[]; expires: number; used: number; failed: boolean };
type StorageArea = {
    get(key: string): Promise<any>;
    set(value: object): Promise<void>;
    remove(key: string): Promise<void>;
};
const storageKey = 'adaptive-facets-v1';
export class FacetDiscoveryCache {
    private entries: Record<string, Entry> = {};
    private loaded?: Promise<void>;
    private writes = Promise.resolve();
    private epoch = 0;
    private lastUsed = 0;
    private touch() {
        this.lastUsed = Math.max(this.lastUsed + 1, this.now());
        return this.lastUsed;
    }
    private flights = new Map<
        string,
        {
            controller: AbortController;
            task: Promise<string[]>;
            consumers: number;
            settled: boolean;
        }
    >();
    constructor(
        private storage: StorageArea,
        private now = () => Date.now(),
        private timeout = 2000,
    ) {}
    private persist(epoch: number) {
        const snapshot = JSON.parse(JSON.stringify(this.entries));
        this.writes = this.writes
            .catch(() => {})
            .then(async() => {
                if (epoch === this.epoch)
                    await this.storage.set({ [storageKey]: snapshot });
            })
            .catch(() => {});
        return this.writes;
    }
    invalidate() {
        this.epoch++;
        for (const f of this.flights.values()) f.controller.abort();
        this.flights.clear();
        this.entries = {};
        this.writes = this.writes
            .catch(() => {})
            .then(() => this.storage.remove(storageKey))
            .catch(() => {});
    }
    async get(
        key: string,
        signal: AbortSignal,
        run: (signal: AbortSignal) => Promise<string[]>,
        diagnostic: (code: string, status: string) => void,
    ): Promise<string[]> {
        const epoch = this.epoch;
        this.loaded ??= this.storage
            .get(storageKey)
            .then((result) => {
                if (epoch === this.epoch)
                    this.entries = result[storageKey] ?? {};
                this.lastUsed = Math.max(
                    0,
                    ...Object.values(this.entries).map((entry) => entry.used),
                );
            })
            .catch(() => {});
        await this.loaded;
        check(signal);
        if (epoch !== this.epoch) throw aborted();
        const hit = this.entries[key];
        if (hit && hit.expires > this.now()) {
            hit.used = this.touch();
            diagnostic('facet-cache', hit.failed ? 'failure-hit' : 'hit');
            await this.persist(epoch);
            check(signal);
            if (epoch !== this.epoch) throw aborted();
            return hit.keys;
        }
        diagnostic('facet-cache', 'miss');
        let flight = this.flights.get(key);
        if (!flight) {
            const controller = new AbortController();
            flight = {
                controller,
                consumers: 0,
                settled: false,
                task: Promise.resolve([]),
            };
            const work = flight;
            work.task = Promise.resolve()
                .then(async() => {
                    const start = this.now();
                    let timeout = false,
                        failed = false,
                        keys: string[];
                    const timer = setTimeout(() => {
                        timeout = true;
                        controller.abort();
                    }, this.timeout);
                    try {
                        keys = await abortable(
                            run(controller.signal),
                            controller.signal,
                        );
                    } catch (error) {
                        if (controller.signal.aborted && !timeout) throw error;
                        keys = fallbackKeys.map((key) =>
                            facetIdentity({ key, type: 'String' }),
                        );
                        failed = true;
                    } finally {
                        clearTimeout(timer);
                    }
                    if (
                        epoch !== this.epoch ||
                        (controller.signal.aborted && !timeout)
                    )
                        throw aborted();
                    diagnostic(
                        'facet-discovery',
                        (failed ? (timeout ? 'timeout' : 'failed') : 'ok') +
                            ':' +
                            Math.max(0, this.now() - start) +
                            'ms',
                    );
                    this.entries[key] = {
                        keys,
                        used: this.touch(),
                        expires: this.now() + (failed ? 30000 : 600000),
                        failed,
                    };
                    for (const [k, e] of Object.entries(this.entries))
                        if (e.expires <= this.now()) delete this.entries[k];
                    const ordered = Object.keys(this.entries).sort(
                        (a, b) => this.entries[b].used - this.entries[a].used,
                    );
                    for (const k of ordered.slice(200)) delete this.entries[k];
                    await this.persist(epoch);
                    if (epoch !== this.epoch) throw aborted();
                    return keys;
                })
                .finally(() => {
                    work.settled = true;
                    if (this.flights.get(key) === work)
                        this.flights.delete(key);
                });
            this.flights.set(key, work);
        }
        const consumer = flight;
        consumer.consumers++;
        try {
            return await abortable(consumer.task, signal);
        } finally {
            consumer.consumers--;
            if (!consumer.consumers && !consumer.settled) {
                consumer.controller.abort();
                if (this.flights.get(key) === consumer)
                    this.flights.delete(key);
            }
        }
    }
}

let cache: FacetDiscoveryCache | undefined;
export function invalidateFacetDiscovery() {
    cache?.invalidate();
}

export function addAdaptiveFacet(
    builder: FacetBuilder,
    attribute: Attribute,
    values: string[] = [],
) {
    const alias = facetIdentity(attribute);
    const settings = {
        alwaysIncludeSelectedInAvailable: true,
        includeZeroHitsInAvailable: false,
    };
    if (attribute.type === 'Double')
        builder.addProductDataDoubleValueFacet(
            alias,
            'Product',
            values.map(Number).filter(Number.isFinite),
            'Or',
            settings,
        );
    else if (attribute.type === 'Boolean')
        builder.addProductDataBooleanValueFacet(
            alias,
            'Product',
            values.map((value) => value === 'true'),
            'Or',
            settings,
        );
    else
        builder.addProductDataStringValueFacet(
            alias,
            'Product',
            values,
            'Or',
            settings,
        );
}

export function addSelectedAdaptiveFacets(
    builder: FacetBuilder,
    filters: Record<string, string | string[]>,
) {
    for (const [identity, values] of Object.entries(filters)) {
        const attribute = attributeFromIdentity(identity);
        if (attribute && Array.isArray(values) && values.length)
            addAdaptiveFacet(builder, attribute, values);
    }
}

export function apiFacetRequest(request: any) {
    if (!request.facets) return request;
    return {
        ...request,
        facets: {
            ...request.facets,
            items: request.facets.items.map((facet: any) => {
                const attribute =
                    typeof facet.key === 'string'
                        ? attributeFromIdentity(facet.key)
                        : undefined;
                return attribute ? { ...facet, key: attribute.key } : facet;
            }),
        },
    };
}

const sessionStorageArea: StorageArea = {
    async get(key) {
        const value = sessionStorage.getItem(key);
        return value ? { [key]: JSON.parse(value) } : {};
    },
    async set(value) {
        for (const [key, entry] of Object.entries(value))
            sessionStorage.setItem(key, JSON.stringify(entry));
    },
    async remove(key) {
        sessionStorage.removeItem(key);
    },
};

type PreparedProductSearch = {
    request: ProductSearchRequest;
    restore(
        response: ProductSearchResponse | undefined,
    ): ProductSearchResponse | undefined;
};
export async function prepareProductSearch(
    request: ProductSearchRequest,
    searcher: Pick<Searcher, 'searchProducts'>,
    namespace: string,
    signal: AbortSignal,
): Promise<PreparedProductSearch> {
    const original = request.facets?.items ?? [];
    if (!original.length) return { request, restore: (response) => response };
    const pinned = original.filter(selected);
    const discoverySettings = new ProductSearchBuilder({
        user: UserFactory.anonymous(),
        displayedAtLocation: 'FacetDiscovery',
        language: request.language?.value ?? '',
        currency: request.currency?.value ?? '',
    })
        .setSelectedProductProperties({
            allData: true,
            allVariants: false,
            displayName: false,
            pricing: false,
            brand: false,
            categoryPaths: false,
            assortments: false,
            variantResolution: false,
        })
        .build().settings!;
    // No catalogue schema is shipped with the demo. Discover data types from base
    // product data; keep explicit filters and selected facet queries authoritative.
    const probe: ProductSearchRequest = {
        ...request,
        term: request.term?.trim() || null,
        skip: 0,
        take: 50,
        sorting: undefined,
        retailMedia: undefined,
        user: UserFactory.anonymous(
            request.user?.channel
                ? { channel: request.user.channel }
                : undefined,
        ),
        facets: pinned.length
            ? { ...request.facets!, items: pinned }
            : undefined,
        settings: {
            ...discoverySettings,
            ...request.settings,
            selectedProductProperties:
                discoverySettings.selectedProductProperties,
            selectedVariantProperties: undefined,
            variantRequestSettings: undefined,
        },
    };
    let identities = fallbackKeys.map((key) =>
        facetIdentity({ key, type: 'String' }),
    );
    if (!probe.term || probe.term.length >= 3) {
        cache ??= new FacetDiscoveryCache(sessionStorageArea);
        const key = await discoveryKey(namespace, apiFacetRequest(probe));
        check(signal);
        identities = await cache.get(
            key,
            signal,
            async(probeSignal) => {
                const response = await searcher.searchProducts(
                    apiFacetRequest(probe),
                    { abortSignal: probeSignal },
                );
                check(probeSignal);
                if (!response || !Array.isArray(response.results))
                    throw new Error('Invalid discovery response');
                return rankAttributes(response.results.slice(0, 50));
            },
            (code, status) => console.debug('[adaptive-facets]', code, status),
        );
    }
    check(signal);
    const identityForFacet = (facet: any) => {
        if (typeof facet.key !== 'string') return undefined;
        if (attributeFromIdentity(facet.key)) return facet.key;
        const type = facet.$type?.includes('Double')
            ? 'Double'
            : facet.$type?.includes('Boolean')
              ? 'Boolean'
              : 'String';
        return facetIdentity({ key: facet.key, type });
    };
    const retained = original.filter(
        (facet) =>
            facet.field !== 'Data' ||
            selected(facet) ||
            identities.includes(identityForFacet(facet) ?? ''),
    );
    const retainedKeys = new Set(retained.map(identityForFacet));
    const additional =
        new ProductSearchBuilder({
            user: UserFactory.anonymous(),
            displayedAtLocation: 'FacetDiscovery',
            language: request.language?.value ?? '',
            currency: request.currency?.value ?? '',
        })
            .facets((builder) => {
                for (const identity of identities) {
                    const attribute = attributeFromIdentity(identity);
                    if (attribute && !retainedKeys.has(identity))
                        addAdaptiveFacet(builder, attribute);
                }
            })
            .build().facets?.items ?? [];
    const items = [
        ...retained.filter((facet) => facet.field !== 'Data'),
        ...[
            ...retained.filter((facet) => facet.field === 'Data'),
            ...additional,
        ].sort((a: any, b: any) => {
            const aKey = attributeFromIdentity(a.key)?.key ?? a.key;
            const bKey = attributeFromIdentity(b.key)?.key ?? b.key;
            return aKey < bKey
                ? -1
                : aKey > bKey
                  ? 1
                  : a.$type < b.$type
                    ? -1
                    : a.$type > b.$type
                      ? 1
                      : 0;
        }),
    ];
    console.debug('[adaptive-facets]', 'facet-selected', items.length);
    return {
        request: { ...request, facets: { ...request.facets!, items } },
        restore(response) {
            if (!response?.facets) return response;
            return {
                ...response,
                facets: {
                    ...response.facets,
                    items: response.facets.items?.map((facet, index) => {
                        const source = items[index];
                        return source && 'key' in source
                            ? { ...facet, key: source.key }
                            : facet;
                    }),
                },
            };
        },
    };
}

export async function searchWithAdaptiveFacets(
    searcher: Searcher,
    request: ProductSearchRequest,
    namespace: string,
    signal: AbortSignal,
) {
    const prepared = await prepareProductSearch(
        request,
        searcher,
        namespace,
        signal,
    );
    check(signal);
    const response = await searcher.searchProducts(
        apiFacetRequest(prepared.request),
        { abortSignal: signal },
    );
    check(signal);
    return prepared.restore(response);
}

export async function batchWithAdaptiveFacets(
    searcher: Searcher,
    request: SearchRequestCollection,
    namespace: string,
    signal: AbortSignal,
) {
    const prepared = await Promise.all(
        request.requests.map((item) =>
            item.$type?.includes('.ProductSearchRequest,')
                ? prepareProductSearch(
                      item as ProductSearchRequest,
                      searcher,
                      namespace,
                      signal,
                  )
                : { request: item, restore: (response: any) => response },
        ),
    );
    check(signal);
    const response = await searcher.batch(
        {
            ...request,
            requests: prepared.map((item) => apiFacetRequest(item.request)),
        },
        { abortSignal: signal },
    );
    check(signal);
    return response
        ? ({
              ...response,
              responses: response.responses?.map((item, index) =>
                  prepared[index]!.restore(item as ProductSearchResponse),
              ),
          } as SearchResponseCollection)
        : undefined;
}
