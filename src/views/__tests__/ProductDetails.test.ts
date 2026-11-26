import ProductDetails from '@/views/ProductDetails.vue';
import contextStore from '@/stores/context.store';
import { DataValueFactory, type ProductResult, type VariantResult } from '@relewise/client';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ searchProducts: vi.fn(), addProduct: vi.fn() }));

vi.mock('@/stores/context.store', async() => {
    const { ref } = await import('vue');
    const { UserFactory } = await import('@relewise/client');
    return { default: {
        context: ref({ variantDimensionKeys: ['Size'] }),
        activeContextRevision: ref(0),
        language: ref('en-gb'),
        defaultSettings: { language: 'en-gb', currency: 'EUR', displayedAtLocation: 'test', user: UserFactory.anonymous() },
        selectedProductProperties: { allVariants: true, pricing: true },
        productAvailabilityFilters: vi.fn(),
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

function response(variant?: VariantResult | null): { status: number; results: ProductResult[] } {
    return {
        status: 200,
        results: variant !== undefined ? [{
            productId: 'demo-product', displayName: 'Demo product', variant, rank: 1, salesPrice: 100, listPrice: 110,
            filteredVariants: variants,
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

async function mountProductPage(path = '/product/demo-product/variant/a') {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { name: 'product', path: '/product/:id', component: ProductDetails },
            { name: 'variant', path: '/product/:id/variant/:variant', component: ProductDetails },
        ],
    });
    await router.push(path);
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
        vi.mocked(contextStore.productAvailabilityFilters).mockReset();
        contextStore.context.value.variantDimensionKeys = ['Size'];
        contextStore.context.value.storeQuantityDataKey = undefined;
    });

    it.each(['empty result', 'rejected request'])('hides stale details and allows retry after a failed variant request (%s)', async(failure) => {
        const request = pendingResponse();
        mocks.searchProducts.mockResolvedValueOnce(response(variants[0]))
            .mockReturnValueOnce(request.promise).mockResolvedValueOnce(response(variants[1]));
        const { router, wrapper } = await mountProductPage();
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

        const retry = wrapper.get('[role="status"] + button');
        expect(retry.text()).toBe('Retry');
        await retry.trigger('click');
        await flushPromises();

        expect(mocks.searchProducts).toHaveBeenCalledTimes(3);
        expect(router.currentRoute.value.path).toBe('/product/demo-product/variant/b');
        expect(wrapper.find('[role="status"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Variant B');
        expect(wrapper.text()).toContain('EUR 22');
    });

    it('retries a failed first load on the product URL', async() => {
        mocks.searchProducts.mockResolvedValueOnce(response()).mockResolvedValueOnce(response(null));
        const path = '/product/demo-product';
        const { router, wrapper } = await mountProductPage(path);
        expect(wrapper.get('[role="status"]').text()).toBe('Product unavailable.');

        await wrapper.get('[role="status"] + button').trigger('click');
        await flushPromises();

        expect(mocks.searchProducts).toHaveBeenCalledTimes(2);
        expect(router.currentRoute.value.path).toBe(path);
        expect(wrapper.find('[role="status"]').exists()).toBe(false);
        expect(wrapper.get('h1').text()).toBe('Demo product');
        expect(wrapper.get('fieldset').text()).toContain('Small');
    });

    it('uses the latest route when an older variant response arrives last', async() => {
        const older = pendingResponse();
        mocks.searchProducts.mockResolvedValueOnce(response(variants[0]))
            .mockReturnValueOnce(older.promise).mockResolvedValueOnce(response(variants[2]));
        const { router, wrapper } = await mountProductPage();
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

    it('keeps the newest stock result when navigating from variant A to B and back to A', async() => {
        contextStore.context.value.storeQuantityDataKey = 'Stock';
        const firstA = pendingResponse();
        const pendingB = pendingResponse();
        const latestA = pendingResponse();
        mocks.searchProducts.mockReturnValueOnce(firstA.promise)
            .mockReturnValueOnce(pendingB.promise).mockReturnValueOnce(latestA.promise);
        const { router, wrapper } = await mountProductPage();
        await router.push('/product/demo-product/variant/b');
        await router.push('/product/demo-product/variant/a');
        expect(mocks.searchProducts).toHaveBeenCalledTimes(3);

        const stockResponse = (variant: VariantResult, quantity: number) => response({
            ...variant, data: { Stock: DataValueFactory.number(quantity) },
        });
        const stockPanel = 'section[aria-labelledby="store-availability-heading"]';
        expect(wrapper.find(stockPanel).exists()).toBe(false);
        latestA.resolve(stockResponse(variants[0]!, 8));
        await flushPromises();
        expect(wrapper.get(stockPanel).text()).toContain('8 in stock');

        pendingB.resolve(stockResponse(variants[1]!, 4));
        firstA.resolve(stockResponse(variants[0]!, 99));
        await flushPromises();
        expect(wrapper.get(stockPanel).text()).toContain('8 in stock');
    });

    it('requests specifications and lets shoppers select a variant with no configured data keys', async() => {
        contextStore.context.value.variantDimensionKeys = [];
        vi.mocked(contextStore.productAvailabilityFilters).mockImplementation(builder => {
            builder.addProductAssortmentFilter([15]);
        });
        mocks.searchProducts.mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response(variants[0]));
        const { router, wrapper } = await mountProductPage('/product/demo-product');

        const addButton = () => wrapper.findAll('button').find(button => button.text() === 'Add to cart')!;
        expect(wrapper.get('legend').text()).toBe('Size');
        expect(addButton().attributes('disabled')).toBeDefined();
        await wrapper.get('fieldset button').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe('/product/demo-product/variant/a');
        expect(wrapper.get('fieldset button').attributes('aria-pressed')).toBe('true');
        expect(addButton().attributes('disabled')).toBeUndefined();
        expect(wrapper.text()).toContain('EUR 11');
        expect(wrapper.text()).not.toContain('EUR 110');
        const companyFilter = expect.arrayContaining([expect.objectContaining({ assortments: [15] })]);
        expect(mocks.searchProducts.mock.lastCall?.[0]).toMatchObject({
            filters: { items: companyFilter },
            settings: {
                selectedProductProperties: {
                    allVariants: false,
                    filteredVariants: { inheritFiltersFromRequest: false, filters: { items: companyFilter } },
                },
                selectedVariantProperties: { allSpecifications: true, pricing: true },
            },
        });
    });
});
