import type { ProductResult, RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';

export type ProductWithType = {
    isPromotion: boolean;
    product?: ProductResult | null | undefined;
    displayAd?: RetailMediaResultPlacementResultEntityDisplayAd | null | undefined;
}