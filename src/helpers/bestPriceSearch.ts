import type { SearchPricingContext } from '@/services/price.service';
import {
    DataValueFactory,
    type DataObjectFilterConditionBuilder,
    type FacetBuilder,
    type FilterBuilder,
    type ProductSearchRequest,
    type ProductSortingBuilder,
} from '@relewise/client';

export const AGREED_ORDER_FILTER_KEY = 'agreedOrder';
export const AGREED_ORDER_SORT = 'AgreedOrderFirst';

const PRICES_KEY = 'Prices';
const AMOUNT_KEY = 'Amount';
const AGREED_ORDERS_KEY = 'AgreedOrders';
const AGREED_ORDER_SCOPE_IDS_KEY = 'AgreedOrderScopeIds';
const HAS_AGREED_ORDER_KEY = 'HasAgreedOrder';
const PRICE_SOURCES = ['PriceList', 'AgreedOrder'];

export function addScopedPriceEligibilityFilter(filterBuilder: FilterBuilder, context: SearchPricingContext | null) {
    if (!context) {
        return;
    }

    filterBuilder.addProductDataFilter(PRICES_KEY, conditions => conditions.addDataObjectCondition(
        objectConditions => addEligiblePriceConditions(objectConditions, context),
    ));
}

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

export function addAgreedOrderFilter(
    filterBuilder: FilterBuilder,
    filters: Record<string, string | string[]>,
    context: SearchPricingContext | null,
) {
    if (!hasAgreedOrderAccess(context) || !isAgreedOrderSelected(filters)) {
        return;
    }

    filterBuilder.addProductDataFilter(
        AGREED_ORDER_SCOPE_IDS_KEY,
        conditions => conditions.addContainsCondition(
            DataValueFactory.stringCollection(context.accessibleAgreedOrderScopeIds),
            'Any',
        ),
    );
}

export function addAgreedOrderFacet(facetBuilder: FacetBuilder, context: SearchPricingContext | null) {
    if (!hasAgreedOrderAccess(context)) {
        return;
    }

    facetBuilder.addProductDataObjectFacet(
        AGREED_ORDERS_KEY,
        'Product',
        builder => builder.addNumberFacet(HAS_AGREED_ORDER_KEY),
        { conditions: builder => addEligibleAgreedOrderConditions(builder, context) },
    );
}

export function sortByAgreedOrder(sortingBuilder: ProductSortingBuilder, context: SearchPricingContext | null) {
    if (!hasAgreedOrderAccess(context)) {
        sortingBuilder.sortByProductRelevance();
        return;
    }

    sortingBuilder.sortByProductDataObject(
        'Product',
        'Descending',
        valueSelector => valueSelector.select(AGREED_ORDERS_KEY, {
            filter: { conditions: builder => addEligibleAgreedOrderConditions(builder, context) },
            childSelector: childSelector => childSelector.select(HAS_AGREED_ORDER_KEY),
        }),
        thenBy => thenBy.sortByProductRelevance(),
        'Numerical',
    );
}

export function sanitizeAgreedOrderSelections(
    filters: Record<string, string | string[]>,
    context: SearchPricingContext | null,
) {
    if (hasAgreedOrderAccess(context)) {
        return false;
    }

    const hadFilter = AGREED_ORDER_FILTER_KEY in filters;
    const hadSort = filters.sort === AGREED_ORDER_SORT;
    delete filters[AGREED_ORDER_FILTER_KEY];
    if (hadSort) {
        filters.sort = '';
    }

    return hadFilter || hadSort;
}

export function hasAgreedOrderAccess(context: SearchPricingContext | null): context is SearchPricingContext {
    return !!context
        && context.accessibleAgreedOrderScopeIds.length > 0
        && context.accessibleCompanyIds.length > 0;
}

export function addBestPriceConditions(builder: DataObjectFilterConditionBuilder, context: SearchPricingContext) {
    addEligiblePriceConditions(builder, context)
        .addMinByCondition(AMOUNT_KEY);
}

export function addEligiblePriceConditions(builder: DataObjectFilterConditionBuilder, context: SearchPricingContext) {
    builder
        .addEqualsCondition('ScopeId', DataValueFactory.stringCollection(context.accessibleScopeIds))
        .addEqualsCondition('Source', DataValueFactory.stringCollection(PRICE_SOURCES))
        .addEqualsCondition('Currency', DataValueFactory.string(context.currency))
        .addLessThanCondition('DateFrom', context.nowUnixMs + 1)
        .addGreaterThanCondition('DateTo', context.nowUnixMs - 1);

    return builder;
}

export function addEligibleAgreedOrderConditions(builder: DataObjectFilterConditionBuilder, context: SearchPricingContext) {
    builder
        .addEqualsCondition('ScopeId', DataValueFactory.stringCollection(context.accessibleAgreedOrderScopeIds))
        .addEqualsCondition('CompanyId', DataValueFactory.stringCollection(context.accessibleCompanyIds))
        .addEqualsCondition(HAS_AGREED_ORDER_KEY, DataValueFactory.number(1))
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

function isAgreedOrderSelected(filters: Record<string, string | string[]>) {
    const selected = filters[AGREED_ORDER_FILTER_KEY];
    return selected === 'true' || (Array.isArray(selected) && selected.includes('true'));
}

function getPriceBound(value: string | string[] | undefined, index: number) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const bound = Number(value[index]);
    return Number.isFinite(bound) ? bound : undefined;
}
