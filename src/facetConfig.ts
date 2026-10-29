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
    {
        contexts: ['ContentSearch'],
        type: 'ContentCategory',
        renderType: 'Checklist',
        label: 'Content Category',
    },
    {
        contexts: ['ContentSearch'],
        type: 'ContentDataString',
        renderType: 'Checklist',
        label: 'Brand',
        dataKey: 'Brand',
    },
];

export type FacetContext = 'Category' | 'SearchOverlay' | 'Brand' | 'ContentSearch';

type FacetType = 'BrandFacet' | 'Category' | 'DataString' | 'ContentDataString' | 'SalesPrice' | 'DataDouble' | 'DataDoubleRange' | 'ContentCategory';
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

type ContentFacetConfigWithData = BaseFacetConfigEntry & {
    type: 'ContentDataString';
    dataKey: string;
};

type FacetConfigEntry = FacetConfigWithData | FacetConfigWithoutData | ContentFacetConfigWithData;
// Article-only facets never fall back to a parent value or combine sibling specifications.
export const articleFacetConfig: FacetConfigEntry[] = ['material', 'length', 'diameter'].map(dataKey => ({
    contexts: ['Category', 'SearchOverlay', 'Brand'], type: 'DataString', renderType: 'Checklist',
    label: dataKey.charAt(0).toUpperCase() + dataKey.slice(1), dataKey, dataSelectionStrategy: 'Variant',
}));
