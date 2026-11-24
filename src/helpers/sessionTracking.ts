import type { SessionTrackingSignal } from '@/stores/sessionCockpit';

interface TrackingDataset {
    datasetId: string;
    serverUrl?: string;
}

interface ProductIdentity {
    productId?: string;
    variantId?: string;
}

interface FeedInteraction {
    feedId?: string;
    item?: { contentId?: string; productAndVariantId?: ProductIdentity };
}

interface Engagement {
    isFavorite?: boolean;
    sentiment?: 'Like' | 'Dislike' | 'Neutral';
}

interface TrackingRequestBody {
    productView?: { product?: { id?: string }; variant?: { id?: string } };
    productCategoryView?: { idPath?: string[] };
    contentView?: { content?: { id?: string } };
    contentCategoryView?: { idPath?: string[] };
    brandView?: { brand?: { id?: string } };
    productEngagement?: { id?: ProductIdentity; engagement?: Engagement };
    contentEngagement?: { id?: string; engagement?: Engagement };
    cart?: { lineItems?: unknown[] };
    order?: { orderNumber?: string; lineItems?: unknown[] };
    displayAdClick?: { displayAdId?: string; campaignId?: string };
    dwell?: { feedId?: string; visibleItems?: unknown[] };
    click?: FeedInteraction;
    preview?: FeedInteraction;
}

type SignalSummary = Pick<SessionTrackingSignal, 'label' | 'subject' | 'detail'>;

// The product page knows the display name, while the tracking payload only carries the ID.
let currentProduct: { datasetId: string; productId: string; name: string } | undefined;

export function rememberTrackingProductName(datasetId: string, productId: string, name: string) {
    currentProduct = { datasetId, productId, name };
}

export function describeSessionTrackingRequest(resource: RequestInfo | URL, options: RequestInit | undefined, datasets: readonly TrackingDataset[]): SessionTrackingSignal | undefined {
    const request = resource instanceof Request ? resource : undefined;
    if ((options?.method ?? request?.method)?.toUpperCase() !== 'POST') return;

    let url: URL;
    try {
        url = new URL(request?.url ?? String(resource), window.location.origin);
    }
    catch {
        return;
    }
    const match = url.pathname.match(/\/([^/]+)\/v1\/Track([A-Za-z0-9]+)Request$/);
    if (!match) return;

    const [, datasetId, action] = match;
    const dataset = datasets.find(entry => entry.datasetId === datasetId);
    if (!dataset) return;

    try {
        const server = new URL(dataset.serverUrl || 'https://api.relewise.com');
        // The server URL may contain a proxy path. Both SDKs append the same dataset and API route.
        const expectedPath = `${server.pathname.replace(/\/$/, '')}/${datasetId}/v1/Track${action}Request`;
        if (url.origin !== server.origin || url.pathname !== expectedPath) return;
    }
    catch {
        return;
    }

    const timestamp = new Date().toISOString();
    const label = action.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    try {
        // The SDKs send JSON strings. An opaque body can still give us a signal type from the URL.
        const body = typeof options?.body === 'string' ? JSON.parse(options.body) as TrackingRequestBody : {};
        return { datasetId, timestamp, ...summarize(action, body ?? {}, datasetId, label) };
    }
    catch {
        return { datasetId, timestamp, label };
    }
}

function summarize(action: string, body: TrackingRequestBody, datasetId: string, label: string): SignalSummary {
    switch (action) {
        case 'ProductView':
            return { ...productSummary(body.productView?.product?.id, body.productView?.variant?.id, datasetId), label: 'Product viewed' };
        case 'ProductCategoryView':
            return { label: 'Product category viewed', subject: lastCategoryId(body.productCategoryView?.idPath) };
        case 'ContentView':
            return { label: 'Content viewed', subject: body.contentView?.content?.id };
        case 'ContentCategoryView':
            return { label: 'Content category viewed', subject: lastCategoryId(body.contentCategoryView?.idPath) };
        case 'BrandView':
            return { label: 'Brand viewed', subject: body.brandView?.brand?.id };
        case 'Cart':
            return { label: 'Cart updated', subject: describeCount(body.cart?.lineItems, 'line item') };
        case 'Order':
            return { label: 'Order placed', subject: body.order?.orderNumber, detail: describeCount(body.order?.lineItems, 'line item') };
        case 'UserUpdate':
            return { label: 'User updated' };
        case 'SearchTerm':
            return { label: 'Search term tracked' };
        case 'ProductEngagement':
            return { ...productSummary(body.productEngagement?.id?.productId, body.productEngagement?.id?.variantId, datasetId), label: engagementLabel('Product', body.productEngagement?.engagement) };
        case 'ContentEngagement':
            return { label: engagementLabel('Content', body.contentEngagement?.engagement), subject: body.contentEngagement?.id };
        case 'DisplayAdClick':
            return { label: 'Display ad clicked', subject: body.displayAdClick?.displayAdId, detail: body.displayAdClick?.campaignId ? `Campaign ${body.displayAdClick.campaignId}` : undefined };
        case 'FeedDwell':
            return { label: 'Feed dwell recorded', subject: body.dwell?.feedId, detail: describeCount(body.dwell?.visibleItems, 'visible item') };
        case 'FeedItemClick':
            return { ...feedSummary(body.click, datasetId), label: 'Feed item clicked' };
        case 'FeedItemPreview':
            return { ...feedSummary(body.preview, datasetId), label: 'Feed item previewed' };
        default:
            // A newer SDK can still surface new tracking operations without storing raw payloads.
            return { label };
    }
}

function productSummary(productId: string | undefined, variantId: string | undefined, datasetId: string) {
    const name = currentProduct?.datasetId === datasetId && currentProduct.productId === productId ? currentProduct.name : undefined;
    return { subject: name || productId, detail: variantId ? `Variant ${variantId}` : undefined };
}

function feedSummary(interaction: FeedInteraction | undefined, datasetId: string) {
    const item = interaction?.item;
    const product = productSummary(item?.productAndVariantId?.productId, item?.productAndVariantId?.variantId, datasetId);
    return { subject: item?.contentId || product.subject || interaction?.feedId, detail: product.detail };
}

function engagementLabel(entity: string, engagement?: Engagement) {
    if (engagement?.isFavorite === true) return `${entity} added to favorites`;
    if (engagement?.isFavorite === false) return `${entity} removed from favorites`;
    if (engagement?.sentiment === 'Like') return `${entity} liked`;
    if (engagement?.sentiment === 'Dislike') return `${entity} disliked`;
    if (engagement?.sentiment === 'Neutral') return `${entity} reaction cleared`;
    return `${entity} engagement updated`;
}

function describeCount(items: unknown[] | undefined, noun: string) {
    if (!Array.isArray(items)) return undefined;
    return `${items.length} ${noun}${items.length === 1 ? '' : 's'}`;
}

function lastCategoryId(path: string[] | undefined) {
    return path?.[path.length - 1];
}
