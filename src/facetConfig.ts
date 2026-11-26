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

export function getFacetFilterKeys(context: FacetContext): string[] {
    // Category listings add their category facet outside the shared configuration.
    const keys = context === 'Category' ? ['category'] : [];

    for (const facet of facetConfig) {
        if (facet.contexts.includes(context)) {
            keys.push(facet.dataKey ?? facetFilterKeys[facet.type]);
        }
    }

    return keys;
}

type FacetType = 'BrandFacet' | 'Category' | 'DataString' | 'ContentDataString' | 'SalesPrice' | 'DataDouble' | 'DataDoubleRange' | 'ContentCategory';
type FacetRenderType = 'Checklist' | 'Range';
type FacetTypeWithoutData = Exclude<FacetType, 'DataString' | 'ContentDataString' | 'DataDouble' | 'DataDoubleRange'>;

const facetFilterKeys: Record<FacetTypeWithoutData, string> = {
    BrandFacet: 'Brand',
    Category: 'category',
    ContentCategory: 'Category',
    SalesPrice: 'price',
};

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
    type: FacetTypeWithoutData;
    dataKey?: never;
    dataSelectionStrategy?: never;
};

type ContentFacetConfigWithData = BaseFacetConfigEntry & {
    type: 'ContentDataString';
    dataKey: string;
};

type FacetConfigEntry = FacetConfigWithData | FacetConfigWithoutData | ContentFacetConfigWithData;
