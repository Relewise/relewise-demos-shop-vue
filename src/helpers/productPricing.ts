import type { ProductResult } from '@relewise/client';

/** Uses the selected variant's prices on the product page and in the cart when it has a sales price. */
export function withVariantPricing(product: ProductResult): ProductResult {
    const variant = product.variant;
    // A variant list price alone cannot establish what the shopper pays.
    if (variant?.salesPrice == null) return product;

    // A discount compares prices from the same SKU. With no variant list price, the sales price stands on its own.
    const listPrice = variant.listPrice ?? variant.salesPrice;
    if (product.salesPrice === variant.salesPrice && product.listPrice === listPrice) return product;

    return { ...product, salesPrice: variant.salesPrice, listPrice };
}
