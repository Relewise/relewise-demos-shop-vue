import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import { DataValueFactory as D, type DataValue } from '@relewise/client';
import VariantBasedProductList from '../VariantBasedProductList.vue';

async function render() {
    const router = createRouter({ history: createMemoryHistory(), routes: [
        { path: '/', component: { template: '<div />' } },
        { name: 'product', path: '/product/:id', component: { template: '<div />' } },
        { name: 'variant', path: '/product/:id/variant/:variant', component: { template: '<div />' } },
    ] });
    await router.push('/');
    const product = (productId: string, variantId: string, material: DataValue = D.string('Steel')) => ({ rank: 1, productId, displayName: productId, variant: { rank: 1, variantId, displayName: variantId, data: { material, Material: D.string('Wrong fallback') } } });
    const wrapper = mount(VariantBasedProductList, {
        props: { productResult: { hits: 4, results: [product('2832124', 'a', D.stringCollection(['Plastic', 'Copper'])), product('0461490', 'b'), product('2832124', 'c'), product('233928X', 'd')] } },
        global: { plugins: [router], stubs: { Image: true } },
    });
    return { wrapper, router };
}

describe('variant search results', () => {
    it('preserves API family and interleaved variant order rather than numeric key order', async() => {
        const { wrapper } = await render();
        expect(wrapper.findAll('h3').map(x => x.text())).toEqual(['2832124', '0461490', '233928X']);
        expect(wrapper.findAll('[role="link"]').map(x => x.text())).toEqual(expect.arrayContaining([expect.stringContaining('a'), expect.stringContaining('c')]));
        expect(wrapper.findAll('[role="link"]').map(x => x.text().trim().split('Material')[0].trim().replace('Variant name: ', ''))).toEqual(['a', 'c', 'b', 'd']);
    });

    it('links single matches to the article, multiple matches to the family, and supports keyboard selection', async() => {
        const { wrapper, router } = await render();
        expect(wrapper.findAll('h3 a').map(x => x.attributes('href'))).toEqual(['/product/2832124', '/product/0461490/variant/b', '/product/233928X/variant/d']);
        await wrapper.findAll('[role="link"]')[1].trigger('keydown', { key: 'Enter' });
        await router.isReady();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(router.currentRoute.value.fullPath).toBe('/product/2832124/variant/c');
        await wrapper.findAll('[role="link"]')[2].trigger('keydown', { key: ' ' });
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(router.currentRoute.value.fullPath).toBe('/product/0461490/variant/b');
    });

    it('renders collection materials as readable text with lowercase precedence', async() => {
        const { wrapper } = await render();
        expect(wrapper.text()).toContain('Plastic, Copper');
        expect(wrapper.text()).not.toContain('$values');
        expect(wrapper.text()).not.toContain('Wrong fallback');
    });
});
