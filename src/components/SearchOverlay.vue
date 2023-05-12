<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, type SearchTermPredictionResult, type PriceRangeFacetResult } from '@relewise/client';
import { ref, watch } from 'vue';
//import { useDebounceFn } from '@vueuse/core';
import ProductTile from './ProductTile.vue';
import Facets from './Facets.vue';
import { useRoute } from 'vue-router';

const open = ref(false);
const searchTerm = ref<string>('');
const result = ref<ProductSearchResponse | null>(null);
const usedSearchTerm = ref<string|null>('');
const fallbackRecommendations = ref<ProductRecommendationResponse|null|undefined>(null);
const page = ref(1);
const predictionsList = ref<SearchTermPredictionResult[]>([]);
const filters = ref<Record<string, string[]>>({ price: []});
const route = useRoute();

function close() {
    showOrHide(false);
}

watch(route, () => {
    if (route.query.brand && typeof route.query.brand === 'string' && !open.value) {
        scrollTo({top: 0});
        filters.value.brand = [route.query.brand];
        search();
        return;
    }
    close();
});

function showOrHide(show: boolean) {
    if (!show) {
        searchTerm.value = '';
        result.value = null;
        predictionsList.value = [];
        usedSearchTerm.value = null;
    }
    open.value = show;
    show ? window.document.body.classList.add('overflow-hidden') : window.document.body.classList.remove('overflow-hidden');
}

// const debouncedSearch = useDebounceFn(() => {
//     if (usedSearchTerm.value !== searchTerm.value) {
//         search();
//     }
// }, 200);

async function search() {
    if (usedSearchTerm.value === searchTerm.value) return;

    const show = searchTerm.value.length > 0 || Object.keys(filters.value).length > 0;

    if (!show) return; else showOrHide(show); 

    usedSearchTerm.value = searchTerm.value;

    const request = new SearchCollectionBuilder()
        .addRequest(new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({allData: true})
            .setExplodedVariants(1)
            .setTerm(usedSearchTerm.value.length > 0 ? usedSearchTerm.value : null)
            .facets(f => f
                .addSalesPriceRangeFacet('Product', filters.value.price.length === 2 ? Number(filters.value.price[0]) : undefined, filters.value.price.length === 2 ? Number(filters.value.price[1]) : undefined)
                .addCategoryFacet('ImmediateParent', filters.value['category']?.length > 0 ? filters.value['category'] : null)
                .addBrandFacet(filters.value['brand']?.length > 0 ? filters.value['brand'] : null),
            )
            .pagination(p => p.setPageSize(30).setPage(page.value))
            .build())
        .addRequest(new SearchTermPredictionBuilder(contextStore.defaultSettings)
            .addEntityType('Product')
            .setTerm(searchTerm.value)
            .take(5)
            .build())
        .build();

    const searcher = contextStore.getSearcher();
    const response = await searcher.batch(request);
    contextStore.assertApiCall(response);

    if (response && response.responses) {
        result.value = response.responses[0] as ProductSearchResponse;
        predictionsList.value = (response.responses[1] as SearchTermPredictionResponse)?.predictions ?? [];

        if (result.value.hits === 0) {
            const request = new SearchTermBasedProductRecommendationBuilder(contextStore.defaultSettings)
                .setSelectedProductProperties(contextStore.selectedProductProperties)
                .setSelectedVariantProperties({allData: true})
                .setTerm(searchTerm.value)
                .setNumberOfRecommendations(40)
                .build();

            const recommender = contextStore.getRecommender();

            fallbackRecommendations.value = await recommender.recommendSearchTermBasedProducts(request);
        }
        else {
            if (result.value?.facets && result.value.facets.items && result.value.facets.items[0] !== null) {
                const salesPriceFacet = result.value.facets!.items[0] as PriceRangeFacetResult;
                if (Object.keys(salesPriceFacet.selected ?? {}).length === 0 && 'available' in salesPriceFacet && salesPriceFacet.available && 'value' in salesPriceFacet.available) {
                    filters.value.price = [salesPriceFacet.available.value?.lowerBoundInclusive.toString() ?? '', salesPriceFacet.available.value?.upperBoundInclusive.toString()?? ''];
                }
            }
            
            fallbackRecommendations.value = null;
        }
    } 
}

function searchFor(term: string) {
    searchTerm.value = term;
    search();
}

</script>

<template>
    <div class="inline-flex overflow-hidden rounded-full w-full max-w-2xl border-1 border-white focus:border-zinc-100 relative">
        <XMarkIcon v-if="open" class="h-6 w-6 text-zinc-600 absolute right-14 top-2.5 cursor-pointer" @click="close"/>
        <input v-model="searchTerm"
               type="text"
               placeholder="Search..."
               class="!rounded-none focus:!border-zinc-100 focus:!ring-0"
               @keyup="search()"> 
        <button class="bg-zinc-300 rounded-none px-3" @click="search()">
            <MagnifyingGlassIcon class="h-6 w-6 text-zinc-600"/>
        </button>
    </div>

    <Teleport to="#modal">
        <div v-if="open" class="modal">
            <div v-if="result" class="container mx-auto pt-3 pb-10">
                <div class="flex gap-3">
                    <div class="w-1/5">
                        <div v-if="predictionsList.length > 0 && usedSearchTerm && usedSearchTerm.length > 0" class="p-3 bg-white mb-3">
                            <span class="font-semibold">Did you mean?</span>
                            <a v-for="(prediction) in predictionsList"
                               :key="prediction.term ?? ''"
                               class="mb-1 block cursor-pointer"
                               @click.prevent="searchFor(prediction.term ?? '')"> 
                                {{ prediction.term }}
                            </a>
                        </div>
                        <Facets v-if="result.facets"
                                v-model:page="page"
                                :filters="filters"
                                :facets="result.facets"
                                @search="search"/>
                    </div>
                    <div class="w-4/5">
                        <div class="p-3 flex gap-6 items-end bg-white rounded mb-3">
                            <h2 class="text-3xl">
                                Showing results for <strong>{{ usedSearchTerm }}</strong>
                            </h2> 
                            <span v-if="result.hits > 0">Showing {{ page * 30 - 29 }} - {{ result?.hits < 30 ? result?.hits : page * 30 }} of {{ result?.hits }}</span>
                        </div>
                    
                        <div v-if="result.hits == 0" class="p-3 bg-white">
                            No results found
                        </div>
                        <div v-else class="grid gap-3 grid-cols-4">
                            <ProductTile v-for="(product, index) in result.results" :key="index" :product="product"/>
                        </div>
                    </div>
                    <div v-if="fallbackRecommendations && fallbackRecommendations.recommendations && fallbackRecommendations.recommendations?.length > 0">
                        <ProductTile v-for="(product, index) in fallbackRecommendations?.recommendations" :key="index" :product="product"/>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped lang="scss">
$headerHeight: 104px;

.modal {
    @apply bg-zinc-50 overflow-scroll;
    position: fixed;
    z-index: 999;
    top: $headerHeight; // height of header
    left: 0;
    width: 100%;
    height: calc(100% - $headerHeight);
}
</style>