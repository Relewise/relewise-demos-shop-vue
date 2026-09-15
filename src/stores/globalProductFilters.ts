import { FilterBuilder, ConditionBuilder, DataValueFactory } from '@relewise/client';
import contextStore from './context.store';
import { addScopedPriceEligibilityFilter } from '@/helpers/bestPriceSearch';

export function globalProductRecommendationFilters(filterBuilder: FilterBuilder) {

    if (contextStore.context.value.hideSoldOutProducts) {
        filterBuilder.addProductDataFilter('SoldOut', (c: ConditionBuilder) => c.addEqualsCondition(DataValueFactory.string('false')), true, false);
    }

    contextStore.userClassificationBasedFilters(filterBuilder);
    addScopedPriceEligibilityFilter(filterBuilder, contextStore.createSearchPricingContext());
}
