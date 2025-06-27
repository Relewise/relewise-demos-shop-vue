import type { DataValue, ProductResult } from '@relewise/client';

export const findImage = (product: ProductResult) => {
   return mapDataKey(product?.variant?.data ?? {}) ??
        mapDataKey(product?.data ?? {}) ??
        '';
};

function mapDataKey(data: Record<string, DataValue>) {
    for (const dataKey of Object.keys(data ?? {})) {

        if (dataKey.toLowerCase().includes('image')) {
            const value = data[dataKey];

            if (value.type === 'String') {
                return value.value;
            } else if (value.type === 'StringList') {
                return value.value.$values[0];
            }
        }
    }

    return null;
}