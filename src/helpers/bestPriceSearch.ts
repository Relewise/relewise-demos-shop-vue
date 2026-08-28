import type { SearchPricingContext } from '@/services/price.service';
import {
    DataValueFactory,
    type DataObjectFilterConditionBuilder,
    type FacetBuilder,
    type ProductSearchRequest,
    type ProductSortingBuilder,
} from '@relewise/client';

const PRICES_KEY = 'Prices';
const AMOUNT_KEY = 'Amount';

export function addBestPriceFacet(
    facetBuilder: FacetBuilder,
    filters: Record<string, string | string[]>,
    context: SearchPricingContext | null,
) {
    const lower = getPriceBound(filters.price, 0);
    const upper = getPriceBound(filters.price, 1);

    if (!context) {
        facetBuilder.addSalesPriceRangeFacet('Product', lower, upper);
        return;
    }

    facetBuilder.addProductDataObjectFacet(
        PRICES_KEY,
        'Product',
        builder => builder.addNumberRangeFacet(AMOUNT_KEY, lower, upper),
        { conditions: builder => addBestPriceConditions(builder, context) },
    );
}

export function sortByBestPrice(
    sortingBuilder: ProductSortingBuilder,
    order: 'Ascending' | 'Descending',
    context: SearchPricingContext | null,
) {
    if (!context) {
        sortingBuilder.sortByProductAttribute('SalesPrice', order);
        return;
    }

    sortingBuilder.sortByProductDataObject(
        'Product',
        order,
        valueSelector => valueSelector.select(PRICES_KEY, {
            filter: { conditions: builder => addBestPriceConditions(builder, context) },
            childSelector: childSelector => childSelector.select(AMOUNT_KEY),
        }),
        thenBy => thenBy.sortByProductRelevance(),
        'Numerical',
    );
}

export function addBestPriceConditions(builder: DataObjectFilterConditionBuilder, context: SearchPricingContext) {
    addEligiblePriceConditions(builder, context)
        .addMinByCondition(AMOUNT_KEY);
}

export function addEligiblePriceConditions(builder: DataObjectFilterConditionBuilder, context: SearchPricingContext) {
    builder
        .addEqualsCondition(
            'PriceListId',
            DataValueFactory.stringCollection(context.accessiblePriceListIds),
        )
        .addEqualsCondition('Currency', DataValueFactory.string(context.currency))
        .addLessThanCondition('DateFrom', context.nowUnixMs + 1)
        .addGreaterThanCondition('DateTo', context.nowUnixMs - 1);

    return builder;
}

export function removeEmptyBestPriceFacetSelection(request: ProductSearchRequest) {
    type NestedFacet = {
        field: string;
        key?: string | null;
        selected?: {
            lowerBoundInclusive?: number | null;
            upperBoundInclusive?: number | null;
        } | null;
    };
    type ObjectFacet = NestedFacet & { items?: NestedFacet[] | null };

    const priceFacet = (request.facets?.items as ObjectFacet[] | undefined)?.find(facet =>
        facet.field === 'Data' && facet.key === PRICES_KEY,
    );
    const amountFacet = priceFacet?.items?.find(facet => facet.field === 'Data' && facet.key === AMOUNT_KEY);
    if (amountFacet?.selected
        && amountFacet.selected.lowerBoundInclusive == null
        && amountFacet.selected.upperBoundInclusive == null) {
        delete amountFacet.selected;
    }

    return request;
}

function getPriceBound(value: string | string[] | undefined, index: number) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const bound = Number(value[index]);
    return Number.isFinite(bound) ? bound : undefined;
}
