import { FilterBuilder, ConditionBuilder, DataValueFactory } from '@relewise/client';
import contextStore from './context.store';

export function globalProductRecommendationFilters(filterBuilder: FilterBuilder) {
    if (!contextStore.context.value.showSoldOutProducts) return;
    
    filterBuilder.addProductDataFilter('SoldOut', (c: ConditionBuilder) => c.addEqualsCondition(DataValueFactory.string('true'), true), true, false, false);
}