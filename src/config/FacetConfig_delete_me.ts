// src/config/FacetConfig.ts
import type {
  PriceRangeFacetResult,
  DoubleNullableProductDataRangeFacetResult,
  ContentDataStringValueFacetResult,
  FacetResult,
  CategoryHierarchyFacetResult,
  ProductDataStringValueFacet,
  CategoryPath,
  CategoryNameAndId,
} from '@relewise/client';

import contextStore from '@/stores/context.store';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

export const FacetContexts = {
  CategoryPage: 'category-page',
  SearchOverlay: 'search-overlay',
  ContentCategoryPage: 'content-search-overlay'
} as const;

export type FacetContext = typeof FacetContexts[keyof typeof FacetContexts];

type FacetRenderType = 'range' | 'checklist' | 'custom';

export type FacetConfigEntry<TFacet extends FacetResult = FacetResult> = {
  is: (facet: FacetResult) => facet is TFacet;
  render: FacetRenderType;
  context?: FacetContext[];
  apply?: (
    filters: Record<string, string | string[]>,
    facet: FacetResult
  ) => boolean;
  addToBuilder?: (
    f: any,
    filters: Record<string, string | string[]>,
    params?: Record<string, unknown>
  ) => void;
};

function defineFacetConfig<TFacet extends FacetResult>(entry: FacetConfigEntry<TFacet>): FacetConfigEntry<TFacet> {
  return entry;
}

export function getFacetConfigEntry(
  facet: unknown,
  context?: FacetContext
): FacetConfigEntry | undefined {
  if (
    facet &&
    typeof facet === 'object' &&
    ('key' in facet || 'field' in facet)
  ) {
    const typedFacet = facet as { key?: string; field?: string };
    const key = typedFacet.key ?? typedFacet.field;
    if (!key) return undefined;

    return facetConfig
      .filter(entry => entry.key === key)
      .find(entry =>
        !entry.config.context || !context || entry.config.context.includes(context)
      )?.config;
  }
  return undefined;
}
export function getFacetKey(facet: { key?: string; field?: string }) {
  return facet.key ?? facet.field ?? '';
}

export function facetHasKeyOrField(facet: unknown): facet is { key?: string; field?: string } {
  return (
    facet &&
    typeof facet === 'object' &&
    ('key' in facet || 'field' in facet)
  ) as boolean;
}

type FacetConfigItem = {
  key: string;
  config: FacetConfigEntry;
};

