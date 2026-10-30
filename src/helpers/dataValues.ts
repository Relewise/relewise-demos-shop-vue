import { DataValueFactory, type DataValue } from '@relewise/client';

/** Shared links may omit the SDK's collection type metadata. */
export function normalizeDataRecord(data?: Record<string, DataValue>) {
    if (!data) return undefined;
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
        value.type === 'StringList' && Array.isArray(value.value?.$values)
            ? DataValueFactory.stringCollection(value.value.$values)
            : value,
    ]));
}

export function dataValueText(data?: DataValue) {
    const value = data?.value;
    if (Array.isArray(value?.$values)) return value.$values.join(', ');
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value) : '';
}
