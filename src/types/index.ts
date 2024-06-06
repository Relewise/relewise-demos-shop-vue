import type { ProductResult } from '@relewise/client8';

export type ProductWithType = {
    isPromotion: boolean;
    product: ProductResult;
}