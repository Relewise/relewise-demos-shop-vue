<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, type SearchTermPredictionResult, type PriceRangeFacetResult } from '@relewise/client8';
import { ref, watch } from 'vue';
import ProductTile from './ProductTile.vue';
import Facets from './Facets.vue';
import { useRoute } from 'vue-router';
import router from '@/router';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';

const open = ref(false);
const searchTerm = ref<string>('');
const result = ref<ProductSearchResponse | null>(null);
const products = ref<ProductWithType[] | null>(null);
const fallbackRecommendations = ref<ProductRecommendationResponse | null | undefined>(null);
const page = ref(1);
const predictionsList = ref<SearchTermPredictionResult[]>([]);
const filters = ref<Record<string, string | string[]>>({ price: [], term: '' });
const route = useRoute();
let abortController = new AbortController();

function close() {
    showOrHide(false);
}

watch(() => ({ ...route }), (value, oldValue) => {
    if (route.query.open === '1' && !open.value) {
        scrollTo({ top: 0 });

        const searchParams = new URLSearchParams(window.location.search);
        searchParams.forEach((value, key) => {

            if (key === 'term') {
                searchTerm.value = value;
                return;
            }

            const existing = filters.value[key];
            existing && Array.isArray(existing) ? existing.push(value) : filters.value[key] = [value];
        });

        filters.value['open'] = '1';

        search();
        return;
    } else if (value.query.open !== '1' && oldValue.query.open === '1') {
        close();
    }
});

watch(breakpointService.active, () => {
    if (route.query.open === '1')
        search();
});

function showOrHide(show: boolean) {
    if (!show) {
        searchTerm.value = '';
        result.value = null;
        predictionsList.value = [];
        filters.value = { price: [], term: '' };
        router.push({ path: router.currentRoute.value.path, query: {} });
    }
    open.value = show;
    if (show) {
        window.document.body.classList.add('overflow-hidden');
        window.document.body.classList.add('pr-[17px]');
    } else {
        window.document.body.classList.remove('overflow-hidden');
        window.document.body.classList.remove('pr-[17px]');
    }
}

function typeAHeadSearch() {
    if (filters.value.term !== searchTerm.value) {
        filters.value['open'] = '1';

        search();
    }
}

