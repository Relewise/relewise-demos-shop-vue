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
  
import type { CheckListFacet } from '@relewise/web-components';

import contextStore from '@/stores/context.store';
  
  type FacetRenderType = 'range' | 'checklist' | 'custom';

  export type FacetConfigEntry<TFacet extends FacetResult = FacetResult> = {
    is: (facet: FacetResult) => facet is TFacet;
    render: FacetRenderType;
    apply?: (
      filters: Record<string, string | string[]>,
      facet: FacetResult
    ) => boolean;
    addToBuilder?: (
      f: any,
      filters: Record<string, string | string[]>
    ) => void;
  }; 

  function defineFacetConfig<TFacet extends FacetResult>(entry: FacetConfigEntry<TFacet>): FacetConfigEntry<TFacet> {
    return entry;
  }

export function getFacetConfigEntry(facet: unknown): FacetConfigEntry | undefined {
  if (
    facet &&
    typeof facet === 'object' &&
    ('key' in facet || 'field' in facet)
  ) {
    const typedFacet = facet as { key?: string; field?: string };
    const key = typedFacet.key ?? typedFacet.field;
    if (!key) return undefined;
    return facetConfig[key];
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

  export const facetConfig: Record<string, FacetConfigEntry> = {
    
    category: defineFacetConfig<CategoryHierarchyFacetResult>({
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

    Brand: defineFacetConfig({
      is: (facet): facet is ContentDataStringValueFacetResult =>
        facet.$type.includes('ContentDataStringValueFacetResult'),
      render: 'checklist',
      addToBuilder: (f, filters) => {
        f.addBrandFacet(filters['Brand'])
      },
    }),

    SalesPrice: defineFacetConfig<PriceRangeFacetResult>({
        is: (facet): facet is PriceRangeFacetResult =>
          facet.$type.includes('PriceRangeFacetResult'),
        render: 'range',
        apply: (filters, facet) => {
            if (!facetConfig.SalesPrice.is(facet)) return false;
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

      AvailableInChannels: defineFacetConfig({
        is: (facet): facet is ProductDataStringValueFacet =>
          'key' in facet && typeof facet.key === 'string' && facet.key.includes('AvailableInChannels'),
        render: 'checklist',
        addToBuilder: (f, filters) => {
          f.addProductDataStringValueFacet('AvailableInChannels', 'Product', filters['AvailableInChannels']);
        }
      }),

      [`${contextStore.context.value.language}_StockLevel`]: defineFacetConfig<DoubleNullableProductDataRangeFacetResult>({
        is: (facet): facet is DoubleNullableProductDataRangeFacetResult =>
          facet.$type.includes('DoubleNullableProductDataRangeFacetResult'),
        render: 'range',
        apply: (filters, facet) => {
          const key = `${contextStore.context.value.language}_StockLevel`;
          if (!facetConfig[key].is(facet)) return false;
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
  };

  export function getDefaultFilters(): Record<string, string | string[]> {
    const defaults: Record<string, string | string[]> = {    
      term: '',
      sort: '',
    };
  
    for (const [key, config] of Object.entries(facetConfig)) {
      // Initialize array-based filters for checklist and range types
      if (config.render === 'checklist' || config.render === 'range') {
        defaults[key] = [];
      }
    }
  
    return defaults;
  }

  export function getSelectedCategoryFilterIds(filters: Record<string, string | string[]>) {
    return filters['category'];
  }
  
  export function getCategoryThreshold(): number {
    return contextStore.context.value.allowThirdLevelCategories ? 3 : 2;
  }