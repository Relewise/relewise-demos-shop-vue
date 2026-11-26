import { DataValueFactory } from '@relewise/client';
import { describe, expect, it } from 'vitest';
import { getStockAvailability } from '../storeAvailability';

const storeNames = DataValueFactory.object({
    Store_aarhus: DataValueFactory.string('Aarhus'),
    Store_odense: DataValueFactory.string('Odense'),
    Store_aalborg: DataValueFactory.string('Aalborg'),
});

describe('stock availability', () => {
    it.each([
        { value: DataValueFactory.boolean(true), summary: { kind: 'summary', inStock: true } },
        { value: DataValueFactory.boolean(false), summary: { kind: 'summary', inStock: false } },
        { value: DataValueFactory.number(100), summary: { kind: 'summary', inStock: true, quantity: 100 } },
        { value: DataValueFactory.number(0), summary: { kind: 'summary', inStock: false, quantity: 0 } },
    ])('uses the variant stock value, including false and zero', ({ value, summary }) => {
        expect(getStockAvailability({
            data: { Stock: DataValueFactory.number(42), StoreNames: storeNames },
            variant: { rank: 1, data: { Stock: value } },
        }, { storeQuantityDataKey: 'Stock' })).toEqual(summary);
    });

    it('uses the returned variant counts and distinguishes zero from a missing count', () => {
        const availability = getStockAvailability({
            data: {
                StoreNames: storeNames,
                StoreQuantities: DataValueFactory.object({ Store_aalborg: DataValueFactory.number(25) }),
            },
            variant: {
                rank: 1,
                data: {
                    StoreQuantities: DataValueFactory.object({
                        Store_aarhus: DataValueFactory.number(8),
                        Store_odense: DataValueFactory.number(0),
                        Store_distribution: DataValueFactory.number(50),
                    }),
                },
            },
        }, { storeQuantityDataKey: 'StoreQuantities', storeNameDataKey: 'StoreNames' });

        expect(availability).toEqual({
            kind: 'stores',
            stores: [
                { id: 'Store_aarhus', name: 'Aarhus', quantity: 8 },
                { id: 'Store_odense', name: 'Odense', quantity: 0 },
                { id: 'Store_aalborg', name: 'Aalborg', quantity: undefined },
            ],
        });
    });

    it('uses location IDs when the store name key is unset even if name data exists', () => {
        expect(getStockAvailability({
            data: {
                StoreQuantities: DataValueFactory.object({ Store_aarhus: DataValueFactory.number(4) }),
                StoreNames: storeNames,
            },
        }, { storeQuantityDataKey: 'StoreQuantities' })).toEqual({
            kind: 'stores',
            stores: [{ id: 'Store_aarhus', name: 'Store aarhus', quantity: 4 }],
        });
    });

    it('reports unavailable stock for an invalid variant value even when the product has stock', () => {
        expect(getStockAvailability({
            data: { Stock: DataValueFactory.number(100) },
            variant: { rank: 1, data: { Stock: DataValueFactory.string('0') } },
        }, { storeQuantityDataKey: 'Stock' })).toEqual({ kind: 'unavailable', byStore: false });
    });

    it('reports unavailable store stock when configured store names exist without quantities', () => {
        expect(getStockAvailability(
            { data: { StoreNames: storeNames } },
            { storeQuantityDataKey: 'StoreQuantities', storeNameDataKey: 'StoreNames' },
        )).toEqual({ kind: 'unavailable', byStore: true });
    });

    it('reads the configured keys and uses a variant map when present', () => {
        const availability = getStockAvailability({
            data: {
                ExistingNames: storeNames,
                StoreQuantities: DataValueFactory.object({ Store_aarhus: DataValueFactory.number(25) }),
                ExistingCounts: DataValueFactory.object({ Store_aarhus: DataValueFactory.number(8) }),
            },
            variant: {
                rank: 1,
                data: {
                    ExistingNames: DataValueFactory.object({ Store_aarhus: DataValueFactory.string('Aarhus Central') }),
                },
            },
        }, { storeQuantityDataKey: 'ExistingCounts', storeNameDataKey: 'ExistingNames' });

        expect(availability).toEqual({ kind: 'stores', stores: [{ id: 'Store_aarhus', name: 'Aarhus Central', quantity: 8 }] });
    });

    it('reports unavailable store stock when the configured key is absent despite counts at another key', () => {
        const availability = getStockAvailability({
            data: {
                StoreNames: storeNames,
                StoreQuantities: DataValueFactory.object({ Store_aarhus: DataValueFactory.number(8) }),
            },
        }, { storeQuantityDataKey: 'ExistingCounts', storeNameDataKey: 'StoreNames' });

        expect(availability).toEqual({ kind: 'unavailable', byStore: true });
    });

    it('shows unavailable stock for an unsupported configured field', () => {
        expect(getStockAvailability(
            { data: { Stock: DataValueFactory.string('100') } },
            { storeQuantityDataKey: 'Stock' },
        )).toEqual({ kind: 'unavailable', byStore: false });
    });

    it('hides stock until the dataset configures a stock key', () => {
        expect(getStockAvailability({
            data: {
                StoreQuantities: DataValueFactory.object({ Store_aarhus: DataValueFactory.number(8) }),
                StoreNames: storeNames,
            },
        }, { storeNameDataKey: 'StoreNames' })).toBeUndefined();
    });
});
