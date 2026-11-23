import ConversationalSearchProductDetail from '@/components/ConversationalSearchProductDetail.vue';
import ConversationalSearchProductTile from '@/components/ConversationalSearchProductTile.vue';
import ImageWithFallback from '@/components/ImageWithFallback.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineCustomElement, nextTick } from 'vue';

vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    return { default: { context: ref({ productPlaceholderImageUrl: '/placeholder.png' }) } };
});

describe('ImageWithFallback', () => {
    it('uses the configured image for missing sources and retries when the source changes', async() => {
        const image = mount(ImageWithFallback, {
            props: { src: ' ', fallback: '/placeholder.png', alt: 'Product' },
        });

        expect(image.get('img').attributes('src')).toBe('/placeholder.png');
        await image.get('img').trigger('error');
        expect(image.find('svg').exists()).toBe(true);

        await image.setProps({ src: '/product.png' });
        expect(image.get('img').attributes('src')).toBe('/product.png');
        await image.get('img').trigger('error');
        expect(image.get('img').attributes('src')).toBe('/placeholder.png');
    });

    it('renders the fallback as a light DOM image inside a recommendation shadow root', async() => {
        const tag = 'app-test-image-with-fallback';
        customElements.define(tag, defineCustomElement(ImageWithFallback, { shadowRoot: false }));
        const host = document.createElement('div');
        const recommendation = host.attachShadow({ mode: 'open' });
        recommendation.innerHTML = `<${tag} alt="Product" image-class="image" fallback="/placeholder.png"></${tag}>`;
        document.body.append(host);

        try {
            await nextTick();
            expect(recommendation.querySelector('img.image')?.getAttribute('src')).toBe('/placeholder.png');
        }
        finally {
            host.remove();
        }
    });

    it('shows the product placeholder in conversational search cards and product details', () => {
        const product = {
            id: 'product', name: 'Product', brand: '', category: '', description: '', image: '', price: null,
        };
        const global = { stubs: { RouterLink: true }, renderStubDefaultSlot: true };
        const card = mount(ConversationalSearchProductTile, {
            props: { product, currency: 'EUR', language: 'en' }, global,
        });
        const details = mount(ConversationalSearchProductDetail, {
            props: { activity: { product, currency: 'EUR', status: 'ready' }, language: 'en' }, global,
        });

        expect(card.get('img').attributes('src')).toBe('/placeholder.png');
        expect(details.get('img').attributes('src')).toBe('/placeholder.png');
    });
});
