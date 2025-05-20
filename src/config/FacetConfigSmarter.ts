// src/config/FacetConfigSmarter.ts
import rawConfig from './facets.json';
import contextStore from '@/stores/context.store';
import type {
    CategoryHierarchyFacetResult,
    ContentDataStringValueFacetResult,
    DoubleNullableProductDataRangeFacetResult,
    FacetResult,
    PriceRangeFacetResult,
    ProductDataStringValueFacet
} from '@relewise/client';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

/* Facet contexts */
export const FacetContexts = {
    CategoryPage: 'category-page',
    SearchOverlay: 'search-overlay',
    ContentCategoryPage: 'content-search-overlay'
} as const;
export type FacetContext = typeof FacetContexts[keyof typeof FacetContexts];

type FacetRenderType = 'range' | 'checklist';

export interface FacetContextConfig {
    render: FacetRenderType;
    addToBuilder: (
        f: any,
        filters: Record<string, string | string[]>,
        params?: Record<string, unknown>
    ) => void;
}

export interface FacetDefinition<TFacet extends FacetResult = FacetResult> {
    is: (facet: FacetResult) => facet is TFacet;
    contexts: Partial<Record<FacetContext, FacetContextConfig>>;
}

export type FacetConfigMap = Record<string, FacetDefinition>;

/* ---------- Helpers for complex facets ---------- */

function createCategoryAddToBuilder(
    strategy: 'search-overlay' | 'category-page' | 'content-search-overlay' | 'simple'
): FacetContextConfig['addToBuilder'] {
    if (strategy === 'search-overlay') {
        return (f, filters) => {
            const selectedCategoryFilterIds = filters['category'];
            const threshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

            let selectedCategories: { breadcrumbPathStartingFromRoot: { id: string }[] }[] | undefined;
            if (Array.isArray(selectedCategoryFilterIds) && selectedCategoryFilterIds.length > 0) {
                if (selectedCategoryFilterIds.length < threshold) {
                    selectedCategories = [{
                        breadcrumbPathStartingFromRoot: selectedCategoryFilterIds.map(id => ({ id }))
                    }];
                } else {
                    const basePath = selectedCategoryFilterIds.slice(0, threshold).map(id => ({ id }));
                    selectedCategories = selectedCategoryFilterIds.slice(threshold).map(id => ({
                        breadcrumbPathStartingFromRoot: [...basePath, { id }]
                    }));
                }
            }

            f.addProductCategoryHierarchyFacet('Descendants', selectedCategories, { displayName: true });
        };
    }

    if (strategy === 'category-page') {
        return (f, filters, params) => {
            const categoryId = params?.categoryId as string | undefined;
            const renderCategoryLinks = params?.renderCategoryLinks as boolean;
            const routeItem = params?.routeItem as RouteLocationNormalizedLoaded | undefined;

            if (renderCategoryLinks && categoryId) {
                f.addProductCategoryHierarchyFacet('Descendants', [
                    { breadcrumbPathStartingFromRoot: [{ id: categoryId }] }
                ], { displayName: true });
            } else {
                const selected = filters['Category'];
                const fallbackId = (
                    routeItem?.name === 'sub-sub-category' &&
                    typeof routeItem.params.id === 'string'
                ) ? routeItem.params.id : undefined;

                const categoryValues = Array.isArray(selected) && selected.length > 0
                    ? selected
                    : fallbackId ? [fallbackId] : null;

                f.addCategoryFacet('ImmediateParent', categoryValues);
            }
        };
    }

    if (strategy === 'content-search-overlay') {
        return (f, filters) => {
            const selected = filters['Category'];

            const categoryValues = Array.isArray(selected) && selected.length > 0
                ? selected
                : null;

            f.addCategoryFacet('ImmediateParent', categoryValues);
        };
    }

    // simple fallback
    return (f, filters) => {
        const selected = filters['Category'];
        const categoryValues = Array.isArray(selected) && selected.length > 0 ? selected : null;
        f.addCategoryFacet('ImmediateParent', categoryValues);
    };
}

function createStockLevelAddToBuilder(field: string): FacetContextConfig['addToBuilder'] {
    return (f, filters) => {
        const key = `${contextStore.context.value.language}_${field}`;
        f.addProductDataDoubleRangeFacet(
            key,
            'Product',
            filters[key]?.[0] !== undefined ? Number(filters[key][0]) : undefined,
            filters[key]?.[1] !== undefined ? Number(filters[key][1]) : undefined
        );
    };
}

