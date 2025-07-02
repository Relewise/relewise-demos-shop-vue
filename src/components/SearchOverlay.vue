<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, ContentSearchBuilder, type ContentSearchResponse } from '@relewise/client';
import { ref } from 'vue';
import ProductTile from './ProductTile.vue';
import Facets from './Facets.vue';
import router from '@/router';
import Sorting from '../components/Sorting.vue';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';
import Pagination from '../components/Pagination.vue';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import ContentTile from './ContentTile.vue';
import { addRelevanceModifiers } from '@/helpers/relevanceModifierHelper';
import { getFacets } from '@/helpers/facetHelper';
import VariantBasedProductList from '@/components/VariantBasedProductList.vue';
import { useSearchOverlay } from '@/helpers/useSearchOverlay';

const {
    open,
    searchTerm,
    page,
    predictionsList,
    filters,
    route,
    showOrHide: baseShowOrHide,
    typeAHeadSearch,
    close: baseClose,
    setSearchFn,
} = useSearchOverlay({ term: '', sort: '' });

const productResult = ref<ProductSearchResponse | null>(null);
const contentResult = ref<ContentSearchResponse | null>(null);
const products = ref<ProductWithType[] | null>(null);
const fallbackRecommendations = ref<ProductRecommendationResponse | null | undefined>(null);

let abortController = new AbortController();

const pageSize = 40;

function close() {
    productResult.value = null;
    contentResult.value = null;
    fallbackRecommendations.value = null;
    baseClose();
}

function showOrHide(show: boolean) {
    if (!show) {
        productResult.value = null;
        contentResult.value = null;
        fallbackRecommendations.value = null;
    }
    baseShowOrHide(show);
}

async function search() {
    abortController.abort();

    window.document.getElementById('search-result-overlay')?.scrollTo({ top: 0 });

    const show = searchTerm.value.length > 0 || Object.keys(filters.value).length > 0;

    if (!show) return; else showOrHide(show);

    filters.value.term = searchTerm.value;

    const variationName = breakpointService.active.value.toUpperCase();

    const selectedCategoryFilterIds = filters.value['category'];
    const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

    const request = new SearchCollectionBuilder()
        .addRequest(
            (() => {
                const builder = new ProductSearchBuilder(contextStore.defaultSettings)
                    .setSelectedProductProperties(contextStore.selectedProductProperties)
                    .setSelectedVariantProperties({ allData: true })
                    .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
                    .setExplodedVariants(1)
                    .filters(f => {
                        if (Array.isArray(selectedCategoryFilterIds)) {
                            selectedCategoryFilterIds.slice(0, categoryFilterThreshold).forEach(id => {
                                f.addProductCategoryIdFilter('Ancestor', id);
                            });
                        }

                        contextStore.userClassificationBasedFilters(f);
                    })
                    .facets(f => getFacets(route.query.brandName ? 'Brand' : 'SearchOverlay', f, filters.value))
                    .relevanceModifiers(r => addRelevanceModifiers(r))
                    .sorting(s => {
                        if (filters.value.sort === 'Popular') {
                            s.sortByProductPopularity();
                        }
                        else if (filters.value.sort === 'SalesPriceDesc') {
                            s.sortByProductAttribute('SalesPrice', 'Descending');
                        }
                        else if (filters.value.sort === 'SalesPriceAsc') {
                            s.sortByProductAttribute('SalesPrice', 'Ascending');
                        }
                    })
                    .pagination(p => p.setPageSize(pageSize).setPage(page.value))
                    .setRetailMedia({
                        location: {
                            key: 'SEARCH_RESULTS_PAGE',
                            placements: [{ key: 'TOP' }],
                            variation: { key: variationName },
                        },
                    });
                if (contextStore.context.value.switchOnVariantBasedSearchDisplay) {
                    builder.setExplodedVariants(5);
                    builder.setSelectedVariantProperties({
                        displayName: true,
                        pricing: true,
                        allData: true,
                    });
                }

                return builder.build();
            })(),
        )
        .addRequest(
            (() => {
                const builder = new SearchTermPredictionBuilder(contextStore.defaultSettings)
                    .addEntityType('Product', 'Content')
                    .setTerm(searchTerm.value)
                    .take(5);

                if (contextStore.context.value.enableRelewiseSeDemoScenarios) {
                    builder.filters(f => {
                        globalProductRecommendationFilters(f);
                    });
                }

                return builder.build();
            })(),
        )
        .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
            .setTerm(searchTerm.value)
            .pagination(p => p.setPageSize(10))
            .setContentProperties(contextStore.selectedContentProperties)
            .build())
        .build();

    abortController = new AbortController();
    const searcher = contextStore.getSearcher();
    const response = await searcher.batch(request, { abortSignal: abortController.signal });
    contextStore.assertApiCall(response);

    const query = { ...filters.value };
    await router.push({ path: route.path, query: query, replace: true });

    if (response && response.responses) {
        contentResult.value = response.responses[2] as ContentSearchResponse;
        productResult.value = response.responses[0] as ProductSearchResponse;
        products.value = productResult.value.results?.map(x => ({ isPromotion: false, product: x })) ?? [];

        predictionsList.value = (response.responses[1] as SearchTermPredictionResponse)?.predictions ?? [];

        if (productResult.value.hits === 0) {
            const request = new SearchTermBasedProductRecommendationBuilder(contextStore.defaultSettings)
                .setSelectedProductProperties(contextStore.selectedProductProperties)
                .setSelectedVariantProperties({ allData: true })
                .setTerm(searchTerm.value)
                .setNumberOfRecommendations(40)
                .filters(builder => globalProductRecommendationFilters(builder))
                .build();

            const recommender = contextStore.getRecommender();

            fallbackRecommendations.value = await recommender.recommendSearchTermBasedProducts(request);
            return;
        }

        fallbackRecommendations.value = null;

        const placement = productResult.value.retailMedia?.placements?.TOP;
        if (placement) {

            if (placement?.results) {
                products.value = placement.results
                    .map(x => ({ isPromotion: true, product: x.promotedProduct?.result! }))
                    .concat(products.value ?? []);
            }
        }
    }
}

