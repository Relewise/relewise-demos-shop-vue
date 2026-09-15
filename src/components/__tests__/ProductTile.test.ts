import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductResult } from '@relewise/client';

const resolveProductPrice = vi.hoisted(() => vi.fn());

vi.mock('@/stores/context.store', () => ({
    default: {
        context: { value: { searchHighlight: false, showProductRelevanceScore: false, showVariantsBadge: false } },
        resolveProductPrice,
    },
}));

import ProductTile from '@/components/ProductTile.vue';

const product = {
    productId: 'product-1',
    displayName: 'Test product',
    salesPrice: 80,
    listPrice: 100,
    rank: 1,
} as ProductResult;

describe('ProductTile pricing', () => {
    beforeEach(() => resolveProductPrice.mockReset());

    it('shows a resolved scoped amount without sale presentation', () => {
        resolveProductPrice.mockReturnValue({ amount: 70, currency: 'DKK', source: 'PriceList' });

        const wrapper = renderTile();

        expect(wrapper.text()).toContain('70');
        expect(wrapper.text()).not.toContain('ON SALE');
        expect(wrapper.text()).not.toContain('100');
    });

    it('does not render native sales or list prices when no scoped price resolves', () => {
        resolveProductPrice.mockReturnValue({ amount: null, currency: 'DKK', source: null });

        const wrapper = renderTile();

        expect(wrapper.text()).not.toContain('80');
        expect(wrapper.text()).not.toContain('100');
        expect(wrapper.text()).not.toContain('ON SALE');
    });
});

function renderTile() {
    return mount(ProductTile, {
        props: { product },
        global: {
            mocks: { $format: (value: number | null) => value === null ? '' : String(value) },
            stubs: {
                RouterLink: { template: '<a><slot /></a>' },
                Image: true,
                Popover: true,
            },
        },
    });
}
