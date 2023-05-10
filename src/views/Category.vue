<template>
    <div class="search">
        <div class="flex gap-3">
            <div v-if="result?.facets" class="w-1/5">
                <Facets v-model:page="page" :filters="filters" :facets="result.facets" @search="search"/>
            </div>
            <div class="w-4/5">
                <div v-if="result?.results">
                    <div class="bg-white rounded flex items-end p-3 gap-4">
                        <h1 class="text-3xl font-semibold">
                            Products
                        </h1>
                        <span v-if="result.hits > 0">Showing {{ (page * 40) - 39 }} - {{ result?.hits < 40 ? result?.hits : page * 40 }} of {{ result?.hits }}</span>
                    </div>
                    <div class="grid gap-3 grid-cols-4 mt-3">
                        <ProductTile v-for="(product, pIndex) in result?.results" :key="pIndex" :product="product"/>
                    </div>

                    <div class="py-3 flex justify-center">
                        <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="40" @change="search"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Pagination from '../components/Pagination.vue';
import ProductTile from '../components/ProductTile.vue';
import Facets from '../components/Facets.vue';
import { ref, type Ref, watch } from 'vue';
import { ProductSearchBuilder, type ProductSearchResponse } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { useRoute } from 'vue-router';
import trackingService from '@/services/tracking.service';

const result: Ref<ProductSearchResponse | undefined> = ref<ProductSearchResponse | undefined>(undefined);
const categoryId = ref<string>('');
const page = ref<number>(1);
const filters = ref<Record<string, string[]>>({ price: []});
const route = useRoute();
    
function init() {
    const id = route.params.id;

    if (id && !Array.isArray(id)) {
        trackingService.trackProductCategoryView(id);

        categoryId.value = id;
        search();
    }
}

init();

watch(route, () => {
    init();
});

async function search() {
    scrollTo({ top: 0 });

    const request = new ProductSearchBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({allData: true})
        .setExplodedVariants(1)
        .filters(f => {
            f.addProductCategoryIdFilter('Ancestor', [categoryId.value]);
        })
        .facets(f => f
            .addSalesPriceRangeFacet('Product', filters.value.price.length === 2 ? Number(filters.value.price[0]) : undefined, filters.value.price.length === 2 ? Number(filters.value.price[1]) : undefined)
            .addCategoryFacet('ImmediateParent', filters.value['category']?.length > 0 ? filters.value['category'] : null)
            .addBrandFacet(filters.value['brand']?.length > 0 ? filters.value['brand'] : null),
        )
        .pagination(p => p.setPageSize(40).setPage(page.value))
        .build();

    const searcher = contextStore.getSearcher();
    const response: ProductSearchResponse | undefined = await searcher.searchProducts(request);
    contextStore.assertApiCall(response);

    if (Object.keys(response?.facets?.items[0].selected).length === 0) {
        filters.value.price = [response?.facets?.items[0].available.value.lowerBoundInclusive, response?.facets?.items[0].available.value.upperBoundInclusive];
    }

    result.value = response;
}
</script>
