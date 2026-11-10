import type { SelectedProductPropertiesSettings, SelectedVariantPropertiesSettings, User } from '@relewise/client';

export interface ConversationalSearchProduct {
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

export interface ConversationalSearchFacet {
    key: string;
    values: string[];
    labels?: Record<string, string> | null;
    displayName?: string | null;
}

export interface ConversationalSearchResult {
    products: ConversationalSearchProduct[];
    facets: ConversationalSearchFacet[];
    recommendations: ConversationalSearchProduct[];
    source: string;
    currency: string;
}

export interface ConversationalSearchFilters {
    category?: string | null;
    brand?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    properties?: Record<string, string | null>;
}

export interface ConversationalSearchState {
    searchTerm: string;
    filters?: ConversationalSearchFilters;
    result?: ConversationalSearchResult | null;
}

export interface ConversationalSearchMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export interface ConversationalSearchShoppingActivity {
    status: 'searching' | 'ready' | 'error' | 'cancelled';
    searchTerm: string;
    filters: ConversationalSearchFilters;
    result?: ConversationalSearchResult | null;
}

export interface ConversationalSearchProductDetailActivity {
    status: 'searching' | 'ready' | 'error' | 'cancelled';
    product: ConversationalSearchProduct;
    currency: string;
    sourceActivityId?: string;
    addedQuantity?: number;
}

export type ConversationalSearchShoppingAction =
    | { kind: 'facet'; key: string; value: string | null }
    | { kind: 'budget'; minPrice: number | null; maxPrice: number | null }
    | { kind: 'clear' };

export interface ConversationalSearchPropertyDefinition {
    key: string;
    dataKey: string;
    displayName?: string;
}

export interface ConversationalSearchRequest {
    threadId: string;
    runId: string;
    messages: Pick<ConversationalSearchMessage, 'role' | 'content'>[];
    state?: ConversationalSearchState;
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
        shoppingAction?: ConversationalSearchShoppingAction;
        activityMessageId?: string;
        productContext?: {
            productIds: string[];
            focusedProductId?: string;
        };
        propertyDefinitions?: ConversationalSearchPropertyDefinition[];
    };
}

export interface AgUiEvent {
    type: string;
    messageId?: string;
    activityType?: string;
    content?: any;
    snapshot?: ConversationalSearchState;
    delta?: string;
    name?: string;
    value?: any;
    message?: string;
    replace?: boolean;
}

export interface ConversationalSearchRoute {
    mode: 'search' | 'conversation';
    reason: string;
    source: string;
    elapsedMs: number;
}

const conversationalSearchApiBaseUrl = 'https://cdn.relewise.com/relewisedemoshop-1131137e-b167-48e2-90a4-e7981e0dc391/production';
const apiBaseUrl = (import.meta.env.VITE_CONVERSATIONAL_SEARCH_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
    ?? conversationalSearchApiBaseUrl;

export async function routeConversationalSearch(
    datasetId: string,
    apiKey: string,
    query: string,
    abortSignal?: AbortSignal,
) {
    const response = await fetch(`${apiBaseUrl}/api/${datasetId}/conversational-search/route`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, apiKey, inConversation: false }),
        signal: abortSignal,
    });

    if (!response.ok) {
        throw new Error(`Conversational search routing failed with status ${response.status}.`);
    }

    return await response.json() as ConversationalSearchRoute;
}

export async function streamConversationalSearch(
    datasetId: string,
    request: ConversationalSearchRequest,
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

export function filterValue(filters: ConversationalSearchFilters, key: string) {
    if (key === 'brand' || key === 'category') {
        return filters[key] ?? null;
    }

    return filters.properties?.[key] ?? null;
}

export function withFacet(
    filters: ConversationalSearchFilters,
    key: string,
    value: string | null,
): ConversationalSearchFilters {
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
