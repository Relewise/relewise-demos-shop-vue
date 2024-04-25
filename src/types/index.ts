import type { ProductResult } from '@relewise/client2';

export type ProductWithType = {
    isPromotion: boolean;
    product: ProductResult;
}