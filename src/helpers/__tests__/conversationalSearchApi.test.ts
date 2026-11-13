import { describe, expect, it, vi } from 'vitest';
import { consumeAgUiEvents, filterValue, routeConversationalSearch, withFacet } from '@/helpers/conversationalSearchApi';

describe('conversational search API', () => {
    it('consumes AG-UI events split across arbitrary stream chunks', async() => {
        const receive = vi.fn();
        const encoder = new TextEncoder();
        const payload = [
            'data: {"type":"TEXT_MESSAGE_START",\n',
            'data: "messageId":"message-1"}\r\n\r\n',
            'data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"message-1","delta":"Hello"}\n\n',
        ];
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (const chunk of payload) {
                    controller.enqueue(encoder.encode(chunk));
                }

                controller.close();
            },
        });

        await consumeAgUiEvents(stream, receive);

        expect(receive).toHaveBeenCalledTimes(2);
        expect(receive).toHaveBeenNthCalledWith(1, {
            type: 'TEXT_MESSAGE_START',
            messageId: 'message-1',
        });
        expect(receive).toHaveBeenNthCalledWith(2, {
            type: 'TEXT_MESSAGE_CONTENT',
            messageId: 'message-1',
            delta: 'Hello',
        });
    });

    it('reads and updates generic property filters', () => {
        const filters = withFacet({ brand: 'Relewise' }, 'material', 'Wool');

        expect(filterValue(filters, 'brand')).toBe('Relewise');
        expect(filterValue(filters, 'material')).toBe('Wool');
        expect(withFacet(filters, 'material', null).properties?.material).toBeNull();
    });

    it('routes a search field query through the intent endpoint', async() => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            mode: 'conversation',
            reason: 'AI classified shopper intent',
            source: 'AI',
            elapsedMs: 12,
        }), { status: 200 }));

        const route = await routeConversationalSearch('dataset-id', 'api-key', 'show me televisions');

        expect(route.mode).toBe('conversation');
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/dataset-id/conversational-search/route'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ query: 'show me televisions', apiKey: 'api-key', inConversation: false }),
            }),
        );
    });
});
