import { describe, expect, it } from 'vitest';
import {
    applySharedDatasetImportDecision, buildSharedDataset, getDefaultSharedDatasetImportDecision, getSharedDatasetDiff, parseSharedDataset,
} from '@/helpers/sharedDataset';
import type { IDataset } from '@/stores/context.store';

function configuredDataset(): IDataset {
    return {
        datasetId: 'demo',
        apiKey: 'fixture-key',
        allLanguages: ['en'],
        allCurrencies: ['EUR'],
        companies: [{ id: 'workshop', assortmentIds: [15] }],
    };
}

describe('shared company assortments', () => {
    it('exports an explicit empty array for a company without restrictions', () => {
        const dataset = { ...configuredDataset(), companies: [{ id: 'workshop' }] };
        const serialized = JSON.parse(JSON.stringify(buildSharedDataset(dataset)));

        expect(serialized.companies).toEqual([{ id: 'workshop', assortmentIds: [] }]);
    });

    it('preserves restrictions when an older link omits the field', () => {
        const dataset = configuredDataset();
        const shared = parseSharedDataset({ ...dataset, companies: [{ id: 'workshop' }] })!;

        expect(getSharedDatasetDiff(dataset, shared).companyChanges.conflicts).toEqual([]);
        applySharedDatasetImportDecision(dataset, shared, getDefaultSharedDatasetImportDecision());
        expect(dataset.companies?.[0]?.assortmentIds).toEqual([15]);
    });

    it('shows a conflict and clears restrictions when importing an explicit empty array', () => {
        const dataset = configuredDataset();
        const shared = parseSharedDataset({ ...dataset, companies: [{ id: 'workshop', assortmentIds: [] }] })!;

        expect(getSharedDatasetDiff(dataset, shared).companyChanges.conflicts).toEqual([
            expect.objectContaining({ companyId: 'workshop' }),
        ]);
        applySharedDatasetImportDecision(dataset, shared, getDefaultSharedDatasetImportDecision());
        expect(dataset.companies?.[0]?.assortmentIds).toEqual([]);
    });
});
