import { facetConfig, type FacetContext } from '@/facetConfig';
import contextStore from '@/stores/context.store';
import { type BrandFacetResult, type CategoryFacetResult, type CategoryHierarchyFacetResult, type CategoryNameAndId, type CategoryPath, type ContentAssortmentFacetResult, type ContentDataBooleanValueFacetResult, type ContentDataDoubleRangeFacetResult, type ContentDataDoubleRangesFacetResult, type ContentDataDoubleValueFacetResult, type ContentDataIntegerValueFacetResult, type ContentDataObjectFacetResult, type ContentDataStringValueFacetResult, type DataObjectBooleanValueFacetResult, type DataObjectDoubleRangeFacetResult, type DataObjectDoubleRangesFacetResult, type DataObjectDoubleValueFacetResult, type DataObjectFacetResult, type DataObjectStringValueFacetResult, type DataSelectionStrategy, type FacetBuilder, type PriceRangeFacetResult, type PriceRangesFacetResult, type PriceSelectionStrategy, type ProductAssortmentFacetResult, type ProductCategoryAssortmentFacetResult, type ProductCategoryDataBooleanValueFacetResult, type ProductCategoryDataDoubleRangeFacetResult, type ProductCategoryDataDoubleRangesFacetResult, type ProductCategoryDataDoubleValueFacetResult, type ProductCategoryDataObjectFacetResult, type ProductCategoryDataStringValueFacetResult, type ProductDataBooleanValueFacetResult, type ProductDataDoubleRangeFacetResult, type ProductDataDoubleRangesFacetResult, type ProductDataDoubleValueFacetResult, type ProductDataIntegerValueFacetResult, type ProductDataObjectFacetResult, type ProductDataStringValueFacetResult, type ProductFacetResult, type RecentlyPurchasedFacetResult, type VariantSpecificationFacetResult } from '@relewise/client';

export function getFacets(
    context: FacetContext,
    facetBuilder: FacetBuilder,
    filters: Record<string, string | string[]>, 
    facets: ProductFacetResult | null | undefined) {

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
        case 'DataDoubleRange':
            addDataDoubleRangeFacet(
                facetToAdd.dataKey, 
                facetToAdd.dataSelectionStrategy,
                facetBuilder,
                filters,
                facets);
            break;
        default:
            console.error(`Could not handle facet configuration with type '${facetToAdd.type}'`);
        }
    });
}

export function getFacetConfigEntryForResult(facetResult: (ProductAssortmentFacetResult | ContentAssortmentFacetResult | ProductCategoryAssortmentFacetResult | BrandFacetResult | CategoryFacetResult | CategoryHierarchyFacetResult | ContentDataObjectFacetResult | ContentDataDoubleRangeFacetResult | ContentDataDoubleRangesFacetResult | ContentDataStringValueFacetResult | ContentDataBooleanValueFacetResult | ContentDataDoubleValueFacetResult | ContentDataIntegerValueFacetResult | DataObjectFacetResult | DataObjectDoubleRangeFacetResult | DataObjectDoubleRangesFacetResult | DataObjectStringValueFacetResult | DataObjectBooleanValueFacetResult | DataObjectDoubleValueFacetResult | PriceRangeFacetResult | PriceRangesFacetResult | ProductCategoryDataObjectFacetResult | ProductCategoryDataDoubleRangeFacetResult | ProductCategoryDataDoubleRangesFacetResult | ProductCategoryDataStringValueFacetResult | ProductCategoryDataBooleanValueFacetResult | ProductCategoryDataDoubleValueFacetResult | ProductDataObjectFacetResult | ProductDataDoubleRangeFacetResult | ProductDataDoubleRangesFacetResult | ProductDataStringValueFacetResult | ProductDataBooleanValueFacetResult | ProductDataDoubleValueFacetResult | ProductDataIntegerValueFacetResult | RecentlyPurchasedFacetResult | VariantSpecificationFacetResult) ) {
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
    default:
        console.error(`Could not get facet configuration for result with field '${facetResult.field}'`);
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
    let applySalesPriceFacet = false;

    const salesPriceFacet = facets ? getSalesPriceRangeFacet(facets, 'Product') : null;
    
    if (salesPriceFacet && filters.price) {
        const bothPriceFiltersSet = filters.price.length === 2;
        
        const lowerBoundNotEqual = (Number(filters.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive);
        
        const upperBoundNotEqualOrZero = (Number(filters.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive
            && salesPriceFacet.available!.value?.upperBoundInclusive !== 0);
        
        applySalesPriceFacet = salesPriceFacet && bothPriceFiltersSet && (lowerBoundNotEqual || upperBoundNotEqualOrZero);
    }

    facetBuilder.addSalesPriceRangeFacet('Product', 
        applySalesPriceFacet ? Number(filters.price[0]) : undefined,
        applySalesPriceFacet ? Number(filters.price[1]) : undefined);
}

// TODO: This method is implemented in the JS SDK but has an error.
// Once we have solved the error we should use that method instead: https://trello.com/c/YqJnf6TH
function getSalesPriceRangeFacet(
    facets: ProductFacetResult,
    selectionStrategy: PriceSelectionStrategy,
): PriceRangeFacetResult | null {
    if (!facets?.items) return null;
    return facets.items.find((item): item is PriceRangeFacetResult => 
        item.field === 'SalesPrice' &&
            item.$type === 'Relewise.Client.DataTypes.Search.Facets.Result.PriceRangeFacetResult, Relewise.Client' &&
            'priceSelectionStrategy' in item &&
            item.priceSelectionStrategy === selectionStrategy,
    ) || null;
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

function addDataDoubleRangeFacet(
    dataKey: string | undefined,
    dataSelectionStrategy: DataSelectionStrategy | undefined,
    facetBuilder: FacetBuilder,
    filters: Record<string, string | string[]>,
    facets: ProductFacetResult | null |undefined) {

    if (!dataKey) {
        console.error('DataDoubleRange facet requires a data key');
        return;
    }

    if (!dataSelectionStrategy) {
        console.error('DataDoubleRange facet requires a selection strategy');
        return;
    }
    let applyDefaultValues = false;

    const loweredDataKey = dataKey.charAt(0).toLowerCase() + dataKey.slice(1);

    const dataDoubleRangeFacet = facets ? getSalesPriceRangeFacet(facets, 'Product') : null;
    
    if (dataDoubleRangeFacet && filters[loweredDataKey]) {
        const bothPriceFiltersSet = filters[loweredDataKey].length === 2;
        
        const lowerBoundNotEqual = (Number(filters[loweredDataKey][0]) !== dataDoubleRangeFacet.available!.value?.lowerBoundInclusive);

        const upperBoundNotEqualOrZero = (Number(filters[loweredDataKey][1]) !== dataDoubleRangeFacet.available!.value?.upperBoundInclusive
                && dataDoubleRangeFacet.available!.value?.upperBoundInclusive !== 0);

        applyDefaultValues = dataDoubleRangeFacet && bothPriceFiltersSet && (lowerBoundNotEqual || upperBoundNotEqualOrZero);
    }

    const lowerBound = applyDefaultValues ? Number(filters[loweredDataKey][0]) : undefined;
    const upperBound = applyDefaultValues ? Number(filters[loweredDataKey][1]) : undefined;

    facetBuilder.addProductDataDoubleRangeFacet(dataKey, dataSelectionStrategy, lowerBound, upperBound);
}