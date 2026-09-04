import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductResult } from '@relewise/client';

let basketService: typeof import('@/services/basket.service').default;

describe('BasketService pricing', () => {
    beforeAll(async() => {
        const storage = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        });
        basketService = (await import('@/services/basket.service')).default;
    });

    beforeEach(() => basketService.clear());

    it('uses the resolved price-list amount instead of native product pricing', async() => {
        const product = {
            productId: 'product-1',
            salesPrice: 999,
            listPrice: 1099,
        } as ProductResult;

        await basketService.addProduct({ product, quantityDelta: 2, unitPrice: 75 });

        expect(basketService.model.value.lineItems[0]?.unitPrice).toBe(75);
        expect(basketService.subtotal.value).toBe(150);
    });
});
