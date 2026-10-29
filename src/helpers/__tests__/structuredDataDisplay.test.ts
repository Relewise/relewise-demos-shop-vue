import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { DataValueFactory as D } from '@relewise/client';
import DataValueList from '@/components/DataValueList.vue';

it('renders typed document records as fields and links instead of object strings', () => {
    const wrapper = mount(DataValueList, { props: { entries: [['documents', {
        type: 'ObjectList', isCollection: true, value: { $values: [{ data: { market: D.string('se'), url: D.string('https://example.com/manual.pdf') } }] },
    }]] } });
    expect(wrapper.get('a').attributes('href')).toBe('https://example.com/manual.pdf');
    expect(wrapper.text()).toContain('se');
    expect(wrapper.text()).not.toContain('[object Object]');
});
