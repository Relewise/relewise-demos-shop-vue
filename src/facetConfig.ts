import type { DataSelectionStrategy } from '@relewise/client';

export type FacetContext = 'Category' | 'SearchOverlay' | 'Brand';

type FacetType = 'BrandFacet' | 'Category' | 'DataString' | 'SalesPrice' | 'DataDouble' | 'DataDoubleRange';
type FacetRenderType = 'Checklist' | 'Range';

type FacetConfigEntry = {
    contexts: FacetContext[],
    type: FacetType;
    renderType: FacetRenderType;
    label: string;
    dataKey?: string;
    dataSelectionStrategy?: DataSelectionStrategy;
}

export const facetConfig: FacetConfigEntry[] = [
    {
        contexts: ['SearchOverlay', 'Brand'],
        type: 'Category',
        renderType: 'Checklist',
        label: 'Category',
    },
    {
        contexts: ['Category', 'SearchOverlay'],
        type: 'BrandFacet',
        renderType: 'Checklist',
        label: 'Brand',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'SalesPrice',
        renderType: 'Range',
        label: 'Sales Price',
    },
];