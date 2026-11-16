import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataValueFactory } from '@relewise/client';
import trackingService from '../tracking.service';

const tracker = vi.hoisted(() => ({ trackCart: vi.fn(), trackOrder: vi.fn(), trackProductView: vi.fn() }));
vi.mock('@/stores/context.store', () => ({ default: {
    tracking: { value: { enabled: true } },
    user: { value: { temporaryId: 'test-shopper' } },
    defaultSettings: { currency: 'SEK' },
    getTracker: () => tracker,
} }));
vi.mock('@/services/basket.service', () => ({ default: { canCheckout: { value: true } } }));
beforeEach(() => vi.clearAllMocks());

describe('selected article tracking', () => {
    it('uses the physical article and its price for cart and order payloads', async() => {
        const items = [{ quantity: 2, offerCurrency: 'SEK', product: {
            productId: 'family-1', rank: 1, salesPrice: 999,
            data: { DataModelVersion: DataValueFactory.string('variant-owned-v1') },
            variant: { variantId: 'article-a', rank: 1, salesPrice: 125 },
        } }];
        await trackingService.trackCart(items);
        await trackingService.trackOrder(items);
        for (const call of [tracker.trackCart, tracker.trackOrder]) {
            expect(call).toHaveBeenCalledWith(expect.objectContaining({
                lineItems: [{ productId: 'family-1', variantId: 'article-a', quantity: 2, lineTotal: 250 }],
                subtotal: { currency: 'SEK', amount: 250 },
            }));
        }
    });
    it('preserves the selected physical identity in article views', async() => {
        await trackingService.trackProductView('family-1', 'article-a');
        expect(tracker.trackProductView).toHaveBeenCalledWith(expect.objectContaining({ productId: 'family-1', variantId: 'article-a' }));
    });
});
