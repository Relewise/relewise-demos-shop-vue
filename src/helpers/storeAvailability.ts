import type { DataValue, ProductResult } from '@relewise/client';
import type { IDataset } from '@/stores/context.store';

type StoreStock = { id: string; name: string; quantity: number | undefined };

type StockAvailability =
    | { kind: 'summary'; inStock: boolean; quantity?: number }
    | { kind: 'stores'; stores: StoreStock[] }
    | { kind: 'unavailable'; byStore: boolean };

export function getStockAvailability(
    product: Pick<ProductResult, 'data' | 'variant'>,
    { storeQuantityDataKey, storeNameDataKey }: Pick<IDataset, 'storeQuantityDataKey' | 'storeNameDataKey'> = {},
): StockAvailability | undefined {
    if (!storeQuantityDataKey) return;

    // Select the raw field first so an invalid variant value cannot fall back to shared stock.
    const stockField = product.variant?.data?.[storeQuantityDataKey] ?? product.data?.[storeQuantityDataKey];
    const stock = stockValue(stockField);
    if (typeof stock === 'boolean') {
        return { kind: 'summary', inStock: stock };
    }
    if (typeof stock === 'number') {
        return { kind: 'summary', inStock: stock > 0, quantity: stock };
    }

    const names = storeNameDataKey
        ? objectData(product.variant?.data?.[storeNameDataKey]) ?? objectData(product.data?.[storeNameDataKey])
        : undefined;
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
    return { kind: 'unavailable', byStore: !!(names || stockField?.type === 'Object') };
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
