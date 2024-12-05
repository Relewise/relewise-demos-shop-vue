import type { DataValue, ProductResult } from '@relewise/client';

export const findImage = (product: ProductResult) => {
    return mapDataKey(product.variant?.data ?? {}) ??
        mapDataKey(product.data ?? {}) ??
        '';
};

function mapDataKey(data: Record<string, DataValue>) {
    for (const dataKey of Object.keys(data ?? {})) {

        if (dataKey.toLowerCase().includes('image')) {
            const value = data[dataKey];
            return value.value;
//console.log("BILLEDE: " + JSON.stringify(value, null, 2));
            // if (value.type === 'String') {
            //     return value.value.replace("upload/", "upload/c_scale,h_0.25,w_0.25/q_auto:low/");
            // } else if (value.type === 'StringList') {
            //     return value.value.$values[0].replace("upload/", "upload/c_scale,h_0.25,w_0.25/q_auto:low/");
            // }
        }
    }

    return null;
}