import { describe, expect, it } from 'vitest';
import { describeSessionTrackingRequest } from '@/helpers/sessionTracking';

const dataset = { datasetId: 'demo', serverUrl: 'https://example.test/local-api/' };
const post = { method: 'POST' };

describe('session tracking', () => {
    it('recognizes only tracking calls to a configured dataset and proxy path', () => {
        const trackingPath = '/local-api/demo/v1/TrackProductViewRequest';
        expect(describeSessionTrackingRequest(`https://example.test${trackingPath}`, post, [dataset]))
            .toMatchObject({ datasetId: 'demo', label: 'Product viewed' });
        expect(describeSessionTrackingRequest(`https://elsewhere.test${trackingPath}`, post, [dataset])).toBeUndefined();
        expect(describeSessionTrackingRequest('https://example.test/demo/v1/TrackProductViewRequest', post, [dataset])).toBeUndefined();
        expect(describeSessionTrackingRequest('https://example.test/local-api/demo/v1/ProductSearchRequest', post, [dataset])).toBeUndefined();
    });

    it('summarizes web-component engagement without retaining the shopper object', () => {
        const signal = describeSessionTrackingRequest('https://example.test/local-api/demo/v1/TrackProductEngagementRequest', {
            ...post,
            body: JSON.stringify({ productEngagement: {
                id: { productId: 'product', variantId: 'blue' },
                engagement: { isFavorite: true },
                user: { email: 'private@example.test' },
            } }),
        }, [dataset]);

        expect(signal).toMatchObject({ label: 'Product added to favorites', subject: 'product', detail: 'Variant blue' });
        expect(JSON.stringify(signal)).not.toContain('private@example.test');
    });
});