function searchFor(term: string) {
    searchTerm.value = term;
    search();
}

setSearchFn(search);

</script>

<template>
    <div class="inline-flex overflow-hidden rounded-full w-full xl:max-w-xl relative">
        <span class="flex items-center bg-slate-100 rounded-none px-3">
            <MagnifyingGlassIcon class="h-6 w-6 text-slate-600"/>
        </span>
        <XMarkIcon v-if="open" class="h-6 w-6 text-slate-600 absolute right-4 top-2.5 cursor-pointer" @click="close"/>
        <input v-model="searchTerm"
               type="text"
               placeholder="Search..."
               class="!rounded-r-full !shadow-none !pl-0 !bg-slate-100 !border-slate-100 focus:!border-slate-100 focus:!ring-0"
               @keyup="typeAHeadSearch()">
    </div>

    <Teleport to="#modal">
        <div v-if="open" id="search-result-overlay" class="modal">
            <div v-if="productResult" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
                <h2 v-if="filters.term" class="text-xl lg:text-3xl mb-6">
                    Showing results for <span class="underline--yellow inline-block">{{ filters.term }}</span>
                </h2>
                <h2 v-if="route.query.brandName" class="text-xl lg:text-3xl mb-6">
                    <span class="underline--yellow inline-block">{{ Array.isArray(route.query.brandName) ?
                        route.query.brandName.join('') : route.query.brandName }}</span>
                </h2>
                <div class="flex gap-10">
                    <div class="hidden lg:block lg:w-1/5">
                        <div v-if="predictionsList.length > 0 && filters.term && filters.term.length > 0"
                             class="pb-6 bg-white mb-6 border-b border-solid border-slate-300 flex flex-col gap-1">
                            <h3 class="font-semibold text-lg">
                                Suggestions
                            </h3>
                            <a v-for="(prediction) in predictionsList"
                               :key="prediction.term ?? ''"
                               class="block cursor-pointer text-slate-900 hover:!text-brand-500"
                               @click.prevent="searchFor(prediction.term ?? '')">
                                {{ prediction.term }}
                            </a>
                        </div>
                        <Facets v-if="productResult.facets && productResult.hits > 0"
                                :filters="filters"
                                :facets="productResult.facets"
                                :context="route.query.brandName ? 'Brand' : 'SearchOverlay'"
                                @search="search"/>
                        <div v-if="contentResult && contentResult.results && contentResult.results.length > 0">
                            <h4 class="font-semibold text-lg mb-1">
                                Content
                            </h4>
                            <div class="flex flex-col gap-1">
                                <template v-for="content in contentResult.results" :key="content.contentId ?? ''">
                                    <ContentTile :content="content" :show-content-demo-variant="contextStore.context.value.showContentMenu"/>
                                </template>
                            </div>
                        </div>
                    </div>
                    <div class="w-full lg:w-4/5">
                        <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
                            <span v-if="productResult.hits > 0">Showing {{ page * (pageSize) - (pageSize - 1) }} - {{
                                productResult?.hits < pageSize ? productResult?.hits : page * pageSize }} of {{
                                productResult?.hits }}</span>
                            <div class="hidden lg:block lg:flex-grow">
                            </div>
                            <Sorting v-model="filters.sort" @change="search"/>
                        </div>
                        <div v-if="productResult && productResult?.redirects && productResult.redirects.length > 0"
                             class="mb-3 p-3 bg-white">
                            <h2 class="text-xl font-semibold mb-2">
                                Redirect(s)
                            </h2>

                            <div v-for="redirect in productResult.redirects"
                                 :key="redirect.id"
                                 class="mb-1 pb-1 flex border-b border-solid border-gray-300">
                                {{ redirect.destination }}
                            </div>
                        </div>
                        <div v-if="productResult.hits == 0" class="p-3 text-xl bg-white">
                            No products found
                        </div>
                        <div v-if="contextStore.context.value.switchOnVariantBasedSearchDisplay">
                            <VariantBasedProductList :product-result="ref(productResult)"/>
                        </div>
                        <div v-else>
                            <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <ProductTile v-for="(product, index) in products"
                                             :key="index"
                                             :product="product.product"
                                             :is-promotion="product.isPromotion"/>
                            </div>
                        </div>
                        <div class="py-3 flex justify-center">
                            <Pagination v-model:total="productResult.hits"
                                        v-model:model-value="page"
                                        v-model:page-size="pageSize"
                                        @change="search"/>
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
$headerHeight: 109px;

.modal {
    @apply bg-white overflow-y-scroll;
    position: fixed;
    z-index: 999;
    top: $headerHeight; // height of header
    left: 0;
    width: 100%;
    height: calc(100% - $headerHeight);
}
</style>