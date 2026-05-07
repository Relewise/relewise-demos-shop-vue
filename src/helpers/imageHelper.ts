import type { CategoryResult, ContentResult, DataValue, ProductResult } from '@relewise/client';

type ImageEntity = ProductResult | ContentResult | CategoryResult;

export const findImage = (entity: ImageEntity) => {
    return mapDataKey(('variant' in entity ? entity.variant?.data : undefined) ?? {}) ??
        mapDataKey(entity.data ?? {}) ??
        '';
};

function mapDataKey(data: Record<string, DataValue>) {
    for (const dataKey of Object.keys(data ?? {})) {

        if (dataKey.toLowerCase().includes('image')) {
            const value = data[dataKey];

            if (value?.type === 'String') {
                return value.value;
            } else if (value?.type === 'StringList') {
                return value.value.$values[0];
            }
        }
    }

    return null;
}