export const facetConfig: FacetConfigItem[] = [
  {
    key: 'Category',
    config: defineFacetConfig<CategoryHierarchyFacetResult>({
      context: [FacetContexts.SearchOverlay],
      is: (facet): facet is CategoryHierarchyFacetResult =>
        facet.$type.includes('CategoryHierarchyFacetResult'),
      render: 'checklist',
      addToBuilder: (f, filters) => {
        const selectedCategoryFilterIds = filters['category'];
        const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

        let selectedCategoriesForFacet: CategoryPath[] | undefined = undefined;
        if (Array.isArray(selectedCategoryFilterIds) && selectedCategoryFilterIds.length > 0) {
          if (selectedCategoryFilterIds.length < categoryFilterThreshold) {
            selectedCategoriesForFacet = [{
              breadcrumbPathStartingFromRoot: selectedCategoryFilterIds.map(id => ({ id })),
            }];
          } else {
            const basePath: CategoryNameAndId[] = selectedCategoryFilterIds.slice(0, categoryFilterThreshold).map(id => ({ id }));
            selectedCategoriesForFacet = selectedCategoryFilterIds.slice(categoryFilterThreshold).map(id => {
              const thisPath = [...basePath, { id }];
              return { breadcrumbPathStartingFromRoot: thisPath };
            });
          }
        }

        f.addProductCategoryHierarchyFacet('Descendants', selectedCategoriesForFacet, { displayName: true });
      },
    }),
  },
  {
    key: 'Category',
    config: defineFacetConfig<CategoryHierarchyFacetResult>({
      context: [FacetContexts.CategoryPage],
      is: (facet): facet is CategoryHierarchyFacetResult =>
        facet.$type.includes('CategoryHierarchyFacetResult'),
      render: 'checklist',
      addToBuilder: (f, filters, params) => {
        const categoryId = params?.categoryId as string | undefined;
        const renderCategoryLinks = params?.renderCategoryLinks as boolean;
        const routeItem = params?.routeItem as RouteLocationNormalizedLoaded | undefined;

        if (renderCategoryLinks && categoryId) {
          f.addProductCategoryHierarchyFacet('Descendants', [
            { breadcrumbPathStartingFromRoot: [{ id: categoryId }] }
          ], { displayName: true });
        } else {
          const selected = filters['Category'];
          const fallbackId = (routeItem?.name === 'sub-sub-category' && typeof routeItem.params.id === 'string')
          ? routeItem.params.id
          : undefined;
    
        const categoryValues = Array.isArray(selected) && selected.length > 0
          ? selected
          : fallbackId ? [fallbackId] : null;

          f.addCategoryFacet('ImmediateParent', categoryValues);
        }
      }
    })
  },
  {
    key: 'Category',
    config: defineFacetConfig<CategoryHierarchyFacetResult>({
      context: [FacetContexts.ContentCategoryPage],
      is: (facet): facet is CategoryHierarchyFacetResult =>
        facet.$type.includes('CategoryHierarchyFacetResult'),
      render: 'checklist',
      addToBuilder: (f, filters, params) => {
        const selected = filters['Category'];
    
        const categoryValues = Array.isArray(selected) && selected.length > 0 
          ? selected
          : null;

          f.addCategoryFacet('ImmediateParent', categoryValues);
      }
    })
  },
  {
    key: 'Brand',
    config: defineFacetConfig({
      context: [FacetContexts.SearchOverlay, FacetContexts.CategoryPage],
      is: (facet): facet is ContentDataStringValueFacetResult =>
        facet.$type.includes('ContentDataStringValueFacetResult'),
      render: 'checklist',
      addToBuilder: (f, filters) => {
        f.addBrandFacet(filters['Brand'])
      },
    }),
  },
  {
    key: 'Brand',
    config: defineFacetConfig({
      context: [FacetContexts.ContentCategoryPage],
      is: (facet): facet is ContentDataStringValueFacetResult =>
        facet.$type.includes('ContentDataStringValueFacetResult'),
      render: 'checklist',
      addToBuilder: (f, filters) => {
        f.addContentDataStringValueFacet('Brand', Array.isArray(filters['Brand']) && filters['Brand'].length > 0 ? filters['Brand'] : null);
      },
    }),
  },
  {
    key: 'SalesPrice',
    config: defineFacetConfig<PriceRangeFacetResult>({
      context: [FacetContexts.SearchOverlay, FacetContexts.CategoryPage],
      is: (facet): facet is PriceRangeFacetResult =>
        facet.$type.includes('PriceRangeFacetResult'),
      render: 'range',
      apply: (filters, facet) => {
        if (!getFacetConfigEntry(facet)) return false;
        const range = filters['SalesPrice'];
        return (
          Array.isArray(range) &&
          range.length === 2 &&
          (Number(range[0]) !== (facet as PriceRangeFacetResult).available?.value?.lowerBoundInclusive ||
            Number(range[1]) !== (facet as PriceRangeFacetResult).available?.value?.upperBoundInclusive)
        );
      },
      addToBuilder: (f, filters) => {
        f.addSalesPriceRangeFacet(
          'Product',
          filters.SalesPrice?.[0] !== undefined ? Number(filters.SalesPrice[0]) : undefined,
          filters.SalesPrice?.[1] !== undefined ? Number(filters.SalesPrice[1]) : undefined
        );
      }
    }),
  },
  {
    key: 'AvailableInChannels',
    config: defineFacetConfig({
      context: [FacetContexts.SearchOverlay, FacetContexts.CategoryPage],
      is: (facet): facet is ProductDataStringValueFacet =>
        'key' in facet && typeof facet.key === 'string' && facet.key.includes('AvailableInChannels'),
      render: 'checklist',
      addToBuilder: (f, filters) => {
        f.addProductDataStringValueFacet('AvailableInChannels', 'Product', filters['AvailableInChannels']);
      }
    }),
  },
  {
    key: `${contextStore.context.value.language}_StockLevel`,
    config: defineFacetConfig<DoubleNullableProductDataRangeFacetResult>({
      context: [FacetContexts.CategoryPage],
      is: (facet): facet is DoubleNullableProductDataRangeFacetResult =>
        facet.$type.includes('DoubleNullableProductDataRangeFacetResult'),
      render: 'range',
      apply: (filters, facet) => {
        const key = `${contextStore.context.value.language}_StockLevel`;
        if (!getFacetConfigEntry(facet)) return false;
        const range = filters[key];
        return (
          Array.isArray(range) &&
          range.length === 2 &&
          (Number(range[0]) !== (facet as DoubleNullableProductDataRangeFacetResult).available?.value?.lowerBoundInclusive ||
            Number(range[1]) !== (facet as DoubleNullableProductDataRangeFacetResult).available?.value?.upperBoundInclusive)
        );
      },
      addToBuilder: (f, filters) => {
        const key = `${contextStore.context.value.language}_StockLevel`;
        f.addProductDataDoubleRangeFacet(
          key,
          'Product',
          filters[key]?.[0] !== undefined ? Number(filters[key][0]) : undefined,
          filters[key]?.[1] !== undefined ? Number(filters[key][1]) : undefined
        );
      },
    })
  }
];

export function getFacetKeysForContext(context: FacetContext): string[] {
  return facetConfig
    .filter(entry =>
      !entry.config.context || entry.config.context.includes(context)
    )
    .map(entry => entry.key);
}