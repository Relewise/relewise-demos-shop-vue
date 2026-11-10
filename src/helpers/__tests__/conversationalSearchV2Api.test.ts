import { describe, expect, it, vi } from 'vitest';
import { consumeAgUiEvents, filterValue, withFacet } from '@/helpers/conversationalSearchV2Api';

describe('conversational search v2 API', () => {
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
});
