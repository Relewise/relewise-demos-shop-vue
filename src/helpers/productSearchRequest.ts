import type { ProductResult, ProductSearchBuilder, SelectedProductPropertiesSettings } from '@relewise/client';
import type { IDataset, VariantRequestSorting } from '@/stores/context.store';
import { findImage } from '@/helpers/imageHelper';

export const defaultVariantRequestSorting: VariantRequestSorting = 'GroupedByProduct';
export const defaultMaxVariantsPerProduct = 1;

export function getDefaultMaxVariantsPerProduct() {
    return defaultMaxVariantsPerProduct;
}

export function getMaxVariantsPerProduct(dataset: Pick<IDataset, 'maxVariantsPerProduct'>, defaultValue = defaultMaxVariantsPerProduct) {
    return dataset.maxVariantsPerProduct ?? defaultValue;
}

export function getVariantRequestSorting(dataset: Pick<IDataset, 'variantRequestSorting'>) {
    return dataset.variantRequestSorting ?? defaultVariantRequestSorting;
}

export function applyVariantRequestSettings(
    builder: ProductSearchBuilder,
    dataset: Pick<IDataset, 'maxVariantsPerProduct' | 'variantRequestSorting'>,
) {
    return builder.setVariantRequestSettings(settings => {
        settings
            .setMaxVariantsPerProduct(getMaxVariantsPerProduct(dataset))
            .setSorting(getVariantRequestSorting(dataset));
    });
}

export function selectedProductPropertiesForTermSearch(
    selectedProductProperties: SelectedProductPropertiesSettings,
    includeVariantResolution: boolean,
): SelectedProductPropertiesSettings {
    if (!includeVariantResolution) {
        return selectedProductProperties;
    }

    return {
        ...selectedProductProperties,
        variantResolution: true,
    };
}

export function findTermMatchedVariantImage(product: ProductResult) {
    const source = product.variantResolution?.source;
    if (source !== 'PartialMatchByTerm' && source !== 'MatchByTerm') {
        return '';
    }

    return product.variant ? findImage(product.variant) : '';
}
