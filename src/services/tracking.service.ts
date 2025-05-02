import type { ILineItem } from './basket.service';
import contextStore from '../stores/context.store';

class TrackingService {
    public trackProductCategoryView(id: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackProductCategoryView({ idPath: [id], user: contextStore.user.value });
    }

    public async trackProductView(id: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackProductView({ productId: id, user: contextStore.user.value });
    }

    public async trackContentView(id: string) {
        if (!contextStore.tracking.value.enabled) return;

        const tracker = contextStore.getTracker();

        tracker.trackContentView({ contentId: id, user: contextStore.user.value });
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
            orderNumber: crypto.randomUUID(),
        });
    }

    private mapLineItems(lineItems: ILineItem[]) {
        return lineItems.map(x => ({
            productId: x.product.productId ?? '',
            quantity: x.quantity,
            lineTotal: x.quantity * (x.product.salesPrice ?? 0),
        }));
    }
}

export default new TrackingService();
