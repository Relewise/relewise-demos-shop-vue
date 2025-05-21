import type { DataSelectionStrategy } from '@relewise/client';

export type FacetContext = 'PLP' | 'SearchOverlay';

type FacetType = 'BrandFacet' | 'Category' | 'DataString' | 'SalesPrice' | 'DataDouble';
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
        contexts: ['SearchOverlay'],
        type: 'Category',
        renderType: 'Checklist',
        label: 'Category',
    },
    {
        contexts: ['PLP', 'SearchOverlay'],
        type: 'BrandFacet',
        renderType: 'Checklist',
        label: 'Brand',
    },
    {
        contexts: ['PLP', 'SearchOverlay'],
        type: 'SalesPrice',
        renderType: 'Range',
        label: 'Sales Price',
    },
    {
        contexts: ['PLP', 'SearchOverlay'],
        type: 'DataString',
        renderType: 'Checklist',
        dataKey: 'AvailableInChannels',
        dataSelectionStrategy: 'Product',
        label: 'Available In Channels',
    },
    {
        contexts: ['PLP', 'SearchOverlay'],
        type: 'DataDouble',
        renderType: 'Checklist',
        dataKey: 'da-dk_StockLevel',
        dataSelectionStrategy: 'Product',
        label: 'Stock Level',
    },
];