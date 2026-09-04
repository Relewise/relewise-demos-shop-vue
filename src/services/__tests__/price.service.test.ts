import { beforeEach, describe, expect, it } from 'vitest';
import { DataValueFactory, type Company, type DataValue, type ProductResult, type User } from '@relewise/client';
import priceService, { DEFAULT_PRICE_SCOPE_ID, type PricingContext, type ScopedPriceSource } from '@/services/price.service';
import type { DemoUser } from '@/helpers/userContext';

const now = new Date('2026-06-01T12:00:00.000Z');

function user(
    priceListIds: string[] = [],
    companyIds: string[] = [],
    canonical = false,
    agreedOrderScopeIds: string[] = [],
): User {
    return {
        companyIds,
        data: priceListIds.length > 0 || agreedOrderScopeIds.length > 0
            ? {
                ...(priceListIds.length > 0 ? {
                    PriceListIds: canonical
                        ? DataValueFactory.stringCollection(priceListIds)
                        : DataValueFactory.string(JSON.stringify(priceListIds)),
                } : {}),
                ...(agreedOrderScopeIds.length > 0 ? {
                    AgreedOrderScopeIds: DataValueFactory.stringCollection(agreedOrderScopeIds),
                } : {}),
            }
            : undefined,
    } as DemoUser;
}

function company(
    id: string,
    priceListIds: string[] = [],
    agreedOrderScopeIds: string[] = [],
    parent?: Company,
    customerNumber?: string,
): Company {
    return {
        id,
        parent,
        data: {
            PriceListIds: DataValueFactory.stringCollection(priceListIds),
            AgreedOrderScopeIds: DataValueFactory.stringCollection(agreedOrderScopeIds),
            ...(customerNumber ? { CustomerNumber: DataValueFactory.string(customerNumber) } : {}),
        },
    };
}

function product(prices: Array<{
    scopeId: string;
    source?: ScopedPriceSource | string;
    amount: number;
    currency?: string;
    dateFromUnixMs?: number;
    dateToUnixMs?: number;
}> = []): ProductResult {
    return {
        productId: 'product-1',
        salesPrice: 150,
        listPrice: 175,
        data: prices.length > 0 ? {
            Prices: DataValueFactory.objectCollection(prices.map((price) => ({
                ScopeId: DataValueFactory.string(price.scopeId),
                Source: DataValueFactory.string(price.source ?? 'PriceList'),
                Amount: DataValueFactory.number(price.amount),
                Currency: DataValueFactory.string(price.currency ?? 'DKK'),
                DateFrom: DataValueFactory.number(price.dateFromUnixMs ?? Date.parse('2026-01-01T00:00:00.000Z')),
                DateTo: DataValueFactory.number(price.dateToUnixMs ?? Date.parse('2026-12-31T23:59:59.999Z')),
            }))),
        } : undefined,
    } as ProductResult;
}

function context(selectedUser: User, companies: Company[] = [], overrides: Partial<PricingContext> = {}): PricingContext {
    return {
        user: selectedUser,
        companies,
        currency: 'DKK',
        now,
        ...overrides,
    };
}

