import type { ProductResult } from '@relewise/client3';

export type ProductWithType = {
    isPromotion: boolean;
    product: ProductResult;
}