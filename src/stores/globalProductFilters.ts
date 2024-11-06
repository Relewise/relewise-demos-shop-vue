import { FilterBuilder, ConditionBuilder, DataValueFactory } from '@relewise/client';
import contextStore from './context.store';

export function globalProductRecommendationFilters(filterBuilder: FilterBuilder) {
    if (!contextStore.context.value.hideSoldOutProducts) return;
    
    filterBuilder.addProductDataFilter('SoldOut', (c: ConditionBuilder) => c.addEqualsCondition(DataValueFactory.boolean(false)), true, false);
}