async function search() {
    abortController.abort();
    const show = searchTerm.value.length > 0 || Object.keys(filters.value).length > 0;

    if (!show) return; else showOrHide(show);

    filters.value.term = searchTerm.value;

    let applySalesPriceFacet = false;
    if (result.value?.facets?.items?.length === 3) {
        const salesPriceFacet = result.value?.facets.items[2] as PriceRangeFacetResult;
        applySalesPriceFacet = salesPriceFacet && filters.value.price.length === 2 && Number(filters.value.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive || Number(filters.value.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive;
    }
    const variationName = breakpointService.active.value.toUpperCase();

    const request = new SearchCollectionBuilder()
        .addRequest(new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({ allData: true })
            .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
            .facets(f => f
                .addCategoryFacet('ImmediateParent', Array.isArray(filters.value['category']) && filters.value['category']?.length > 0 ? filters.value['category'] : null)
                .addBrandFacet(Array.isArray(filters.value['brand']) && filters.value['brand']?.length > 0 ? filters.value['brand'] : null)
                .addSalesPriceRangeFacet('Product', applySalesPriceFacet ? Number(filters.value.price[0]) : undefined, applySalesPriceFacet ? Number(filters.value.price[1]) : undefined),
            )
            .pagination(p => p.setPageSize(30).setPage(page.value))
            .setRetailMedia({
                location: {
                    key: 'SEARCH_RESULTS_PAGE',
                    placements: [{ key: 'TOP' }],
                    variation: { key: variationName },
                },
            })
            .build())
        .addRequest(new SearchTermPredictionBuilder(contextStore.defaultSettings)
            .addEntityType('Product')
            .setTerm(searchTerm.value)
            .take(5)
            .build())
        .build();

    abortController = new AbortController();
    const searcher = contextStore.getSearcher();
    const response = await searcher.batch(request, { abortSignal: abortController.signal });
    contextStore.assertApiCall(response);

    const query = { ...filters.value };
    if (!applySalesPriceFacet) delete query.price;

    await router.push({ path: route.path, query: query });

    if (response && response.responses) {
        result.value = response.responses[0] as ProductSearchResponse;
        products.value = result.value.results?.map(x => ({ isPromotion: false, product: x })) ?? [];

        predictionsList.value = (response.responses[1] as SearchTermPredictionResponse)?.predictions ?? [];

        if (result.value.hits === 0) {
            const request = new SearchTermBasedProductRecommendationBuilder(contextStore.defaultSettings)
                .setSelectedProductProperties(contextStore.selectedProductProperties)
                .setSelectedVariantProperties({ allData: true })
                .setTerm(searchTerm.value)
                .setNumberOfRecommendations(40)
                .build();

            const recommender = contextStore.getRecommender();

            fallbackRecommendations.value = await recommender.recommendSearchTermBasedProducts(request);
        }
        else {
            if (result.value?.facets && result.value.facets.items && result.value.facets.items[2] !== null) {
                const salesPriceFacet = result.value.facets!.items[2] as PriceRangeFacetResult;
                if (Object.keys(salesPriceFacet.selected ?? {}).length === 0 && 'available' in salesPriceFacet && salesPriceFacet.available && 'value' in salesPriceFacet.available) {
                    filters.value.price = [salesPriceFacet.available.value?.lowerBoundInclusive.toString() ?? '', salesPriceFacet.available.value?.upperBoundInclusive.toString() ?? ''];
                }
            }

            fallbackRecommendations.value = null;

            const placement = result.value.retailMedia?.placements?.TOP;
            if (placement) {

                if (placement?.results) {
                    products.value = placement.results
                        .map(x => ({ isPromotion: true, product: x.promotedProduct?.result! }))
                        .concat(products.value ?? []);
                }
            }
        }
    }
}

function searchFor(term: string) {
    searchTerm.value = term;
    search();
}

</script>

<template>
    <div
        class="inline-flex overflow-hidden rounded-full w-full xl:max-w-2xl border-1 border-white focus:border-zinc-100 relative">
        <XMarkIcon v-if="open" class="h-6 w-6 text-zinc-600 absolute right-14 top-2.5 cursor-pointer" @click="close"/>
        <input v-model="searchTerm"
               type="text"
               placeholder="Search..."
               class="!rounded-none focus:!border-zinc-100 focus:!ring-0"
               @keyup="typeAHeadSearch()">
        <button class="bg-zinc-300 rounded-none px-3" @click="search()">
            <MagnifyingGlassIcon class="h-6 w-6 text-zinc-600"/>
        </button>
    </div>

    <Teleport to="#modal">
        <div v-if="open" class="modal">
            <div v-if="result" class="container mx-auto pt-3 pb-10">
                <div class="flex gap-3">
                    <div class="hidden lg:block lg:w-1/5">
                        <div v-if="predictionsList.length > 0 && filters.term && filters.term.length > 0"
                             class="p-3 bg-white mb-3">
                            <span class="font-semibold">Suggestions</span>
                            <a v-for="(prediction) in predictionsList"
                               :key="prediction.term ?? ''"
                               class="mb-1 block cursor-pointer"
                               @click.prevent="searchFor(prediction.term ?? '')">
                                {{ prediction.term }}
                            </a>
                        </div>
                        <Facets v-if="result.facets && result.hits > 0"
                                v-model:page="page"
                                :filters="filters"
                                :facets="result.facets"
                                @search="search"/>
                    </div>
                    <div class="w-full lg:w-4/5">
                        <div class="lg:flex lg:gap-6 p-3 items-end bg-white rounded mb-3">
                            <h2 v-if="filters.term" class="text-xl lg:text-3xl">
                                Showing results for <strong>{{ filters.term }}</strong>
                            </h2>
                            <span v-if="result.hits > 0">Showing {{ page * 30 - 29 }} - {{ result?.hits < 30 ?
                                result?.hits : page * 30 }} of {{ result?.hits }}</span>
                        </div>
                        <div v-if="result && result?.redirects && result.redirects.length > 0"
                             class="mb-3 p-3 bg-white">
                            <h2 class="text-xl font-semibold mb-2">
                                Redirect(s)
                            </h2>

                            <div v-for="redirect in result.redirects"
                                 :key="redirect.id"
                                 class="mb-1 pb-1 flex border-b border-solid border-gray-300">
                                {{ redirect.destination }}
                            </div>
                        </div>
                        <div v-if="result.hits == 0" class="p-3 text-xl bg-white">
                            No products found
                        </div>
                        <div v-else>
                            <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <ProductTile v-for="(product, index) in products"
                                             :key="index"
                                             :product="product.product"
                                             :is-promotion="product.isPromotion"/>
                            </div>
                        </div>
                        <div v-if="fallbackRecommendations && fallbackRecommendations.recommendations && fallbackRecommendations.recommendations?.length > 0"
                             class="w-full p-3 bg-white rounded mb-6">
                            <h2 class="text-xl">
                                You may like
                            </h2>
                            <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <ProductTile v-for="(product, index) in fallbackRecommendations?.recommendations"
                                             :key="index"
                                             :product="product"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped lang="scss">
$headerHeight: 115px;

.modal {
    @apply bg-zinc-50 overflow-scroll;
    position: fixed;
    z-index: 999;
    top: $headerHeight; // height of header
    left: 0;
    width: 100%;
    height: calc(100% - $headerHeight);
}

:root {
    --relewise-grid-template-columns: repeat(5, 1fr);
}
</style>