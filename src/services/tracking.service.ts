import type { ILineItem } from './basket.service';
import contextStore from '../stores/context.store';
import type { FeedItem } from '@relewise/client';

class TrackingService {
    public trackProductCategoryView(id: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackProductCategoryView({ idPath: [id], user: contextStore.user.value });
    }

    public trackBrandView(id: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackBrandView({ brandId: id, user: contextStore.user.value });
    }

    public async trackProductView(id: string, variantId?: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackProductView({ productId: id, variantId: variantId, user: contextStore.user.value });
    }

    public async trackContentView(id: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackContentView({ contentId: id, user: contextStore.user.value });
    }

    public async trackUserUpdate(email: string): Promise<boolean> {
        if (!contextStore.tracking.value.enabled) return false;

        const tracker = contextStore.getTracker();
        const user = { ...contextStore.user.value, email };

        try {
            await tracker.trackUserUpdate({ user: user });
            return true;
        } catch {
            return false;
        }
    }

    public async trackFeedItemsDwell(feedId: string, items: Array<{ productAndVariantId?: { productId: string }, contentId?: string, dwellDurationMs?: number }>, dwellTimeMs?: number) {
        if (!contextStore.tracking.value.enabled) return;
        if (!feedId) return;

        const tracker = contextStore.getTracker();
        await tracker.trackFeedDwell({
            user: contextStore.user.value,
            feedId: feedId,
            visibleItems: items,
            dwellTimeMilliseconds: dwellTimeMs ?? 0,
        });
    }

    public async trackCart(lineItems: ILineItem[]) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        const items = this.mapLineItems(lineItems);
        const subTotal = items.reduce((total, i) => total + i.lineTotal, 0);

        tracker.trackCart({
            lineItems: items,
            subtotal: { currency: contextStore.defaultSettings.currency, amount: subTotal },
            user: contextStore.user.value,
        });
    }

    public async trackOrder(lineItems: ILineItem[]) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        const items = this.mapLineItems(lineItems);
        const subTotal = items.reduce((total, i) => total + i.lineTotal, 0);

        await tracker.trackOrder({
            lineItems: items,
            subtotal: { currency: contextStore.defaultSettings.currency, amount: subTotal },
            user: contextStore.user.value,
            orderNumber: this.createOrderNumber(),
        });
    }

    public async trackFeedItemClick(feedId: string, item: FeedItem) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();
        tracker.trackFeedItemClick({ user: contextStore.user.value, feedId: feedId, item });
    }

    private mapLineItems(lineItems: ILineItem[]) {
        return lineItems.map(x => ({
            productId: x.product.productId ?? '',
            variantId: x.product.variant?.variantId ?? undefined,
            quantity: x.quantity,
            lineTotal: x.quantity * (x.product.salesPrice ?? 0),
        }));
    }

    private createOrderNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `DEMO-${year}${month}${day}${hours}${minutes}${seconds}`;
    }
}

export default new TrackingService();
