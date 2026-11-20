import { assert, describe, expect, it } from 'vitest';
import { createDatasetSnapshot, normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import { applySharedDatasetImportDecision, buildSharedDataset, createDatasetFromSharedDataset, getDefaultSharedDatasetImportDecision, getSharedDatasetDiff, parseSharedDataset } from '@/helpers/sharedDataset';
import { decodeSharePayload, encodeSharePayload } from '@/helpers/shareEncoding';

const dataset = {
    datasetId: 'dataset',
    apiKey: 'api-key',
    allLanguages: ['en'],
    allCurrencies: ['USD'],
};

describe('datasetConfiguration', () => {
    it('disables conversational search by default', () => {
        expect(normalizeDatasetConfiguration(dataset).conversationalSearchEnabled).toBe(false);
    });

    it('preserves enabled conversational search', () => {
        expect(normalizeDatasetConfiguration({
            ...dataset,
            conversationalSearchEnabled: true,
        }).conversationalSearchEnabled).toBe(true);
    });
});

describe('dataset branding', () => {
    const branding = { logoUrl: 'https://example.com/logo.svg', primaryColor: '#12AB34', secondaryColor: '#FFD93B' };

    it('normalizes optional local fields and tracks invalid drafts for save validation', () => {
        expect(normalizeDatasetConfiguration(dataset).branding).toBeUndefined();
        expect(normalizeDatasetConfiguration({
            ...dataset,
            branding: { logoUrl: 'data:image/png;base64,AA', primaryColor: ' #12ab34 ' },
        }).branding).toEqual({ primaryColor: '#12AB34' });
        expect(createDatasetSnapshot({ ...dataset, branding: { primaryColor: 'invalid' } }))
            .not.toBe(createDatasetSnapshot(dataset));
    });

    it('round-trips branding through the share payload and reviews changes to an existing dataset', () => {
        const shared = buildSharedDataset({ ...dataset, branding });
        const imported = parseSharedDataset(JSON.parse(decodeSharePayload(encodeSharePayload(JSON.stringify(shared)))));
        assert.isNotNull(imported, 'Expected the shared dataset to parse after encoding and decoding');
        expect(createDatasetFromSharedDataset(imported).branding).toEqual(branding);

        const diff = getSharedDatasetDiff(dataset, imported);
        expect(diff.requiresReview).toBe(true);
        expect(diff.coreFieldChanges.map(change => change.key)).toEqual(['logoUrl', 'primaryColor', 'secondaryColor']);

        const decision = getDefaultSharedDatasetImportDecision();
        expect(applySharedDatasetImportDecision({ ...dataset }, imported, { ...decision, coreFields: 'local' }).branding).toBeUndefined();
        expect(applySharedDatasetImportDecision({ ...dataset }, imported, decision).branding).toEqual(branding);
    });

    it('keeps local branding for older links and imports an explicit reset from a new link', () => {
        const local = { ...dataset, branding };
        const legacy = parseSharedDataset(dataset);
        assert.isNotNull(legacy, 'Expected the legacy share payload to parse');
        const reset = parseSharedDataset(buildSharedDataset(dataset));
        assert.isNotNull(reset, 'Expected the share payload with default branding to parse');
        const decision = getDefaultSharedDatasetImportDecision();

        expect(applySharedDatasetImportDecision({ ...local }, legacy, decision).branding).toEqual(branding);
        expect(getSharedDatasetDiff(local, reset).requiresReview).toBe(true);
        expect(applySharedDatasetImportDecision({ ...local }, reset, decision).branding).toBeUndefined();
    });
});
