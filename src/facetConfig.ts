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
        label: 'Merk',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Materiaal',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Materiaal',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataDouble',
        dataKey: 'Dikte (mm)',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Dikte (mm)',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Kleur',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Kleur',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataDouble',
        dataKey: 'Breedte (mm)',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Breedte (mm)',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataDouble',
        dataKey: 'Lengte (mm)',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Lengte (mm)',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Voorraadartikel',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Voorraadartikel',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Materiaalgroep',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Materiaalgroep',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Productiemethode',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Productiemethode',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Foodgrade',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Foodgrade',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'LED geschikt',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'LED geschikt',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataString',
        dataKey: 'Kleurfamilie',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Kleurfamilie',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataDouble',
        dataKey: 'Brandwerend',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Brandwerend',
    },
    {
        contexts: ['Category', 'SearchOverlay', 'Brand'],
        type: 'DataDouble',
        dataKey: 'Gerecycled',
        renderType: 'Checklist',
        dataSelectionStrategy: 'Product',
        label: 'Gerecycled',
    },
    // {
    //     contexts: ['Category', 'SearchOverlay', 'Brand'],
    //     type: 'SalesPrice',
    //     renderType: 'Range',
    //     label: 'Sales Price',
    // },
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