import { beforeEach, describe, expect, it } from 'vitest';
import { DataValueFactory, type Company, type DataValue, type ProductResult, type User } from '@relewise/client';
import priceService, { type PricingContext, type ScopedPriceSource } from '@/services/price.service';
import type { DemoUser } from '@/helpers/userContext';

const now = new Date('2026-06-01T12:00:00.000Z');

function user(priceListIds: string[] = [], companyIds: string[] = [], canonical = false): User {
    return {
        companyIds,
        data: priceListIds.length > 0 ? {
            PriceListIds: canonical
                ? DataValueFactory.stringCollection(priceListIds)
                : DataValueFactory.string(JSON.stringify(priceListIds)),
        } : undefined,
    } as DemoUser;
}

function company(
    id: string,
    priceListIds: string[] = [],
    agreedOrderScopeIds: string[] = [],
    parent?: Company,
): Company {
    return {
        id,
        parent,
        data: {
            PriceListIds: DataValueFactory.stringCollection(priceListIds),
            AgreedOrderScopeIds: DataValueFactory.stringCollection(agreedOrderScopeIds),
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

    it('returns no request context when there are no accessible scopes', () => {
        expect(priceService.createSearchPricingContext(context(user([])))).toBeNull();
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
            accessibleScopeIds: ['LIST-1', 'E26D4039-1B76-40EB-AA03-AFF5A3BB01EA'],
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

        expect(priceService.createSearchPricingContext(pricingContext)?.accessibleScopeIds).toEqual(['first-list']);
        linkedCompany.data = { PriceListIds: DataValueFactory.stringCollection(['second-list']) };
        expect(priceService.createSearchPricingContext(pricingContext)?.accessibleScopeIds).toEqual(['first-list']);

        priceService.clearAccessCache();
        expect(priceService.createSearchPricingContext(pricingContext)?.accessibleScopeIds).toEqual(['second-list']);
    });

    it('uses scoped display pricing and only falls back to native pricing for an unscoped context', () => {
        const candidate = product([{ scopeId: 'list', amount: 99 }]);

        expect(priceService.resolveDisplayPrice(candidate, context(user(['list'])))).toEqual({
            salesPrice: 99,
            listPrice: null,
            currency: 'DKK',
            source: 'PriceList',
        });
        expect(priceService.resolveDisplayPrice(candidate, context(user([])))).toEqual({
            salesPrice: 150,
            listPrice: 175,
            currency: 'DKK',
            source: 'Relewise',
        });
        expect(priceService.resolveDisplayPrice(candidate, context(user(['other'])))).toEqual({
            salesPrice: null,
            listPrice: null,
            currency: 'DKK',
            source: 'Relewise',
        });
    });
});
