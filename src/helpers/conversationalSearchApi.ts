import type { ProductResult, SelectedProductPropertiesSettings, SelectedVariantPropertiesSettings, User } from '@relewise/client';

export interface ConversationalSearchRequest {
    apiKey: string;
    currentInput: string;
    conversationState: ConversationState;
    shopContext: ShopContext;
    selectedProductProperties: SelectedProductPropertiesSettings;
    selectedVariantProperties: SelectedVariantPropertiesSettings;
    take: number;
}

export interface ShopContext {
    language: string;
    currency: string;
    user: User;
}

export interface ConversationState {
    originalRequest: string;
    audienceContext: string;
    interests: string;
    budget: string;
    messages: ConversationMessage[];
    searchPhrase?: string;
    maxSalesPrice?: number | null;
}

export interface ConversationMessage {
    role: string;
    text: string;
}

export interface ConversationalSearchResponse {
    kind: ConversationalSearchResponseKind | keyof typeof ConversationalSearchResponseKind;
    message: string;
    conversationState: ConversationState | null;
    products: ProductResult[];
    context: Record<string, string>;
}

export enum ConversationalSearchResponseKind {
    Conversation,
    Results,
    Error,
}

const conversationalSearchApiBaseUrl = 'https://cdn.relewise.com/relewisedemoshop-1131137e-b167-48e2-90a4-e7981e0dc391/production';

export async function conversationalSearch(
    datasetId: string,
    request: ConversationalSearchRequest,
    abortSignal?: AbortSignal,
) {
    const response = await fetch(`${conversationalSearchApiBaseUrl}/api/${datasetId}/conversational-search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortSignal,
    });

    if (!response.ok) {
        throw new Error(response.status === 401
            ? 'The dataset API key was rejected.'
            : `Conversational search failed with status ${response.status}.`);
    }

    return await response.json() as ConversationalSearchResponse;
}

export function emptyConversationState(): ConversationState {
    return {
        originalRequest: '',
        audienceContext: '',
        interests: '',
        budget: '',
        messages: [],
        searchPhrase: '',
        maxSalesPrice: null,
    };
}
