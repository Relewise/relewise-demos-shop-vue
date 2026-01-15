import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, ContentSearchBuilder } from '@relewise/client';

export async function fetchProduct(id: string) {
    try {
        const request = new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({ allData: true, displayName: true })
            .setExplodedVariants(1)
            .filters(f => {
                f.addProductIdFilter([id]);
                contextStore.userClassificationBasedFilters(f);
            })
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        return (await searcher.searchProducts(request))?.results![0];
    } catch (e) {
        // ignore top fetch errors silently
    }
}

export async function fetchContent(id: string) {
    try {
        const request = new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .filters(f => f.addContentIdFilter([id]))
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        return (await searcher.searchContents(request))?.results![0];
    } catch (e) {
        // ignore top fetch errors silently
    }
}