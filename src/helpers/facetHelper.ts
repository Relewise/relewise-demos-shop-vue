import contextStore from '@/stores/context.store';
import { GetProductFacet, type BrandFacetResult, type CategoryFacetResult, type CategoryHierarchyFacetResult, type CategoryNameAndId, type CategoryPath, type ContentAssortmentFacetResult, type ContentDataBooleanValueFacetResult, type ContentDataDoubleRangeFacetResult, type ContentDataDoubleRangesFacetResult, type ContentDataDoubleValueFacetResult, type ContentDataIntegerValueFacetResult, type ContentDataObjectFacetResult, type ContentDataStringValueFacetResult, type DataObjectBooleanValueFacetResult, type DataObjectDoubleRangeFacetResult, type DataObjectDoubleRangesFacetResult, type DataObjectDoubleValueFacetResult, type DataObjectFacetResult, type DataObjectStringValueFacetResult, type DataSelectionStrategy, type FacetBuilder, type PriceRangeFacetResult, type PriceRangesFacetResult, type ProductAssortmentFacetResult, type ProductCategoryAssortmentFacetResult, type ProductCategoryDataBooleanValueFacetResult, type ProductCategoryDataDoubleRangeFacetResult, type ProductCategoryDataDoubleRangesFacetResult, type ProductCategoryDataDoubleValueFacetResult, type ProductCategoryDataObjectFacetResult, type ProductCategoryDataStringValueFacetResult, type ProductDataBooleanValueFacetResult, type ProductDataDoubleRangeFacetResult, type ProductDataDoubleRangesFacetResult, type ProductDataDoubleValueFacetResult, type ProductDataIntegerValueFacetResult, type ProductDataObjectFacetResult, type ProductDataStringValueFacetResult, type ProductFacetResult, type RecentlyPurchasedFacetResult, type VariantSpecificationFacetResult } from '@relewise/client';

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

