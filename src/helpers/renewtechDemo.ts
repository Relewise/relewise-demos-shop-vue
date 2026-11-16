import { ProductSearchBuilder, DataValueFactory, type FilterBuilder, type ProductResult, type SelectedProductPropertiesSettings, type Settings } from '@relewise/client';

// Explicit opt-in, retained for this browser tab so links and context reloads keep the story.
const demo = new URLSearchParams(window.location.search).get('demo');
if (demo !== null) sessionStorage.setItem('customerDemo', demo);
export const isRenewtechDemo = import.meta.env.VITE_DEMO_CUSTOMER === 'renewtech'
    || sessionStorage.getItem('customerDemo') === 'renewtech';

export const renewtechAnchors = ['330177', '351867', '344416'];

export function productText(product: ProductResult, key: string): string {
    const value: unknown = product.data?.[key]?.value;
    return typeof value === 'string' ? value : '';
}

export function listedComponentIds(product: ProductResult): string[] {
    const value = product.data?.ListedComponentIds?.value;
    const ids: unknown = value?.$values ?? value;
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))] : [];
}

export function listedOptionsRequest(
    product: ProductResult,
    settings: Settings,
    selectedProperties: SelectedProductPropertiesSettings,
    applyFilters: (filters: FilterBuilder) => void,
    condition = '',
) {
    const ids = listedComponentIds(product);
    // An empty ID filter must never become a broad catalogue request.
    if (!ids.length) return null;
    return new ProductSearchBuilder({ ...settings, displayedAtLocation: 'Renewtech - Listed server options' })
        .setSelectedProductProperties(selectedProperties)
        .filters(filters => {
            filters.addProductIdFilter(ids);
            applyFilters(filters);
            if (condition) filters.addProductDataFilter('Condition', c => c.addEqualsCondition(DataValueFactory.string(condition)));
        })
        .pagination(p => p.setPageSize(12))
        .build();
}
