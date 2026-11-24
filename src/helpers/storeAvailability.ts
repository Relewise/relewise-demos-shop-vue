import type { DataValue, ProductResult } from '@relewise/client';
import type { IDataset } from '@/stores/context.store';

export const defaultStoreQuantityDataKey = 'StoreQuantities';
export const defaultStoreNameDataKey = 'StoreNames';

type StoreStock = { id: string; name: string; quantity: number | undefined };

type StockAvailability =
    | { kind: 'summary'; inStock: boolean; quantity?: number }
    | { kind: 'stores'; stores: StoreStock[] }
    | { kind: 'unavailable'; byStore: boolean };

export function getStockAvailability(
    product: Pick<ProductResult, 'data' | 'variant'>,
    { storeQuantityDataKey, storeNameDataKey }: Pick<IDataset, 'storeQuantityDataKey' | 'storeNameDataKey'> = {},
): StockAvailability | undefined {
    // A variant can explicitly be out of stock, so only a missing value falls back to the product.
    const stock = readStock(product.variant?.data, storeQuantityDataKey) ?? readStock(product.data, storeQuantityDataKey);
    if (typeof stock === 'boolean') {
        return { kind: 'summary', inStock: stock };
    }
    if (typeof stock === 'number') {
        return { kind: 'summary', inStock: stock > 0, quantity: stock };
    }

    const nameKey = storeNameDataKey ?? defaultStoreNameDataKey;
    const names = objectData(product.variant?.data?.[nameKey]) ?? objectData(product.data?.[nameKey]);
    // A supplied name map also defines which locations the demo should show.
    const stores = Object.entries(names ?? stock ?? {}).map(([id, entry]) => {
        const name = names && entry?.type === 'String' && typeof entry.value === 'string'
            ? entry.value.trim()
            : '';
        const count = stock && Object.prototype.hasOwnProperty.call(stock, id) ? stock[id] : undefined;
        return { id, name: name || id.replace(/^Store_/, 'Store '), quantity: numericValue(count) };
    });
    if (stores.some(store => store.quantity !== undefined)) {
        return { kind: 'stores', stores };
    }
    if (names || stock || storeQuantityDataKey) {
        return { kind: 'unavailable', byStore: !!(names || stock) };
    }
}

function readStock(data?: Record<string, DataValue>, key?: string) {
    if (key) {
        return stockValue(data?.[key]);
    }
    // Keep Silvan's existing spelling as a fallback when no exact key is configured.
    return stockValue(data?.[defaultStoreQuantityDataKey]) ?? stockValue(data?.StoreQuanteties);
}

function stockValue(value?: DataValue) {
    if (value?.type === 'Boolean' && typeof value.value === 'boolean') {
        return value.value;
    }
    return numericValue(value) ?? objectData(value);
}

function numericValue(value?: DataValue) {
    return value?.type === 'Double' && typeof value.value === 'number' && Number.isFinite(value.value)
        ? value.value
        : undefined;
}

function objectData(value?: DataValue): Record<string, DataValue> | undefined {
    const data: unknown = value?.type === 'Object' ? value.value?.data : undefined;
    return data && typeof data === 'object' && !Array.isArray(data)
        ? data as Record<string, DataValue>
        : undefined;
}