describe('PriceService', () => {
    beforeEach(() => priceService.clearAccessCache());

    it('creates a case-preserving scope context from user, all linked companies, and parents', () => {
        const parent = company('PARENT', ['parent-list'], ['parent-agreement']);
        const first = company('first', ['first-list'], ['first-agreement'], parent);
        const second = company('second', ['second-list'], ['second-agreement']);
        const selectedUser = user([' USER-LIST ', 'first-list'], ['first', 'second']);

        expect(priceService.createSearchPricingContext(context(selectedUser, [first, second, parent]))).toEqual({
            accessibleScopeIds: [
                'USER-LIST',
                'first-list',
                'first-agreement',
                'parent-list',
                'parent-agreement',
                'second-list',
                'second-agreement',
                DEFAULT_PRICE_SCOPE_ID,
            ],
            accessibleAgreedOrderScopeIds: ['first-agreement', 'parent-agreement', 'second-agreement'],
            accessibleCompanyIds: ['first', 'PARENT', 'second'],
            currency: 'DKK',
            nowUnixMs: now.getTime(),
        });
    });

    it('supports canonical StringLists and the demo direct-array String representation', () => {
        const canonicalUser = user(['canonical-list'], [], true);
        const directArrayUser = {
            data: {
                PriceListIds: {
                    type: 'String',
                    value: ['direct-list'],
                    isCollection: true,
                } as unknown as DataValue,
            },
        } as User;

        expect(priceService.resolvePrice(product([{ scopeId: 'canonical-list', amount: 90 }]), context(canonicalUser))?.amount).toBe(90);
        expect(priceService.resolvePrice(product([{ scopeId: 'direct-list', amount: 80 }]), context(directArrayUser))?.amount).toBe(80);
    });

    it('adds dataset-facing customer IDs for linked companies and their parents', () => {
        const parent = company('company-parent', [], ['parent-agreement'], undefined, '100200');
        const linkedCompany = company('company-000198', [], ['agreement'], parent, '000198');

        expect(priceService.createSearchPricingContext(
            context(user([], ['company-000198']), [linkedCompany, parent]),
        )?.accessibleCompanyIds).toEqual([
            'company-000198',
            'customer-000198',
            'company-parent',
            'customer-100200',
        ]);
    });

    it('uses the default price scope when no user or company scopes are accessible', () => {
        expect(priceService.createSearchPricingContext(context(user([])))).toEqual({
            accessibleScopeIds: [DEFAULT_PRICE_SCOPE_ID],
            accessibleAgreedOrderScopeIds: [],
            accessibleCompanyIds: [],
            currency: 'DKK',
            nowUnixMs: now.getTime(),
        });

        expect(priceService.resolvePrice(product([
            { scopeId: DEFAULT_PRICE_SCOPE_ID, amount: 99 },
        ]), context(user([])))).toMatchObject({
            amount: 99,
            scopeId: DEFAULT_PRICE_SCOPE_ID,
            source: 'PriceList',
        });
    });

    it('always adds the default scope alongside explicit pricing access', () => {
        expect(priceService.createSearchPricingContext(context(user(['explicit-list'])))?.accessibleScopeIds)
            .toEqual(['explicit-list', DEFAULT_PRICE_SCOPE_ID]);
    });

    it('uses a default-scope price when an explicitly scoped price is unavailable for the product', () => {
        const candidate = product([
            { scopeId: DEFAULT_PRICE_SCOPE_ID, amount: 125 },
            { scopeId: 'another-company-list', amount: 80 },
        ]);

        expect(priceService.resolvePrice(candidate, context(user(['company-list'])))).toMatchObject({
            amount: 125,
            scopeId: DEFAULT_PRICE_SCOPE_ID,
        });
    });

    it('chooses the cheapest price when both default and explicit scopes are available', () => {
        const candidate = product([
            { scopeId: DEFAULT_PRICE_SCOPE_ID, amount: 125 },
            { scopeId: 'company-list', amount: 90 },
        ]);

        expect(priceService.resolvePrice(candidate, context(user(['company-list'])))).toMatchObject({
            amount: 90,
            scopeId: 'company-list',
        });
    });

    it('resolves the lowest active amount across price-list and agreed-order sources', () => {
        const linkedCompany = company('company', ['company-list'], ['agreement']);
        const selectedUser = user(['user-list'], ['company']);
        const result = priceService.resolvePrice(product([
            { scopeId: 'user-list', source: 'PriceList', amount: 120 },
            { scopeId: 'company-list', source: 'PriceList', amount: 110 },
            { scopeId: 'agreement', source: 'AgreedOrder', amount: 100 },
            { scopeId: 'inaccessible', source: 'AgreedOrder', amount: 1 },
        ]), context(selectedUser, [linkedCompany]));

        expect(result).toMatchObject({
            amount: 100,
            scopeId: 'agreement',
            currency: 'DKK',
            source: 'AgreedOrder',
        });
    });

    it('allows a customer-specific agreed-order scope on the user', () => {
        const selectedUser = user([], [], true, ['customer-agreement']);

        expect(priceService.createSearchPricingContext(context(selectedUser))).toMatchObject({
            accessibleScopeIds: ['customer-agreement', DEFAULT_PRICE_SCOPE_ID],
            accessibleAgreedOrderScopeIds: ['customer-agreement'],
        });
        expect(priceService.resolvePrice(product([
            { scopeId: 'customer-agreement', source: 'AgreedOrder', amount: 79 },
        ]), context(selectedUser))).toMatchObject({ amount: 79, source: 'AgreedOrder' });
    });

    it('does not let a higher agreed-order price override a cheaper price-list price', () => {
        const linkedCompany = company('company', ['list'], ['agreement']);
        const result = priceService.resolvePrice(product([
            { scopeId: 'list', source: 'PriceList', amount: 90 },
            { scopeId: 'agreement', source: 'AgreedOrder', amount: 100 },
        ]), context(user([], ['company']), [linkedCompany]));

        expect(result?.source).toBe('PriceList');
        expect(result?.amount).toBe(90);
    });

    it('prefers AgreedOrder source metadata when eligible amounts are equal', () => {
        const linkedCompany = company('company', ['list'], ['agreement']);
        const result = priceService.resolvePrice(product([
            { scopeId: 'list', source: 'PriceList', amount: 90 },
            { scopeId: 'agreement', source: 'AgreedOrder', amount: 90 },
        ]), context(user([], ['company']), [linkedCompany]));

        expect(result?.source).toBe('AgreedOrder');
    });

    it('matches scope IDs and currencies case-insensitively and de-duplicates access', () => {
        const linkedCompany = company(
            'Company-A',
            ['E26D4039-1B76-40EB-AA03-AFF5A3BB01EA', 'e26d4039-1b76-40eb-aa03-aff5a3bb01ea'],
        );
        const pricingContext = context(user([' LIST-1 ', 'list-1'], ['company-a']), [linkedCompany]);
        const result = priceService.resolvePrice(product([
            { scopeId: 'list-1', amount: 99, currency: 'dkk' },
        ]), pricingContext);

        expect(result?.amount).toBe(99);
        expect(priceService.createSearchPricingContext(pricingContext)).toMatchObject({
            accessibleScopeIds: ['LIST-1', 'E26D4039-1B76-40EB-AA03-AFF5A3BB01EA', DEFAULT_PRICE_SCOPE_ID],
            accessibleCompanyIds: ['Company-A'],
        });
    });

    it('uses inclusive Unix-millisecond date bounds', () => {
        const candidate = product([{
            scopeId: 'list',
            amount: 99,
            dateFromUnixMs: now.getTime(),
            dateToUnixMs: now.getTime(),
        }]);

        expect(priceService.resolvePrice(candidate, context(user(['list'])))?.amount).toBe(99);
    });

    it('ignores invalid sources, malformed dates, future, expired, wrong-currency, and inaccessible prices', () => {
        const malformedDates = product([{ scopeId: 'list', amount: 5 }]);
        malformedDates.data = {
            Prices: DataValueFactory.objectCollection([{
                ScopeId: DataValueFactory.string('list'),
                Source: DataValueFactory.string('PriceList'),
                Amount: DataValueFactory.number(5),
                Currency: DataValueFactory.string('DKK'),
                DateFrom: DataValueFactory.string('2026-01-01'),
                DateTo: DataValueFactory.string('2026-12-31'),
            }]),
        };

        const result = priceService.resolvePrice(product([
            { scopeId: 'list', source: 'Unknown', amount: 1 },
            { scopeId: 'list', amount: 2, dateFromUnixMs: Date.parse('2027-01-01T00:00:00.000Z') },
            { scopeId: 'list', amount: 3, dateToUnixMs: Date.parse('2025-12-31T23:59:59.999Z') },
            { scopeId: 'list', amount: 4, currency: 'EUR' },
            { scopeId: 'other', amount: 5 },
        ]), context(user(['list'])));

        expect(result).toBeNull();
        expect(priceService.resolvePrice(malformedDates, context(user(['list'])))).toBeNull();
    });

    it('keeps agreements isolated to linked companies and handles unknown and cyclic companies', () => {
        const first = company('first', [], ['first-agreement']);
        const second = company('second', [], ['second-agreement'], first);
        first.parent = second;
        const unrelated = company('unrelated', [], ['unrelated-agreement']);
        const selectedUser = user([], ['missing', 'first']);

        const result = priceService.resolvePrice(product([
            { scopeId: 'first-agreement', source: 'AgreedOrder', amount: 20 },
            { scopeId: 'second-agreement', source: 'AgreedOrder', amount: 10 },
            { scopeId: 'unrelated-agreement', source: 'AgreedOrder', amount: 1 },
        ]), context(selectedUser, [first, second, unrelated]));

        expect(result?.amount).toBe(10);
    });

    it('invalidates cached scope access explicitly after company data changes', () => {
        const linkedCompany = company('company', ['first-list']);
        const selectedUser = user([], ['company']);
        const companies = [linkedCompany];
        const pricingContext = context(selectedUser, companies);

        expect(priceService.createSearchPricingContext(pricingContext)?.accessibleScopeIds).toEqual(['first-list', DEFAULT_PRICE_SCOPE_ID]);
        linkedCompany.data = { PriceListIds: DataValueFactory.stringCollection(['second-list']) };
        expect(priceService.createSearchPricingContext(pricingContext)?.accessibleScopeIds).toEqual(['first-list', DEFAULT_PRICE_SCOPE_ID]);

        priceService.clearAccessCache();
        expect(priceService.createSearchPricingContext(pricingContext)?.accessibleScopeIds).toEqual(['second-list', DEFAULT_PRICE_SCOPE_ID]);
    });

    it('uses scoped display pricing and never falls back to native pricing', () => {
        const candidate = product([{ scopeId: 'list', amount: 99 }]);

        expect(priceService.resolveDisplayPrice(candidate, context(user(['list'])))).toEqual({
            amount: 99,
            currency: 'DKK',
            source: 'PriceList',
        });
        expect(priceService.resolveDisplayPrice(candidate, context(user([])))).toEqual({
            amount: null,
            currency: 'DKK',
            source: null,
        });
        expect(priceService.resolveDisplayPrice(candidate, context(user(['other'])))).toEqual({
            amount: null,
            currency: 'DKK',
            source: null,
        });
    });
});
