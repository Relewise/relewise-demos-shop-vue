import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import {
    applySharedDatasetImportDecision,
    buildSharedDataset,
    createDatasetFromSharedDataset,
    getDefaultSharedDatasetImportDecision,
    getSharedDatasetDiff,
    parseSharedDataset,
    resolveSharedDatasetSessionSelections,
} from '@/helpers/sharedDataset';
import type { IDataset } from '@/stores/context.store';
import { DataValueFactory } from '@relewise/client';
import { describe, expect, it } from 'vitest';

function createDataset(overrides: Partial<IDataset> = {}): IDataset {
    return normalizeDatasetConfiguration({
        datasetId: 'demo-dataset',
        apiKey: 'demo-key',
        displayName: 'Demo dataset',
        allLanguages: ['en'],
        allCurrencies: ['EUR'],
        trackingEnabled: false,
        allowThirdLevelCategories: false,
        hideSoldOutProducts: false,
        userClassificationFilters: false,
        showProductRelevanceScore: false,
        B2bRecommendations: false,
        showVariantsBadge: false,
        similarProductsOnPdp: false,
        variantBasedSearchOverlay: false,
        searchHighlight: false,
        contentSearch: false,
        shoppertainmentEnabled: false,
        users: [],
        companies: [],
        ...overrides,
    });
}

