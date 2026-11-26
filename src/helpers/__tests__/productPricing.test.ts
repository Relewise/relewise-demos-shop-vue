import { withVariantPricing } from '@/helpers/productPricing';
import basketService from '@/services/basket.service';
import type { ProductResult } from '@relewise/client';
import { beforeEach, describe, expect, it } from 'vitest';

const parentPrices = { salesPrice: 100, listPrice: 120 };

function product(variantPrices: { salesPrice?: number; listPrice?: number } = {}): ProductResult {
    return { productId: 'product', rank: 1, ...parentPrices, variant: { variantId: 'variant', rank: 1, ...variantPrices } };
}

describe('variant prices', () => {
    beforeEach(() => basketService.clear());

    it('uses both prices from the selected variant when available', () => {
        expect(withVariantPricing(product({ salesPrice: 80, listPrice: 90 }))).toMatchObject({ salesPrice: 80, listPrice: 90 });
    });

    it('never compares a variant sales price with the parent list price', () => {
        expect(withVariantPricing(product({ salesPrice: 0 }))).toMatchObject({ salesPrice: 0, listPrice: 0 });
        expect(withVariantPricing(product({ listPrice: 150 }))).toMatchObject(parentPrices);
    });

    it('updates an existing variant line when a later result provides its pricing', async() => {
        await basketService.addProduct({ product: product(), quantityDelta: 1 });
        await basketService.addProduct({ product: product({ salesPrice: 80, listPrice: 90 }), quantityDelta: 1 });
        await basketService.addProduct({ product: product(), quantityDelta: 1 });

        expect(basketService.model.value.lineItems).toMatchObject([{ quantity: 3, product: { salesPrice: 80, listPrice: 90 } }]);
        expect(basketService.subtotal.value).toBe(240);
        expect(JSON.parse(localStorage.getItem('basket')!).lineItems).toMatchObject([{ product: { salesPrice: 80, listPrice: 90 } }]);
    });
});
