import SettingsSharedDatasetImportDialog from '@/components/settings/SettingsSharedDatasetImportDialog.vue';
import { applySharedDatasetImportDecision, getDefaultSharedDatasetImportDecision, getSharedDatasetDiff, parseSharedDataset } from '@/helpers/sharedDataset';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';

const sharedFields = { datasetId: 'demo', apiKey: 'test-key' };

function localDataset() {
    return { ...sharedFields, allLanguages: ['en-gb'], allCurrencies: ['EUR'], variantDimensionKeys: ['Color', 'Size'] };
}

describe('shared variant dimensions', () => {
    it('requires review and displays both orders when dimensions are the only change', () => {
        const existingDataset = localDataset();
        const incoming = parseSharedDataset({ ...sharedFields, variantDimensionKeys: ['Size', 'Color'] })!;
        const diff = getSharedDatasetDiff(existingDataset, incoming);

        expect(diff.hasChanges).toBe(true);
        expect(diff.requiresReview).toBe(true);
        expect(diff.featureChanges).toMatchObject([{ key: 'variantDimensionKeys', currentValue: ['Color', 'Size'], nextValue: ['Size', 'Color'] }]);

        const wrapper = mount(SettingsSharedDatasetImportDialog, {
            props: {
                modelValue: true,
                pendingImport: { existingDataset, incoming, diff },
                importDecision: getDefaultSharedDatasetImportDecision(),
            },
            global: {
                stubs: {
                    ConfirmationDialog: defineComponent({ setup: (_, { slots }) => () => h('div', slots.content?.()) }),
                },
            },
        });
        expect(wrapper.findAll('dl dt').map(term => term.text())).toEqual(['Current order', 'Imported order']);
        expect(wrapper.findAll('dl dd').map(value => value.text())).toEqual(['Color → Size', 'Size → Color']);
        wrapper.unmount();

        const decision = getDefaultSharedDatasetImportDecision();
        applySharedDatasetImportDecision(existingDataset, incoming, { ...decision, features: 'local' });
        expect(existingDataset.variantDimensionKeys).toEqual(['Color', 'Size']);
        applySharedDatasetImportDecision(existingDataset, incoming, { ...decision, features: 'merge' });
        expect(existingDataset.variantDimensionKeys).toEqual(['Color', 'Size']);
        applySharedDatasetImportDecision(existingDataset, incoming, decision);
        expect(existingDataset.variantDimensionKeys).toEqual(['Size', 'Color']);
    });

    it('preserves local dimensions when an older link omits them', () => {
        const existingDataset = localDataset();
        const incoming = parseSharedDataset(sharedFields)!;

        expect(getSharedDatasetDiff(existingDataset, incoming).requiresReview).toBe(false);
        applySharedDatasetImportDecision(existingDataset, incoming, getDefaultSharedDatasetImportDecision());
        expect(existingDataset.variantDimensionKeys).toEqual(['Color', 'Size']);
    });

    it('requires review before explicitly clearing local dimensions', () => {
        const existingDataset = localDataset();
        const incoming = parseSharedDataset({ ...sharedFields, variantDimensionKeys: [] })!;

        expect(getSharedDatasetDiff(existingDataset, incoming).requiresReview).toBe(true);
        applySharedDatasetImportDecision(existingDataset, incoming, getDefaultSharedDatasetImportDecision());
        expect(existingDataset.variantDimensionKeys).toEqual([]);
    });
});
