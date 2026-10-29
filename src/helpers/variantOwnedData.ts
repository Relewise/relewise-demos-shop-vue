import { DataValueFactory, type FilterBuilder, type ProductResult, type VariantResult } from '@relewise/client';

export const variantOwnedModel = 'variant-owned-v1';
export const languageMarkets: Record<string, string> = { 'sv-se': 'se', 'nb-no': 'no', 'fi-fi': 'fi' };

export function isVariantOwned(product: ProductResult) {
    return product.data?.DataModelVersion?.value === variantOwnedModel;
}

export function articleSalesPrice(product: ProductResult) {
    return isVariantOwned(product) ? product.variant?.salesPrice : product.salesPrice;
}

export function articleListPrice(product: ProductResult) {
    return isVariantOwned(product) ? product.variant?.listPrice : product.listPrice;
}

export function canBuyArticle(product: ProductResult) {
    return !isVariantOwned(product) || Boolean(product.variant?.variantId && product.variant.salesPrice != null);
}

export function articleDescription(product: ProductResult) {
    return isVariantOwned(product) && product.variant
        ? product.variant.data?.description?.value
        : product.data?.Description?.value ?? product.data?.description?.value;
}

/** Request-level variant filters share one candidate variant; never filter parent unions. */
export function addArticleEligibility(filters: FilterBuilder, market: string, channel?: string | null) {
    filters.addVariantDataFilter('AvailableInMarkets', c => c.addContainsCondition(DataValueFactory.string(market)));
    filters.addVariantDataFilter('NotBuyableInMarkets', c => c.addContainsCondition(DataValueFactory.string(market)), true, false, true);
    filters.addVariantDataFilter('AvailableInChannels', c => c.addContainsCondition(DataValueFactory.string(channel ?? 'company-contract-denied')));
}

export function eligibleArticle(variant: VariantResult, market: string, channel?: string | null) {
    const values = (key: string): string[] => variant.data?.[key]?.value?.$values ?? [];
    return values('AvailableInMarkets').includes(market)
        && !values('NotBuyableInMarkets').includes(market)
        && values('AvailableInChannels').includes(channel ?? 'company-contract-denied');
}
