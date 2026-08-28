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

    it('shows a resolved price-list amount without sale presentation', () => {
        resolveProductPrice.mockReturnValue({ salesPrice: 70, listPrice: null, currency: 'DKK', source: 'price-list' });

        const wrapper = renderTile();

        expect(wrapper.text()).toContain('70');
        expect(wrapper.text()).not.toContain('ON SALE');
        expect(wrapper.text()).not.toContain('100');
    });

    it('preserves Relewise sales and list prices when no price-list price resolves', () => {
        resolveProductPrice.mockReturnValue({ salesPrice: 80, listPrice: 100, currency: 'DKK', source: 'relewise' });

        const wrapper = renderTile();

        expect(wrapper.text()).toContain('80');
        expect(wrapper.text()).toContain('100');
        expect(wrapper.text()).toContain('ON SALE');
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
