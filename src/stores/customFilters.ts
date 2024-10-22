import { ConditionBuilder, DataValueFactory, FilterBuilder } from '@relewise/client';
import appContext from './context.store';

export function addAssortmentFilters(filterBuilder: FilterBuilder) {
    if (!appContext.user.value.classifications) { return; }

    if(appContext.user.value.classifications['country'])
    {
        filterBuilder.addProductDataFilter('AvailableInMarkets', (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(appContext.user.value!.classifications!['country']!)));
    }
    if(appContext.user.value.classifications['channel'])
    {
        filterBuilder.addProductDataFilter('AvailableInChannels', (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(appContext.user.value!.classifications!['channel']!)));
    }
    
    
}