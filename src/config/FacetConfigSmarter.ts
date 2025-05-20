// src/config/FacetConfigSmarter.ts
import rawConfig from './facets.json';
import contextStore from '@/stores/context.store';
import type {
  CategoryHierarchyFacetResult,
  ContentDataStringValueFacetResult,
  DoubleNullableProductDataRangeFacetResult,
  FacetResult,
  PriceRangeFacetResult
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

//export interface FacetDefinition<TFacet extends FacetResult = FacetResult> {
//  is: (facet: FacetResult) => facet is TFacet;
//  contexts: Record<FacetContext, FacetContextConfig>;
//}
export interface FacetDefinition<TFacet extends FacetResult = FacetResult> {
  is: (facet: FacetResult) => facet is TFacet;
  contexts: Partial<Record<FacetContext, FacetContextConfig>>;
}

export type FacetConfigMap = Record<string, FacetDefinition>;

/* ---------- Helpers for complex facets ---------- */

function createCategoryAddToBuilder(
  strategy: 'search-overlay' | 'category-page' | 'simple'
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

/* ---------- Build facetConfigMap from JSON ---------- */

export const facetConfigMap: FacetConfigMap = {};

type JsonContextConfig = {
  render: FacetRenderType;
  strategy?: 'search-overlay' | 'category-page' | 'simple';
  field?: string;
};

interface JsonFacetEntry {
  type: string;
  contexts: Partial<Record<FacetContext, JsonContextConfig>>;
}
//interface JsonFacetEntry {
//  type: string;
//  contexts: Record<FacetContext, JsonContextConfig>;
//}

const typeChecks = {
  CategoryHierarchyFacetResult: (f: FacetResult): f is CategoryHierarchyFacetResult =>
    f.$type.includes('CategoryHierarchyFacetResult'),
  ContentDataStringValueFacetResult: (f: FacetResult): f is ContentDataStringValueFacetResult =>
    f.$type.includes('ContentDataStringValueFacetResult'),
  PriceRangeFacetResult: (f: FacetResult): f is PriceRangeFacetResult =>
    f.$type.includes('PriceRangeFacetResult'),
  DoubleNullableProductDataRangeFacetResult: (
    f: FacetResult
  ): f is DoubleNullableProductDataRangeFacetResult =>
    f.$type.includes('DoubleNullableProductDataRangeFacetResult')
} as const;

for (const [key, value] of Object.entries(rawConfig as Record<string, JsonFacetEntry>)) {
  const facetDef: FacetDefinition = {
    is: typeChecks[value.type],
    contexts: {}
  };

  for (const [ctx, ctxConf] of Object.entries(value.contexts)) {
    let addToBuilder: FacetContextConfig['addToBuilder'];

    if (key === 'Category') {
      addToBuilder = createCategoryAddToBuilder(ctxConf.strategy as any);
    } else if (key === 'StockLevel') {
      addToBuilder = createStockLevelAddToBuilder(ctxConf.field!);
    } else if (key === 'Brand') {
      addToBuilder = (f, filters) => { f.addBrandFacet(filters['Brand']); };
    } else if (key === 'SalesPrice') {
      addToBuilder = (f, filters) => {
        f.addSalesPriceRangeFacet(
          'Product',
          filters.SalesPrice?.[0] !== undefined ? Number(filters.SalesPrice[0]) : undefined,
          filters.SalesPrice?.[1] !== undefined ? Number(filters.SalesPrice[1]) : undefined
        );
      };
    } else if (key === 'AvailableInChannels') {
      addToBuilder = (f, filters) => {
        f.addProductDataStringValueFacet(ctxConf.field!, 'Product', filters[key]);
      };
    } else {
      addToBuilder = () => {};
    }

    facetDef.contexts[ctx as FacetContext] = {
      render: ctxConf.render,
      addToBuilder
    };
  }

  facetConfigMap[key] = facetDef;
}

export function getFacetContextsForKey(key: string): FacetContext[] {
  return Object.keys(facetConfigMap[key]?.contexts ?? {}) as FacetContext[];
}

export function getFacetDefinition(
  key: string,
  context: FacetContext
): FacetContextConfig | undefined {
  return facetConfigMap[key]?.contexts?.[context];
}
