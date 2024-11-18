import { FilterBuilder, ConditionBuilder, DataValueFactory } from '@relewise/client';
import contextStore from './context.store';

export function globalProductRecommendationFilters(filterBuilder: FilterBuilder) {
    if (!contextStore.context.value.hidesoldOutProducts) return;
    
    filterBuilder.addProductDataFilter('soldOut', (c: ConditionBuilder) => c.addEqualsCondition(DataValueFactory.boolean(false)), true, false);
}