import { ConditionBuilder, DataValueFactory, FilterBuilder } from '@relewise/client';
import basketService from '../services/basket.service'
import appContext from './context.store';
import { computed } from 'vue';


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

export function addCartFilter(filterBuilder: FilterBuilder)
{
    const productIds = basketService.model.value.lineItems.map(p=>p.product.productId) as string[];
    
    if(productIds.length >0)
    {
        filterBuilder.addProductIdFilter(productIds,true);
    }
}