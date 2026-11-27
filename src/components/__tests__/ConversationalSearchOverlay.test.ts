import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ConversationalSearchOverlay from '@/components/ConversationalSearchOverlay.vue';
import { streamConversationalSearch } from '@/helpers/conversationalSearchApi';

vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    return { default: {
        context: ref({ datasetId: 'dataset', apiKey: 'test-key' }),
        isConfigured: ref(true),
        language: ref('en-US'),
        currencyCode: ref('USD'),
        user: ref({}),
        selectedProductProperties: {},
    } };
});
vi.mock('@/helpers/conversationalSearchApi', () => ({ streamConversationalSearch: vi.fn() }));
vi.mock('@/services/basket.service', () => ({ default: { addProduct: vi.fn() } }));
vi.mock('@/helpers/imageHelper', () => ({ findImage: vi.fn() }));
vi.mock('@/stores/globalProductFilters', () => ({ globalProductRecommendationFilters: vi.fn() }));
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn() } }));

enableAutoUnmount(afterEach);

const product = { id: 'jacket-1', name: 'Leather jacket', brand: '', category: '', price: 100, image: '', description: '' };
const groups = [
    { id: 'jackets', title: 'Jackets', searchTerm: 'leather jacket', properties: [] },
    { id: 'jeans', title: 'Jeans', searchTerm: 'denim jeans', properties: [] },
];

function mountAssistant() {
    return shallowMount(ConversationalSearchOverlay, { global: { stubs: { Teleport: true } } });
}

async function ask(wrapper: ReturnType<typeof mountAssistant>) {
    (wrapper.vm as unknown as { openWithPrompt: (prompt: string) => void }).openWithPrompt('Find me a concert outfit');
    await nextTick();
    await wrapper.get('input').setValue('Find me a concert outfit');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
}

describe('shopping assistant grouped searches and navigation', () => {
    beforeEach(() => {
        vi.stubGlobal('scrollTo', vi.fn());
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
        vi.mocked(streamConversationalSearch).mockReset();
        vi.mocked(streamConversationalSearch).mockImplementation(async(_dataset, _request, receive) => {
            receive({ type: 'TEXT_MESSAGE_START', messageId: 'reply' });
            receive({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'reply', delta: 'Here is your outfit.' });
            receive({ type: 'STATE_SNAPSHOT', snapshot: { searchTerm: '', searches: groups } });
            for (const group of groups) {
                receive({
                    type: 'ACTIVITY_SNAPSHOT', messageId: group.id, activityType: 'SHOPPING_RESULTS', replace: true,
                    content: {
                        status: 'ready', groupId: group.id, title: group.title, searchTerm: group.searchTerm, filters: {},
                        result: { products: [{ ...product, id: group.id + '-1' }], recommendations: [], facets: [], source: 'Relewise', currency: 'USD' },
                    },
                });
            }
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('preserves the conversation when opening a product and offers a way back', async() => {
        const wrapper = mountAssistant();
        await ask(wrapper);
        expect(wrapper.text()).toContain('Here is your outfit.');

        wrapper.findComponent({ name: 'ConversationalSearchShoppingResults' }).vm.$emit('navigate');
        await nextTick();
        expect(wrapper.find('form').exists()).toBe(false);
        const resume = wrapper.findAll('button').find(button => button.text() === 'Back to Shopping Assistant')!;
        expect(resume.exists()).toBe(true);

        await resume.trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('Here is your outfit.');
        expect(wrapper.findAllComponents({ name: 'ConversationalSearchShoppingResults' })).toHaveLength(2);
        expect(streamConversationalSearch).toHaveBeenCalledTimes(1);

        await wrapper.get('[aria-label="Close shopping assistant"]').trigger('click');
        (wrapper.vm as unknown as { openWithPrompt: (prompt: string) => void }).openWithPrompt('');
        await nextTick();
        expect(wrapper.text()).not.toContain('Here is your outfit.');
    });

    it('sends the clicked group ID when refining and all current groups as product context', async() => {
        const wrapper = mountAssistant();
        await ask(wrapper);
        const cards = wrapper.findAllComponents({ name: 'ConversationalSearchShoppingResults' });
        cards[0]!.vm.$emit('refine', { kind: 'facet', key: 'brand', value: 'brand-1' });
        await flushPromises();

        expect(vi.mocked(streamConversationalSearch).mock.calls[1]?.[1].forwardedProps).toMatchObject({
            activityMessageId: 'jackets',
            shoppingAction: { kind: 'facet', key: 'brand', value: 'brand-1', groupId: 'jackets' },
            productContext: { productIds: ['jackets-1'] },
        });

        await wrapper.get('input').setValue('Tell me about the jeans');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(vi.mocked(streamConversationalSearch).mock.calls[2]?.[1].forwardedProps.productContext?.productIds)
            .toEqual(['jackets-1', 'jeans-1']);
    });
});
