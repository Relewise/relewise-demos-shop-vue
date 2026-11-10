import type { SelectedProductPropertiesSettings, SelectedVariantPropertiesSettings, User } from '@relewise/client';

export interface ConversationalSearchV2Product {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: number | null;
    image: string;
    description: string;
    categoryId?: string;
    brandId?: string;
    properties?: Record<string, string>;
}

export interface ConversationalSearchV2Facet {
    key: string;
    values: string[];
    labels?: Record<string, string> | null;
    displayName?: string | null;
}

export interface ConversationalSearchV2Result {
    products: ConversationalSearchV2Product[];
    facets: ConversationalSearchV2Facet[];
    recommendations: ConversationalSearchV2Product[];
    source: string;
    currency: string;
}

export interface ConversationalSearchV2Filters {
    category?: string | null;
    brand?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    properties?: Record<string, string | null>;
}

export interface ConversationalSearchV2State {
    searchTerm: string;
    filters?: ConversationalSearchV2Filters;
    result?: ConversationalSearchV2Result | null;
}

export interface ConversationalSearchV2Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export interface ConversationalSearchV2ShoppingActivity {
    status: 'searching' | 'ready' | 'error' | 'cancelled';
    searchTerm: string;
    filters: ConversationalSearchV2Filters;
    result?: ConversationalSearchV2Result | null;
}

export interface ConversationalSearchV2ProductDetailActivity {
    status: 'searching' | 'ready' | 'error' | 'cancelled';
    product: ConversationalSearchV2Product;
    currency: string;
    sourceActivityId?: string;
    addedQuantity?: number;
}

export type ConversationalSearchV2ShoppingAction =
    | { kind: 'facet'; key: string; value: string | null }
    | { kind: 'budget'; minPrice: number | null; maxPrice: number | null }
    | { kind: 'clear' };

export interface ConversationalSearchV2PropertyDefinition {
    key: string;
    dataKey: string;
    displayName?: string;
}

export interface ConversationalSearchV2Request {
    threadId: string;
    runId: string;
    messages: Pick<ConversationalSearchV2Message, 'role' | 'content'>[];
    state?: ConversationalSearchV2State;
    forwardedProps: {
        apiKey: string;
        shopContext: {
            language: string;
            currency: string;
            user: User;
        };
        selectedProductProperties: SelectedProductPropertiesSettings;
        selectedVariantProperties: SelectedVariantPropertiesSettings;
        take: number;
        shoppingAction?: ConversationalSearchV2ShoppingAction;
        activityMessageId?: string;
        productContext?: {
            productIds: string[];
            focusedProductId?: string;
        };
        propertyDefinitions?: ConversationalSearchV2PropertyDefinition[];
    };
}

export interface AgUiEvent {
    type: string;
    messageId?: string;
    activityType?: string;
    content?: any;
    snapshot?: ConversationalSearchV2State;
    delta?: string;
    name?: string;
    value?: any;
    message?: string;
    replace?: boolean;
}

const defaultApiBaseUrl = 'https://cdn.relewise.com/relewisedemoshop-1131137e-b167-48e2-90a4-e7981e0dc391/production';
const apiBaseUrl = (import.meta.env.VITE_CONVERSATIONAL_SEARCH_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
    ?? defaultApiBaseUrl;

export async function streamConversationalSearchV2(
    datasetId: string,
    request: ConversationalSearchV2Request,
    receive: (event: AgUiEvent) => void,
    abortSignal?: AbortSignal,
) {
    const response = await fetch(`${apiBaseUrl}/api/${datasetId}/conversational-search/v2`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: abortSignal,
    });

    if (!response.ok) {
        throw new Error(response.status === 401
            ? 'The dataset API key was rejected.'
            : `Conversational search failed with status ${response.status}.`);
    }

    if (!response.body) {
        throw new Error('The conversational search response did not contain an event stream.');
    }

    await consumeAgUiEvents(response.body, receive, abortSignal);
}

export async function consumeAgUiEvents(
    stream: ReadableStream<Uint8Array>,
    receive: (event: AgUiEvent) => void,
    abortSignal?: AbortSignal,
) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function drain(final = false) {
        buffer = buffer.replace(/\r\n/g, '\n');
        let frameEnd = buffer.indexOf('\n\n');

        while (frameEnd >= 0) {
            const frame = buffer.slice(0, frameEnd);
            buffer = buffer.slice(frameEnd + 2);
            const data = frame
                .split('\n')
                .filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trimStart())
                .join('\n');

            if (data) {
                receive(JSON.parse(data) as AgUiEvent);
            }

            frameEnd = buffer.indexOf('\n\n');
        }

        if (final && buffer.trim()) {
            throw new Error('The conversational search event stream ended unexpectedly.');
        }
    }

    try {
        while (true) {
            abortSignal?.throwIfAborted();
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            drain();
        }

        buffer += decoder.decode();
        drain(true);
    }
    finally {
        reader.releaseLock();
    }
}

export function filterValue(filters: ConversationalSearchV2Filters, key: string) {
    if (key === 'brand' || key === 'category') {
        return filters[key] ?? null;
    }

    return filters.properties?.[key] ?? null;
}

export function withFacet(
    filters: ConversationalSearchV2Filters,
    key: string,
    value: string | null,
): ConversationalSearchV2Filters {
    if (key === 'brand' || key === 'category') {
        return { ...filters, [key]: value };
    }

    return {
        ...filters,
        properties: {
            ...filters.properties,
            [key]: value,
        },
    };
}
