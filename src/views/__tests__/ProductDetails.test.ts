import ProductDetails from '@/views/ProductDetails.vue';
import contextStore from '@/stores/context.store';
import type { ProductResult, VariantResult } from '@relewise/client';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ searchProducts: vi.fn(), addProduct: vi.fn() }));

vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    const { UserFactory } = await import('@relewise/client');
    return { default: {
        context: ref({ variantDimensionKeys: ['Size'] }),
        language: ref('en-gb'),
        defaultSettings: { language: 'en-gb', currency: 'EUR', displayedAtLocation: 'test', user: UserFactory.anonymous() },
        selectedProductProperties: { allVariants: true, pricing: true },
        userClassificationBasedFilters: vi.fn(),
        assertApiCall: vi.fn(),
        getSearcher: () => ({ searchProducts: mocks.searchProducts }),
    } };
});
vi.mock('@/services/basket.service', () => ({ default: { addProduct: mocks.addProduct, model: { value: { lineItems: [] } } } }));
vi.mock('@/services/tracking.service', () => ({ default: { trackProductView: vi.fn(), trackCart: vi.fn() } }));

const variants: VariantResult[] = [
    { variantId: 'a', rank: 1, displayName: 'Variant A', specification: { Size: 'Small' }, salesPrice: 11 },
    { variantId: 'b', rank: 2, displayName: 'Variant B', specification: { Size: 'Medium' }, salesPrice: 22 },
    { variantId: 'c', rank: 3, displayName: 'Variant C', specification: { Size: 'Large' }, salesPrice: 33 },
];

function response(variant?: VariantResult): { status: number; results: ProductResult[] } {
    return {
        status: 200,
        results: variant ? [{
            productId: 'demo-product', displayName: 'Demo product', variant, rank: 1, salesPrice: 100, listPrice: 110,
            filteredVariants: variants, allVariants: variants,
        }] : [],
    };
}

function pendingResponse() {
    let resolve!: (value: ReturnType<typeof response>) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<ReturnType<typeof response>>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

async function mountVariantPage() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ name: 'variant', path: '/product/:id/variant/:variant', component: ProductDetails }],
    });
    await router.push('/product/demo-product/variant/a');
    const wrapper = mount(ProductDetails, {
        global: { plugins: [router], mocks: { $format: (value: number) => `EUR ${value}` }, stubs: { Image: true } },
    });
    await flushPromises();
    return { router, wrapper };
}

enableAutoUnmount(afterEach);

describe('product variant details', () => {
    beforeEach(() => {
        mocks.searchProducts.mockReset();
        mocks.addProduct.mockReset();
        contextStore.context.value.variantDimensionKeys = ['Size'];
    });

    it.each(['empty result', 'rejected request'])('keeps the selector and hides the previous variant after an %s', async(failure) => {
        const request = pendingResponse();
        mocks.searchProducts.mockResolvedValueOnce(response(variants[0])).mockReturnValueOnce(request.promise);
        const { router, wrapper } = await mountVariantPage();
        expect(wrapper.text()).toContain('Variant A');
        expect(wrapper.text()).toContain('EUR 11');

        await router.push('/product/demo-product/variant/b');
        expect(wrapper.text()).not.toContain('Variant A');
        expect(wrapper.find('image-stub').exists()).toBe(false);
        expect(wrapper.get('fieldset').text()).toContain('Medium');

        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            if (failure === 'empty result') request.resolve(response());
            else request.reject(new Error('Search unavailable'));
            await flushPromises();
        } finally {
            consoleError.mockRestore();
        }

        expect(wrapper.get('[role="status"]').text()).toBe('This variant could not be loaded.');
        expect(wrapper.get('fieldset').text()).toContain('Large');
        expect(wrapper.text()).not.toMatch(/Variant A|EUR 11|Add to cart/);
    });

    it('uses the latest route when an older variant response arrives last', async() => {
        const older = pendingResponse();
        mocks.searchProducts.mockResolvedValueOnce(response(variants[0]))
            .mockReturnValueOnce(older.promise).mockResolvedValueOnce(response(variants[2]));
        const { router, wrapper } = await mountVariantPage();
        await router.push('/product/demo-product/variant/b');
        await router.push('/product/demo-product/variant/c');
        await flushPromises();
        older.resolve(response(variants[1]));
        await flushPromises();

        const addButton = wrapper.findAll('button').find(button => button.text() === 'Add to cart')!;
        expect(wrapper.text()).toContain('Variant C');
        expect(wrapper.text()).not.toContain('Variant B');
        expect(addButton.attributes('disabled')).toBeUndefined();
        await addButton.trigger('click');
        expect(mocks.addProduct).toHaveBeenCalledWith({ quantityDelta: 1, product: expect.objectContaining({
            salesPrice: 33, listPrice: 33, variant: expect.objectContaining({ variantId: 'c' }),
        }) });
    });

    it('uses the selected variant price with an unconfigured selector', async() => {
        contextStore.context.value.variantDimensionKeys = [];
        mocks.searchProducts.mockResolvedValueOnce(response(variants[0]));
        const { wrapper } = await mountVariantPage();

        expect(wrapper.text()).toContain('EUR 11');
        expect(wrapper.text()).not.toContain('EUR 110');
        expect(mocks.searchProducts.mock.calls[0]?.[0]).toMatchObject({ settings: { selectedVariantProperties: { pricing: true } } });
    });
});
