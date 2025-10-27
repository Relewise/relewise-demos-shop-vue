import type { ProductResult, RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';

export type ProductWithType = {
    isPromotion: boolean;
    product: ProductResult;
    displayAd: RetailMediaResultPlacementResultEntityDisplayAd;
}