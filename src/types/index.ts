import type { ProductResult } from '@relewise/client';

export type ProductWithType = {
    isPromotion: boolean;
    product: ProductResult;
}