describe('sharedDataset helpers', () => {
    it('builds and parses a share payload with personalization, features, and selections', () => {
        const dataset = createDataset({
            trackingEnabled: true,
            hideSoldOutProducts: true,
            contentSearch: true,
            users: [{
                authenticatedId: 'auth-user',
                email: 'demo@example.com',
                classifications: { country: 'DK' },
            }],
            companies: [{
                id: 'company-a',
                parent: { id: 'parent-company' },
            }],
        });

        const parsedDataset = parseSharedDataset(JSON.parse(JSON.stringify(buildSharedDataset(dataset, {
            language: 'da',
            currencyCode: 'dkk',
            selectedUserIndex: 0,
            selectedCompanyId: 'company-a',
        }))));

        expect(parsedDataset).toMatchObject({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            language: 'da',
            currencyCode: 'DKK',
            trackingEnabled: true,
            hideSoldOutProducts: true,
            contentSearch: true,
            selectedUserIndex: 0,
            selectedCompanyId: 'company-a',
        });
        expect(parsedDataset?.users).toHaveLength(1);
        expect(parsedDataset?.companies).toHaveLength(1);
        expect(parsedDataset?.companies?.[0]?.parent?.id).toBe('parent-company');
    });

    it('remains backward compatible with share payloads that only contain core dataset fields', () => {
        const parsedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            displayName: 'Legacy share',
            language: 'en',
            allLanguages: ['en'],
            currencyCode: 'eur',
            allCurrencies: ['eur'],
        });

        expect(parsedDataset).toMatchObject({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            displayName: 'Legacy share',
            language: 'en',
            currencyCode: 'EUR',
        });
        expect(parsedDataset?.users).toBeUndefined();
        expect(parsedDataset?.companies).toBeUndefined();

        const createdDataset = createDatasetFromSharedDataset(parsedDataset!);
        expect(createdDataset.users).toEqual([]);
        expect(createdDataset.companies).toEqual([]);
        expect(createdDataset.hideSoldOutProducts).toBe(false);
        expect(createdDataset.trackingEnabled).toBe(false);
    });

    it('creates a dataset from a shared payload with imported users, companies, and feature flags intact', () => {
        const createdDataset = createDatasetFromSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            allLanguages: ['en', 'da'],
            allCurrencies: ['EUR', 'DKK'],
            trackingEnabled: true,
            hideSoldOutProducts: true,
            showVariantsBadge: true,
            users: [{ email: 'demo@example.com' }],
            companies: [{ id: 'company-a' }],
        });

        expect(createdDataset.trackingEnabled).toBe(true);
        expect(createdDataset.hideSoldOutProducts).toBe(true);
        expect(createdDataset.showVariantsBadge).toBe(true);
        expect(createdDataset.users).toMatchObject([{ email: 'demo@example.com' }]);
        expect(createdDataset.companies).toMatchObject([{ id: 'company-a' }]);
    });

    it('computes diff sections for core fields, features, users, and companies', () => {
        const localDataset = createDataset({
            apiKey: 'local-key',
            hideSoldOutProducts: false,
            users: [{ authenticatedId: 'local-user' }],
            companies: [{ id: 'company-a', data: { tier: DataValueFactory.string('gold') } }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'shared-key',
            hideSoldOutProducts: true,
            users: [
                { authenticatedId: 'local-user' },
                { authenticatedId: 'shared-user' },
            ],
            companies: [
                { id: 'company-a', data: { tier: DataValueFactory.string('silver') } },
                { id: 'company-b' },
            ],
            selectedUserIndex: 1,
            selectedCompanyId: 'company-b',
        })!;

        const diff = getSharedDatasetDiff(localDataset, sharedDataset);

        expect(diff.coreFieldChanges.map((change) => change.key)).toEqual(['displayName', 'apiKey']);
        expect(diff.requiresReview).toBe(true);
        expect(diff.featureChanges).toMatchObject([
            { key: 'hideSoldOutProducts', currentValue: false, nextValue: true },
        ]);
        expect(diff.userChanges.matchedCount).toBe(1);
        expect(diff.userChanges.additions).toHaveLength(1);
        expect(diff.companyChanges.additions).toHaveLength(1);
        expect(diff.companyChanges.conflicts).toHaveLength(1);
        expect(diff.sharedSelection).toMatchObject({
            selectedUserLabel: 'shared-user',
            selectedCompanyLabel: 'company-b',
            hasSelection: true,
        });
    });

    it('treats additive-only user and company changes as silent apply changes, not review blockers', () => {
        const localDataset = createDataset({
            users: [{ authenticatedId: 'local-user' }],
            companies: [{ id: 'local-company' }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            displayName: 'Demo dataset',
            users: [
                { authenticatedId: 'local-user' },
                { authenticatedId: 'shared-user' },
            ],
            companies: [
                { id: 'local-company' },
                { id: 'shared-company' },
            ],
        })!;

        const diff = getSharedDatasetDiff(localDataset, sharedDataset);

        expect(diff.userChanges.additions).toHaveLength(1);
        expect(diff.userChanges.conflicts).toHaveLength(0);
        expect(diff.companyChanges.additions).toHaveLength(1);
        expect(diff.companyChanges.conflicts).toHaveLength(0);
        expect(diff.hasChanges).toBe(true);
        expect(diff.requiresReview).toBe(false);
    });

    it('detects user conflicts when a unique user key overlaps but details differ', () => {
        const localDataset = createDataset({
            users: [{ authenticatedId: 'shared-user', classifications: { channel: 'B2C' } }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            users: [{ authenticatedId: 'shared-user', classifications: { channel: 'B2B' } }],
        })!;

        const diff = getSharedDatasetDiff(localDataset, sharedDataset);

        expect(diff.userChanges.additions).toHaveLength(0);
        expect(diff.userChanges.conflicts).toHaveLength(1);
        expect(diff.requiresReview).toBe(true);
    });

    it('applies feature decisions for replace, merge, and local', () => {
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            trackingEnabled: false,
            hideSoldOutProducts: true,
            contentSearch: false,
            showVariantsBadge: true,
        })!;

        const replaceDataset = createDataset({
            trackingEnabled: true,
            hideSoldOutProducts: false,
            contentSearch: true,
            showVariantsBadge: false,
        });
        applySharedDatasetImportDecision(replaceDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            features: 'replace',
        });
        expect(replaceDataset.trackingEnabled).toBe(false);
        expect(replaceDataset.hideSoldOutProducts).toBe(true);
        expect(replaceDataset.contentSearch).toBe(false);
        expect(replaceDataset.showVariantsBadge).toBe(true);

        const mergeDataset = createDataset({
            trackingEnabled: true,
            hideSoldOutProducts: false,
            contentSearch: true,
            showVariantsBadge: false,
        });
        applySharedDatasetImportDecision(mergeDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            features: 'merge',
        });
        expect(mergeDataset.trackingEnabled).toBe(true);
        expect(mergeDataset.hideSoldOutProducts).toBe(true);
        expect(mergeDataset.contentSearch).toBe(true);
        expect(mergeDataset.showVariantsBadge).toBe(true);

        const localDataset = createDataset({
            trackingEnabled: true,
            hideSoldOutProducts: false,
            contentSearch: true,
            showVariantsBadge: false,
        });
        applySharedDatasetImportDecision(localDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            features: 'local',
        });
        expect(localDataset.trackingEnabled).toBe(true);
        expect(localDataset.hideSoldOutProducts).toBe(false);
        expect(localDataset.contentSearch).toBe(true);
        expect(localDataset.showVariantsBadge).toBe(false);
    });

    it('applies additions only for users and companies without overwriting conflicts', () => {
        const localDataset = createDataset({
            users: [{ authenticatedId: 'local-user' }],
            companies: [{ id: 'company-a', data: { tier: DataValueFactory.string('gold') } }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            users: [
                { authenticatedId: 'local-user' },
                { authenticatedId: 'shared-user' },
            ],
            companies: [
                { id: 'company-a', data: { tier: DataValueFactory.string('silver') } },
                { id: 'company-b' },
            ],
        })!;

        applySharedDatasetImportDecision(localDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            coreFields: 'local',
            features: 'local',
            users: 'local',
            companies: 'local',
        });

        expect(localDataset.users).toMatchObject([
            { authenticatedId: 'local-user' },
            { authenticatedId: 'shared-user' },
        ]);
        expect(localDataset.companies).toMatchObject([
            { id: 'company-a' },
            { id: 'company-b' },
        ]);
        expect(localDataset.companies?.[0]?.data?.tier?.value).toBe('gold');
    });

    it('replaces conflicting users and companies when shared conflict strategy is selected', () => {
        const localDataset = createDataset({
            users: [{ authenticatedId: 'shared-user', classifications: { channel: 'B2C' } }],
            companies: [{ id: 'company-a', data: { tier: DataValueFactory.string('gold') } }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            users: [
                { authenticatedId: 'shared-user', classifications: { channel: 'B2B' } },
                { authenticatedId: 'new-user' },
            ],
            companies: [
                { id: 'company-a', data: { tier: DataValueFactory.string('silver') } },
                { id: 'company-b' },
            ],
        })!;

        applySharedDatasetImportDecision(localDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            coreFields: 'local',
            features: 'local',
            users: 'shared',
            companies: 'shared',
        });

        expect(localDataset.users).toMatchObject([
            { authenticatedId: 'shared-user', classifications: { channel: 'B2B' } },
            { authenticatedId: 'new-user' },
        ]);
        expect(localDataset.companies).toMatchObject([
            { id: 'company-a' },
            { id: 'company-b' },
        ]);
        expect(localDataset.companies?.[0]?.data?.tier?.value).toBe('silver');
    });

    it('resolves imported selected user and company after apply', () => {
        const localDataset = createDataset({
            users: [{ authenticatedId: 'local-user' }],
            companies: [{ id: 'local-company' }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            users: [
                { authenticatedId: 'local-user' },
                { authenticatedId: 'shared-user' },
            ],
            companies: [
                { id: 'local-company' },
                { id: 'shared-company' },
            ],
            selectedUserIndex: 1,
            selectedCompanyId: 'shared-company',
        })!;

        applySharedDatasetImportDecision(localDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            coreFields: 'local',
            features: 'local',
            users: 'local',
            companies: 'local',
        });

        const selections = resolveSharedDatasetSessionSelections(localDataset, sharedDataset);

        expect(selections.selectedUserIndex).toBe(1);
        expect(selections.selectedCompanyId).toBe('shared-company');
    });

    it('returns undefined for imported selections that still do not exist after apply', () => {
        const localDataset = createDataset({
            users: [{ authenticatedId: 'shared-user', classifications: { channel: 'B2C' } }],
        });
        const sharedDataset = parseSharedDataset({
            datasetId: 'demo-dataset',
            apiKey: 'demo-key',
            users: [{ authenticatedId: 'shared-user', classifications: { channel: 'B2B' } }],
            selectedUserIndex: 0,
            selectedCompanyId: 'missing-company',
        })!;

        applySharedDatasetImportDecision(localDataset, sharedDataset, {
            ...getDefaultSharedDatasetImportDecision(),
            coreFields: 'local',
            features: 'local',
        });

        const selections = resolveSharedDatasetSessionSelections(localDataset, sharedDataset);

        expect(selections.selectedUserIndex).toBeUndefined();
        expect(selections.selectedCompanyId).toBeUndefined();
    });
});
