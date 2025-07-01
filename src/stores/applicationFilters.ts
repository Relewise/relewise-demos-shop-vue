import { FilterBuilder } from '@relewise/client';
import basketService from '../services/basket.service';

export function addBasketLineitemFilter(filterBuilder: FilterBuilder)
{
    const productIds = basketService.model.value.lineItems.map(p=>p.product.productId) as string[];
    
    if(productIds.length >0)
    {
        filterBuilder.addProductIdFilter(productIds,true);
    }
}