function createBrandAddToBuilder(ctx: string): FacetContextConfig['addToBuilder'] {
    if (ctx === FacetContexts.ContentCategoryPage) {
        return (f, filters) => {
            f.addProductDataStringValueFacet('Brand', 'Product', filters['Brand']);
        };
    }

    return (f, filters) => {
        f.addBrandFacet(filters['Brand']);
    };
}


/* ---------- Build facetConfigMap from JSON ---------- */

export const facetConfigMap: FacetConfigMap = {};

type JsonContextConfig = {
    render: FacetRenderType;
    strategy?: 'search-overlay' | 'category-page' | 'simple';
    field?: string;
};

type FacetType =
    | 'CategoryHierarchyFacetResult'
    | 'ContentDataStringValueFacetResult'
    | 'PriceRangeFacetResult'
    | 'ProductDataStringValueFacet'
    | 'DoubleNullableProductDataRangeFacetResult';

interface JsonFacetEntry {
    type: FacetType;
    contexts: Partial<Record<FacetContext, JsonContextConfig>>;
}

const typeChecks: Record<FacetType, FacetDefinition['is']> = {
    CategoryHierarchyFacetResult: (f: FacetResult): f is CategoryHierarchyFacetResult =>
        f.$type.includes('CategoryHierarchyFacetResult'),
    ContentDataStringValueFacetResult: (f: FacetResult): f is ContentDataStringValueFacetResult =>
        f.$type.includes('ContentDataStringValueFacetResult'),
    PriceRangeFacetResult: (f: FacetResult): f is PriceRangeFacetResult =>
        f.$type.includes('PriceRangeFacetResult'),
    ProductDataStringValueFacet: (f: FacetResult): f is ProductDataStringValueFacet =>
        'key' in f && typeof (f as any).key === 'string' && (f as any).key.includes('AvailableInChannels'),
    DoubleNullableProductDataRangeFacetResult: (
        f: FacetResult
    ): f is DoubleNullableProductDataRangeFacetResult =>
        f.$type.includes('DoubleNullableProductDataRangeFacetResult')
} as const;

const addToBuilderFactory: Record<string,
    (ctx: string, conf: JsonContextConfig, key: string) => FacetContextConfig['addToBuilder']
> = {
    Category: (_ctx, conf, _key) => createCategoryAddToBuilder(conf.strategy as any),
    StockLevel: (_ctx, conf, _key) => createStockLevelAddToBuilder(conf.field!),
    Brand: (ctx, _conf, _key) => createBrandAddToBuilder(ctx),
    SalesPrice: (_ctx, _conf, _key) => (f, filters) =>
        f.addSalesPriceRangeFacet(
            'Product',
            filters.SalesPrice?.[0] !== undefined ? Number(filters.SalesPrice[0]) : undefined,
            filters.SalesPrice?.[1] !== undefined ? Number(filters.SalesPrice[1]) : undefined
        ),
    AvailableInChannels: (_ctx, conf, key) => (f, filters) =>
        f.addProductDataStringValueFacet(conf.field!, 'Product', filters[key]),
};

for (const [key, value] of Object.entries(rawConfig as Record<string, JsonFacetEntry>)) {
    facetConfigMap[key] = {
        is: typeChecks[value.type],
        contexts: Object.fromEntries(
            Object.entries(value.contexts).map(([ctx, conf]) => [
                ctx,
                {
                    render: conf.render,
                    addToBuilder: addToBuilderFactory[key]?.(ctx, conf, key) ?? (() => { })
                }
            ])
        )
    };
}

export function getFacetContextsForKey(key: string): FacetContext[] {
    return Object.keys(facetConfigMap[key]?.contexts ?? {}) as FacetContext[];
}

export function getFacetKeysForContext(context: FacetContext): string[] {
    return Object.entries(facetConfigMap)
        .filter(([, def]) => def.contexts[context])
        .map(([key]) => key);
}

export function getFacetDefinition(
    key: string,
    context: FacetContext
): FacetContextConfig | undefined {
    return facetConfigMap[key]?.contexts?.[context];
}
