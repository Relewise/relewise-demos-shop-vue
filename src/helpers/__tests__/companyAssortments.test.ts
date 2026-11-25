import { FilterBuilder } from '@relewise/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DemoUser } from '@/helpers/userContext';

vi.mock('@/helpers/contextApi', () => ({ initializeWebComponentsForDataset: vi.fn() }));

beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
});

describe('company assortments', () => {
    it('adds the active company assortments alongside existing user filters and persists the selection', async() => {
        const { default: context } = await import('@/stores/context.store');
        const shopper: DemoUser = {
            temporaryId: 'shopper', companyIds: ['workshop', 'safety'], classifications: { country: 'DK' },
        };
        context.addDataset({
            datasetId: 'demo',
            apiKey: 'fixture-key',
            allLanguages: ['en'],
            allCurrencies: ['EUR'],
            userClassificationFilters: true,
            users: [shopper],
            companies: [
                { id: 'workshop', assortmentIds: [17, 15, 17] },
                { id: 'safety', assortmentIds: [21] },
            ],
        });
        const selectCompany = (selectedCompanyId?: string) => context.applySessionContext({
            datasetId: 'demo', language: 'en', currencyCode: 'EUR', selectedUserIndex: 0, selectedCompanyId,
        });
        const filtersFor = (store: typeof context) => {
            const filters = new FilterBuilder();
            store.productAvailabilityFilters(filters);
            return filters.build()?.items;
        };

        selectCompany('workshop');
        expect(filtersFor(context)).toEqual([
            expect.objectContaining({ assortments: [15, 17] }),
            expect.objectContaining({ key: 'AvailableInMarkets' }),
        ]);
        expect(context.user.value.company).not.toHaveProperty('assortmentIds');

        selectCompany('safety');
        vi.resetModules();
        const { default: reloaded } = await import('@/stores/context.store');
        expect(filtersFor(reloaded)).toEqual([
            expect.objectContaining({ assortments: [21] }),
            expect.objectContaining({ key: 'AvailableInMarkets' }),
        ]);

        selectCompany();
        expect(filtersFor(context)).toEqual([expect.objectContaining({ key: 'AvailableInMarkets' })]);
    });
});
