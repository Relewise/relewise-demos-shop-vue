import type { DataSelectionStrategy } from '@relewise/client';

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

type FacetContext = 'Category' | 'SearchOverlay' | 'Brand';

type FacetType = 'BrandFacet' | 'Category' | 'DataString' | 'SalesPrice' | 'DataDouble' | 'DataDoubleRange';
type FacetRenderType = 'Checklist' | 'Range';

type BaseFacetConfigEntry = {
    contexts: FacetContext[];
    renderType: FacetRenderType;
    label: string;
};

type FacetConfigWithData = BaseFacetConfigEntry & {
    type: 'DataString' | 'DataDouble' | 'DataDoubleRange';
    dataKey: string;
    dataSelectionStrategy: DataSelectionStrategy;
};

type FacetConfigWithoutData = BaseFacetConfigEntry & {
    type: Exclude<FacetType, 'DataString' | 'DataDouble' | 'DataDoubleRange'>;
    dataKey?: never;
    dataSelectionStrategy?: never;
};

type FacetConfigEntry = FacetConfigWithData | FacetConfigWithoutData;