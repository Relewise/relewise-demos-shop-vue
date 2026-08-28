import { describe, expect, it } from 'vitest';
import { DataValueFactory, type Company, type ProductResult, type User } from '@relewise/client';
import priceService, { type PricingContext } from '@/services/price.service';
import type { DemoUser } from '@/helpers/userContext';

const now = new Date('2026-06-01T12:00:00.000Z');

function user(priceListIds: string[] = [], companyIds: string[] = []): User {
    return {
        companyIds,
        data: priceListIds.length > 0 ? { PriceListIds: DataValueFactory.string(JSON.stringify(priceListIds)) } : undefined,
    } as DemoUser;
}

function company(id: string, priceListIds: string[] = [], parent?: Company): Company {
    return {
        id,
        parent,
        data: priceListIds.length > 0 ? { PriceListIds: DataValueFactory.string(JSON.stringify(priceListIds)) } : undefined,
    };
}

function product(prices: Array<{
    priceListId: string;
    amount: number;
    currency?: string;
    dateFrom?: number;
    dateTo?: number;
}> = []): ProductResult {
    return {
        productId: 'product-1',
        salesPrice: 150,
        listPrice: 175,
        data: prices.length > 0 ? {
            Prices: DataValueFactory.objectCollection(prices.map((price) => ({
                PriceListId: DataValueFactory.string(price.priceListId),
                Amount: DataValueFactory.number(price.amount),
                Currency: DataValueFactory.string(price.currency ?? 'DKK'),
                DateFrom: DataValueFactory.number(price.dateFrom ?? Date.parse('2026-01-01T00:00:00.000Z')),
                DateTo: DataValueFactory.number(price.dateTo ?? Date.parse('2026-12-31T23:59:59.999Z')),
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
    it('creates one normalized request context from user and company access', () => {
        const parent = company('parent', ['PARENT-LIST']);
        const child = company('child', ['company-list', 'parent-list'], parent);
        const selectedUser = user([' USER-LIST ', 'company-list'], ['child']);

        expect(priceService.createSearchPricingContext(context(selectedUser, [child, parent]))).toEqual({
            accessiblePriceListIds: ['user-list', 'company-list', 'parent-list'],
            currency: 'DKK',
            nowUnixMs: now.getTime(),
        });
    });

    it('returns no request context when there are no accessible price lists', () => {
        expect(priceService.createSearchPricingContext(context(user([])))).toBeNull();
    });

    it('resolves the cheapest active price from user and linked-company price lists', () => {
        const parent = company('parent', ['parent-list']);
        const child = company('child', ['company-list'], parent);
        const selectedUser = user(['user-list'], ['child']);
        const result = priceService.resolvePrice(product([
            { priceListId: 'user-list', amount: 120 },
            { priceListId: 'company-list', amount: 110 },
            { priceListId: 'parent-list', amount: 100 },
            { priceListId: 'inaccessible-list', amount: 1 },
        ]), context(selectedUser, [child, parent]));

        expect(result).toMatchObject({ amount: 100, priceListId: 'parent-list', currency: 'DKK', source: 'price-list' });
    });

    it('matches price-list ids and currencies case-insensitively and de-duplicates access', () => {
        const selectedUser = user([' LIST-1 ', 'list-1']);
        const result = priceService.resolvePrice(product([{ priceListId: 'List-1', amount: 99, currency: 'dkk' }]), context(selectedUser));

        expect(result?.amount).toBe(99);
    });

    it('reads PriceListIds when a String data value contains an array directly', () => {
        const selectedUser = {
            data: {
                PriceListIds: {
                    type: 'String',
                    value: ['list-1', 'list-2'],
                    isCollection: true,
                },
            },
        } as User;

        expect(priceService.resolvePrice(product([
            { priceListId: 'list-1', amount: 100 },
            { priceListId: 'list-2', amount: 90 },
        ]), context(selectedUser))?.amount).toBe(90);
    });

    it('supports an inclusive date range', () => {
        const selectedUser = user(['list']);
        const candidate = product([{
            priceListId: 'list',
            amount: 99,
            dateFrom: now.getTime(),
            dateTo: now.getTime(),
        }]);

        expect(priceService.resolvePrice(candidate, context(selectedUser))?.amount).toBe(99);
    });

    it('requires DateFrom and DateTo to contain Unix milliseconds', () => {
        const selectedUser = user(['list']);
        const candidate = product([{ priceListId: 'list', amount: 99 }]);
        const legacyStringDates = {
            ...candidate,
            data: {
                Prices: DataValueFactory.objectCollection([{
                    PriceListId: DataValueFactory.string('list'),
                    Amount: DataValueFactory.number(99),
                    Currency: DataValueFactory.string('DKK'),
                    DateFrom: DataValueFactory.string('2026-01-01T00:00:00.000Z'),
                    DateTo: DataValueFactory.string('2026-12-31T23:59:59.999Z'),
                }]),
            },
        };

        expect(priceService.resolvePrice(candidate, context(selectedUser))?.amount).toBe(99);
        expect(priceService.resolvePrice(legacyStringDates, context(selectedUser))).toBeNull();
    });

    it('ignores future, expired, wrong-currency, and inaccessible prices', () => {
        const selectedUser = user(['list']);
        const result = priceService.resolvePrice(product([
            { priceListId: 'list', amount: 1, dateFrom: Date.parse('2027-01-01T00:00:00.000Z') },
            { priceListId: 'list', amount: 2, dateTo: Date.parse('2025-12-31T23:59:59.999Z') },
            { priceListId: 'list', amount: 3, currency: 'EUR' },
            { priceListId: 'other', amount: 4 },
        ]), context(selectedUser));

        expect(result).toBeNull();
    });

    it('ignores unknown companies and handles cyclic parent references', () => {
        const first = company('first', ['first-list']);
        const second = company('second', ['second-list'], first);
        first.parent = second;
        const selectedUser = user([], ['missing', 'first']);

        expect(priceService.resolvePrice(product([
            { priceListId: 'first-list', amount: 20 },
            { priceListId: 'second-list', amount: 10 },
        ]), context(selectedUser, [first, second]))?.amount).toBe(10);
    });

    it('requires PriceListIds to be a JSON array string and ignores malformed price records', () => {
        const selectedUser = {
            data: { PriceListIds: DataValueFactory.string('not-json') },
        } as User;
        const candidate = product([{ priceListId: 'list', amount: 99 }]);

        expect(priceService.resolvePrice(candidate, context(selectedUser))).toBeNull();
        expect(priceService.resolvePrice(candidate, context({
            data: { PriceListIds: DataValueFactory.string(JSON.stringify({ id: 'list' })) },
        } as User))).toBeNull();
        expect(priceService.resolvePrice(candidate, context({
            data: { PriceListIds: DataValueFactory.stringCollection(['list']) },
        } as User))).toBeNull();
        expect(priceService.resolvePrice({ ...candidate, data: { Prices: DataValueFactory.string('not-an-object-list') } }, context(user(['list'])))).toBeNull();

        const malformedPrice = {
            ...candidate,
            data: {
                Prices: DataValueFactory.objectCollection([{
                    PriceListId: DataValueFactory.string('list'),
                    Amount: DataValueFactory.string('99'),
                    Currency: DataValueFactory.string('DKK'),
                    DateFrom: DataValueFactory.string('not-a-date'),
                    DateTo: DataValueFactory.string('2026-12-31T23:59:59.999Z'),
                }]),
            },
        };
        expect(priceService.resolvePrice(malformedPrice, context(user(['list'])))).toBeNull();
    });

    it('uses a single resolved price and falls back to Relewise pricing when none is eligible', () => {
        const candidate = product([{ priceListId: 'list', amount: 99 }]);

        expect(priceService.resolveDisplayPrice(candidate, context(user(['list'])))).toEqual({
            salesPrice: 99,
            listPrice: null,
            currency: 'DKK',
            source: 'price-list',
        });
        expect(priceService.resolveDisplayPrice(candidate, context(user([])))).toEqual({
            salesPrice: 150,
            listPrice: 175,
            currency: 'DKK',
            source: 'relewise',
        });
    });
});