const defaultFacetConfiguration: FacetConfigEntry[] = [
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
    
export function getFacets(
    context: FacetContext,
    facetBuilder: FacetBuilder,
    filters: Record<string, string | string[]>, 
    facets: ProductFacetResult | null | undefined) {

    const facetConfig = defaultFacetConfiguration;

    const facetsToAdd = facetConfig.filter(x => x.contexts.includes(context));

    facetsToAdd.forEach(facetToAdd => {
        switch(facetToAdd.type) {
        case 'BrandFacet':
            addBrandFacet(facetBuilder, filters);
            break;
        case 'Category':
            addCategoryFacet(facetBuilder, filters);
            break;
        case 'DataString':
            addDataStringFacet(facetToAdd.dataKey, facetToAdd.dataSelectionStrategy, facetBuilder, filters);
            break;
        case 'SalesPrice':
            addSalesPriceFacet(facetBuilder, filters, facets);
            break;
        case 'DataDouble':
            addDataDoubleFacet(facetToAdd.dataKey, facetToAdd.dataSelectionStrategy, facetBuilder, filters);
            break;
        }
    });
}

export function getFacetConfigEntryForResult(facetResult: (ProductAssortmentFacetResult | ContentAssortmentFacetResult | ProductCategoryAssortmentFacetResult | BrandFacetResult | CategoryFacetResult | CategoryHierarchyFacetResult | ContentDataObjectFacetResult | ContentDataDoubleRangeFacetResult | ContentDataDoubleRangesFacetResult | ContentDataStringValueFacetResult | ContentDataBooleanValueFacetResult | ContentDataDoubleValueFacetResult | ContentDataIntegerValueFacetResult | DataObjectFacetResult | DataObjectDoubleRangeFacetResult | DataObjectDoubleRangesFacetResult | DataObjectStringValueFacetResult | DataObjectBooleanValueFacetResult | DataObjectDoubleValueFacetResult | PriceRangeFacetResult | PriceRangesFacetResult | ProductCategoryDataObjectFacetResult | ProductCategoryDataDoubleRangeFacetResult | ProductCategoryDataDoubleRangesFacetResult | ProductCategoryDataStringValueFacetResult | ProductCategoryDataBooleanValueFacetResult | ProductCategoryDataDoubleValueFacetResult | ProductDataObjectFacetResult | ProductDataDoubleRangeFacetResult | ProductDataDoubleRangesFacetResult | ProductDataStringValueFacetResult | ProductDataBooleanValueFacetResult | ProductDataDoubleValueFacetResult | ProductDataIntegerValueFacetResult | RecentlyPurchasedFacetResult | VariantSpecificationFacetResult) ) {
    const facetConfig = defaultFacetConfiguration;

    switch(facetResult.field) {
    case 'Brand':
        return facetConfig.find(x => x.type === 'BrandFacet');
    case 'Category':
        return facetConfig.find(x => x.type === 'Category');
    case 'SalesPrice':
        return facetConfig.find(x => x.type === 'SalesPrice');
    case 'Data':
        if (!('key' in facetResult)) {
            console.error('Could not find configuration for facet result');
            return;
        }

        return facetConfig.find(x => facetResult.key === x.dataKey);
    }
}

function addCategoryFacet(facetBuilder: FacetBuilder, filters: Record<string, string | string[]>) {
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

    facetBuilder.addProductCategoryHierarchyFacet('Descendants', selectedCategoriesForFacet, { displayName: true });
}

function addBrandFacet(facetBuilder: FacetBuilder, filters: Record<string, string | string[]>) {
    facetBuilder.addBrandFacet(
        Array.isArray(filters['brand'])
                    && filters['brand']?.length > 0
            ? filters['brand'] 
            : null);
}

function addSalesPriceFacet(facetBuilder: FacetBuilder, filters: Record<string, string | string[]>, facets: ProductFacetResult | null |undefined) {

    // TODO: Is this nececarry?
    let applySalesPriceFacet = false;

    const salesPriceFacet = facets ? GetProductFacet.salesPriceRange(facets, 'Product') : null;

    if (salesPriceFacet) {
        const bothPriceFiltersSet = filters.price.length === 2;

        const lowerBoundNotEqualOrZero = (Number(filters.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive
                && salesPriceFacet.available!.value?.lowerBoundInclusive !== 0);

        const upperBoundNotEqualOrZero = (Number(filters.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive
                && salesPriceFacet.available!.value?.upperBoundInclusive !== 0);

        applySalesPriceFacet = salesPriceFacet && bothPriceFiltersSet && (lowerBoundNotEqualOrZero || upperBoundNotEqualOrZero);
    }

    facetBuilder.addSalesPriceRangeFacet('Product', 
        applySalesPriceFacet ? Number(filters.price[0]) : undefined,
        applySalesPriceFacet ? Number(filters.price[1]) : undefined);
}

function addDataStringFacet(
    dataKey: string | undefined,
    dataSelectionStrategy: DataSelectionStrategy | undefined,
    facetBuilder: FacetBuilder,
    filters: Record<string, string | string[]>) {

    if (!dataKey) {
        console.error('DataString facet requires a data key');
        return;
    }

    if (!dataSelectionStrategy) {
        console.error('DataString facet requires a selection strategy');
        return;
    }

    const loweredDataKey = dataKey.charAt(0).toLowerCase() + dataKey.slice(1);

    const selectedValues = Array.isArray(filters[loweredDataKey]) && filters[loweredDataKey]?.length > 0
        ? filters[loweredDataKey] 
        : null;
    
    facetBuilder.addProductDataStringValueFacet(dataKey, dataSelectionStrategy, selectedValues);
}

function addDataDoubleFacet(
    dataKey: string | undefined,
    dataSelectionStrategy: DataSelectionStrategy | undefined,
    facetBuilder: FacetBuilder,
    filters: Record<string, string | string[]>) {

    if (!dataKey) {
        console.error('DataDouble facet requires a data key');
        return;
    }

    if (!dataSelectionStrategy) {
        console.error('DataDouble facet requires a selection strategy');
        return;
    }

    const loweredDataKey = dataKey.charAt(0).toLowerCase() + dataKey.slice(1);

    const selectedValues = Array.isArray(filters[loweredDataKey]) && filters[loweredDataKey]?.length > 0
        ? filters[loweredDataKey].map(value => Number(value)).filter(value => !isNaN(value))
        : null;
    
    facetBuilder.addProductDataDoubleValueFacet(dataKey, dataSelectionStrategy, selectedValues);
}