import ConversationalSearchShoppingResults from '@/components/ConversationalSearchShoppingResults.vue';
import type { ConversationalSearchShoppingActivity } from '@/helpers/conversationalSearchApi';
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';

it('marks the selected filter with a checkmark and a pressed state', async() => {
    const activity: ConversationalSearchShoppingActivity = {
        status: 'ready',
        searchTerm: 'chairs',
        filters: { brand: 'Oak' },
        result: {
            products: [],
            recommendations: [],
            facets: [{ key: 'brand', values: ['Oak', 'Pine'] }],
            source: 'test',
            currency: 'DKK',
        },
    };
    const wrapper = mount(ConversationalSearchShoppingResults, {
        props: { activity, currency: 'DKK', language: 'en', loading: false, filtersVisible: true },
    });

    const selected = wrapper.get('button[aria-pressed="true"]');
    expect(selected.text()).toBe('Oak');
    expect(selected.find('svg[aria-hidden="true"]').exists()).toBe(true);
    const unselected = wrapper.get('button[aria-pressed="false"]');
    expect(unselected.text()).toBe('Pine');
    expect(unselected.find('svg').exists()).toBe(false);

    await selected.trigger('click');
    expect(wrapper.emitted('refine')).toEqual([[{ kind: 'facet', key: 'brand', value: null }]]);
    await wrapper.setProps({ activity: { ...activity, filters: { brand: 'Pine' } } });
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('Pine');
});
