import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/context.store', () => ({
    default: { context: { value: { allowThirdLevelCategories: false } } },
}));

import AgreedOrderFacet from '@/components/AgreedOrderFacet.vue';
import Facet from '@/components/Facet.vue';
import Sorting from '@/components/Sorting.vue';

const agreedOrderFacet = (hits: number) => ({
    field: 'Data',
    key: 'AgreedOrders',
    items: [{
        field: 'Data',
        key: 'HasAgreedOrder',
        available: hits > 0 ? [{ value: 1, hits, selected: false }] : [],
    }],
}) as any;

describe('AgreedOrderFacet', () => {
    it('renders the dynamic hit count and emits the existing URL-filter shape', async() => {
        const wrapper = mount(AgreedOrderFacet, {
            props: { filters: {}, hits: 7 },
        });

        expect(wrapper.text()).toContain('Has agreed order');
        expect(wrapper.text()).toContain('7');

        await wrapper.get('input').trigger('click');

        expect(wrapper.emitted('search')).toEqual([[{
            name: 'agreedOrder',
            value: 'true',
            handlefilters: true,
        }]]);
    });

    it('reflects an existing agreedOrder=true selection', () => {
        const wrapper = mount(AgreedOrderFacet, {
            props: { filters: { agreedOrder: ['true'] }, hits: 3 },
        });

        expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(true);
    });

    it('hides zero-hit agreement facets unless the URL selection is active', () => {
        const hidden = mount(Facet, {
            props: { facet: agreedOrderFacet(0), filters: {}, context: 'Category' },
            global: { stubs: { CategoryFacet: true, CheckListFacet: true, RangeFacet: true } },
        });
        const selected = mount(Facet, {
            props: {
                facet: agreedOrderFacet(0),
                filters: { agreedOrder: 'true' },
                context: 'Category',
            },
            global: { stubs: { CategoryFacet: true, CheckListFacet: true, RangeFacet: true } },
        });

        expect(hidden.text()).toBe('');
        expect(selected.text()).toContain('Has agreed order');
    });
});

describe('agreement sorting', () => {
    it('only exposes Agreed orders first when agreement access is available', async() => {
        const hidden = mount(Sorting, {
            props: { modelValue: '', type: 'Product' },
        });
        const visible = mount(Sorting, {
            props: { modelValue: '', type: 'Product', showAgreedOrderSort: true },
        });

        expect(hidden.find('option[value="AgreedOrderFirst"]').exists()).toBe(false);
        expect(visible.get('option[value="AgreedOrderFirst"]').text()).toBe('Agreed orders first');

        await visible.get('select').setValue('AgreedOrderFirst');
        expect(visible.emitted('update:modelValue')).toEqual([['AgreedOrderFirst']]);
    });
});
