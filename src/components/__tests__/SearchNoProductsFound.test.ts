import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { DataValueFactory as D } from '@relewise/client';
import contextStore from '@/stores/context.store';
import SearchNoProductsFound from '../SearchNoProductsFound.vue';
vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    return { default: { context: ref({ variantOwnedData: true }), language: ref('sv-se'), user: ref({ classifications: { channel: 'electrical' } }) } };
});
it('keeps no-result fallback cards within the same article market and contract', () => {
    const article = (id: string, market: string, channel: string) => ({ rank: 1, productId: id, variant: { rank: 1, variantId: id, data: { AvailableInMarkets: D.stringCollection([market]), AvailableInChannels: D.stringCollection([channel]) } } });
    const render = () => mount(SearchNoProductsFound, { props: { term: 'missing', productRecommendations: { recommendations: [article('eligible', 'se', 'electrical'), article('wrong-market', 'fi', 'electrical'), article('wrong-contract', 'se', 'plumbing'), { productId: 'no-article', rank: 1 }] } }, global: { stubs: { PopularCategories: true, ProductTile: { props: ['product'], template: '<div>{{ product.productId }}</div>' } } } });
    const wrapper = render();
    expect(wrapper.text()).toContain('eligible');
    expect(wrapper.text()).not.toContain('wrong-market');
    expect(wrapper.text()).not.toContain('wrong-contract');
    expect(wrapper.text()).not.toContain('no-article');
    wrapper.unmount();
    contextStore.user.value.classifications!.channel = 'denied';
    expect(render().text()).not.toContain('Recommended for you');
});
