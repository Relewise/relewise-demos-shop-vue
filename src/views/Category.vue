<template>
    <div class="search">
        <div class="flex gap-3">
            <div v-if="result?.facets" class="hidden lg:block w-1/5">
                <Facets v-model:page="page" :filters="filters" :facets="result.facets" @search="search"/>
            </div>
            <div class="w-full lg:w-4/5">
                <div v-if="result?.results">
                    <div class="grid grid-cols-2 bg-white rounded p-3 gap-1 items-end lg:flex lg:gap-4">
                        <div>
                            <h1 class="text-xl lg:text-3xl font-semibold">
                                {{ category?.displayName }}
                            </h1>
                            <span v-if="result.hits > 0" class="text-sm lg:text-base whitespace-nowrap">Showing {{ (page * 40) - 39 }} - {{ result?.hits < 40 ? result?.hits :
                                page * 40 }} of {{ result?.hits }}</span>
                        </div>

                        <div class="hidden lg:block lg:flex-grow">
                        </div>
                        <Sorting v-model="filters.sort" @change="search"/>
                    </div>
                    <div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-3">
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
import { ProductSearchBuilder, type PriceRangeFacetResult, type ProductSearchResponse, ProductCategorySearchBuilder, type ProductCategorySearchResponse, type CategoryResult } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { useRoute } from 'vue-router';
import trackingService from '@/services/tracking.service';
import router from '@/router';
import Sorting from '../components/Sorting.vue';

const route = useRoute();
const category = ref<CategoryResult | undefined>(undefined);
const result: Ref<ProductSearchResponse | undefined> = ref<ProductSearchResponse | undefined>(undefined);
const categoryId = ref<string>('');
const page = ref<number>(1);
const filters = ref<Record<string, string | string[]>>({ price: [], sort: '' });

async function init() {
    const id = route.params.id;

    if (id && !Array.isArray(id) && id !== categoryId.value) {
        trackingService.trackProductCategoryView(id);

        const facets = new URLSearchParams(window.location.search);
        facets.forEach((value, key) => { 
            if (key === 'sort') { filters.value.sort = value; return; }
            const existing = filters.value[key];
            existing && Array.isArray(existing) ? existing.push(value) : filters.value[key] = [value];
        });
        
        const request = new ProductCategorySearchBuilder(contextStore.defaultSettings)
            .setSelectedCategoryProperties({ displayName: true })
            .filters(f => f.addProductCategoryIdFilter('ImmediateParentOrItsParent', [id]))
            .build();

        const searcher = contextStore.getSearcher();
        const response: ProductCategorySearchResponse | undefined = await searcher.searchProductCategories(request);
        contextStore.assertApiCall(response);

        if (response?.results) {
            category.value = response.results[0];
        }

        categoryId.value = id;
        search();
    }
}

init();

watch(route, () => {
    if (route.query.open !== '1')
        init();
});

async function search() {
    scrollTo({ top: 0 });

    let applySalesPriceFacet = false;
    if (result.value?.facets?.items?.length === 3) {
        const salesPriceFacet = result.value?.facets.items[2] as PriceRangeFacetResult;
        applySalesPriceFacet = salesPriceFacet && filters.value.price.length === 2 && Number(filters.value.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive || Number(filters.value.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive;
    }
    
    const request = new ProductSearchBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setExplodedVariants(1)
        .filters(f => {
            f.addProductCategoryIdFilter('Ancestor', [categoryId.value]);
        })
        .facets(f => f        
            .addCategoryFacet('ImmediateParent', Array.isArray(filters.value['category']) && filters.value['category'].length > 0 ? filters.value['category'] : null)
            .addBrandFacet( Array.isArray(filters.value['brand']) && filters.value['brand'].length > 0 ? filters.value['brand'] : null)
            .addSalesPriceRangeFacet('Product', applySalesPriceFacet ? Number(filters.value.price[0]) : undefined, applySalesPriceFacet ? Number(filters.value.price[1]) : undefined),
        )
        .pagination(p => p.setPageSize(40).setPage(page.value))
        .sorting(s => {
            if (filters.value.sort === 'Popular') {
                s.sortByProductPopularity();
            }
            else if(filters.value.sort === 'SalesPriceDesc'){
                s.sortByProductAttribute('SalesPrice', 'Descending');
            }
            else if(filters.value.sort === 'SalesPriceAsc') {
                s.sortByProductAttribute('SalesPrice', 'Ascending');
            }
        })
        .build();

    const query = {...filters.value };
    if (!applySalesPriceFacet) delete query.price;

    await router.push({ path: route.path, query: query });
    
    const searcher = contextStore.getSearcher();
    const response: ProductSearchResponse | undefined = await searcher.searchProducts(request);
    contextStore.assertApiCall(response);

    if (response && response.facets && response.facets.items && response.facets.items[2] !== null) {
        const salesPriceFacet = response.facets!.items[2] as PriceRangeFacetResult;
        if (Object.keys(salesPriceFacet.selected ?? {}).length === 0 && 'available' in salesPriceFacet && salesPriceFacet.available && 'value' in salesPriceFacet.available) {
            filters.value.price = [salesPriceFacet.available.value?.lowerBoundInclusive.toString() ?? '', salesPriceFacet.available.value?.upperBoundInclusive.toString() ?? ''];
        }
    }

    result.value = response;
}
</script>
