<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, ContentSearchBuilder, type ContentSearchResponse, type PriceRangeFacetResult, type SearchTermPredictionResult } from '@relewise/client';
import { ref, watch } from 'vue';
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
import { useRoute } from 'vue-router';
import ContentSearchOverlayResult from './ContentSearchOverlayResult.vue';

const open = ref(false);	
const searchTerm = ref<string>('');
const productSearchResult = ref<ProductSearchResponse | null>(null);
const contentRecommendationResult = ref<ContentSearchResponse | null>(null);
const contentSearchResult = ref<ContentSearchResponse | null>(null);
const products = ref<ProductWithType[] | null>(null);
const fallbackRecommendations = ref<ProductRecommendationResponse | null | undefined>(null);
const page = ref(1);	
const contentPage = ref(1);	
const predictionsList = ref<SearchTermPredictionResult[]>([]);	
const filters = ref<Record<string, string | string[]>>({ term: '', sort: '', sortContent: '' });	
const route = useRoute();

let abortController = new AbortController();

const productPageSize = 40;
const contentPageSize = 2;

const activeTab = ref<'products' | 'content'>('products');

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
            if (key === 'sort') {	
                filters.value.sort = value;	
                return;	
            }
            if (key === 'sortContent') {
                filters.value.sortContent = value;
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
        productSearchResult.value = null;
        contentSearchResult.value = null;
        predictionsList.value = [];
        filters.value = { term: '', sort: '', sortContent: '' };
        router.push({ path: router.currentRoute.value.path, query: {} });
    }

    open.value = show;
    if (show) {
        window.document.body.classList.add('overflow-hidden');
        window.document.body.classList.add('xl:pr-[17px]');
    } else {
        window.document.body.classList.remove('overflow-hidden');
        window.document.body.classList.remove('xl:pr-[17px]');
    }
}

function typeAHeadSearch() {
    if (filters.value.term !== searchTerm.value) {
        filters.value['open'] = '1';

        search();
    }
}

async function productSearch() {
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
                    .pagination(p => p.setPageSize(productPageSize).setPage(page.value))
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
        contentRecommendationResult.value = response.responses[2] as ContentSearchResponse;
        productSearchResult.value = response.responses[0] as ProductSearchResponse;
        products.value = productSearchResult.value.results?.map(x => ({ isPromotion: false, product: x })) ?? [];

        predictionsList.value = (response.responses[1] as SearchTermPredictionResponse)?.predictions ?? [];

        if (productSearchResult.value.hits === 0) {
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

        const placement = productSearchResult.value.retailMedia?.placements?.TOP;
        if (placement) {

            if (placement?.results) {
                products.value = placement.results
                    .map(x => ({ isPromotion: true, product: x.promotedProduct?.result! }))
                    .concat(products.value ?? []);
            }
        }
    }
}

async function contentSearch() {
    abortController.abort();

    window.document.getElementById('search-result-overlay')?.scrollTo({ top: 0 });

    const show = searchTerm.value.length > 0 || Object.keys(filters.value).length > 0;

    if (!show) return; else showOrHide(show);

    filters.value.term = searchTerm.value;

    let applySalesPriceFacet = false;
    if (contentSearchResult.value?.facets?.items?.length === 3) {
        const salesPriceFacet = contentSearchResult.value?.facets.items[2] as PriceRangeFacetResult;

        const bothPriceFiltersSet = filters.value.price.length === 2;

        const lowerBoundNotEqualOrZero = (Number(filters.value.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive
            && salesPriceFacet.available!.value?.lowerBoundInclusive !== 0);

        const upperBoundNotEqualOrZero = (Number(filters.value.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive
            && salesPriceFacet.available!.value?.upperBoundInclusive !== 0);

        applySalesPriceFacet = salesPriceFacet && bothPriceFiltersSet && (lowerBoundNotEqualOrZero || upperBoundNotEqualOrZero);
    }

    const request = new ContentSearchBuilder(contextStore.defaultSettings)
        .setContentProperties(contextStore.selectedContentProperties)
        .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
        .pagination(p => p.setPageSize(contentPageSize).setPage(contentPage.value))
        .highlighting(h =>
            h.enabled(true)
                .setHighlightable({
                    displayName: true,
                    dataKeys: ['Summary'],
                })
                .setLimit({
                    maxEntryLimit: 10,
                    maxSnippetsPerEntry: 4,
                    maxSnippetsPerField: 1,
                    maxWordsBeforeMatch: 20,
                    maxWordsAfterMatch: 20,
                    maxSentencesToIncludeBeforeMatch: 0,
                    maxSentencesToIncludeAfterMatch: 0,
                })
                .setShape({
                    snippets: {
                        include: true,
                        useEllipses: true,
                        includeMatchedWords: true,
                    },
                    offsets: {
                        include: true,
                    },
                }),
        )
        .sorting(s => {
            if (filters.value.sortContent === 'Popular') {
                s.sortByContentPopularity();
            }
        })
        .build();

    abortController = new AbortController();
    const searcher = contextStore.getSearcher();
    const response = await searcher.searchContents(request, { abortSignal: abortController.signal });
    contextStore.assertApiCall(response);

    const query = { ...filters.value };
    if (!applySalesPriceFacet) delete query.price;

    await router.push({ path: route.path, query: query, replace: true });

    if(response)
        contentSearchResult.value = { ...response as ContentSearchResponse };
}

function searchFor(term: string) {
    searchTerm.value = term;
    productSearch();
    contentSearch();
}

function search() {
    if (activeTab.value === 'products')
        productSearch();
    else if (activeTab.value === 'content')
        contentSearch();
}

watch(activeTab, (newTab) => {
    // Reset page, facets, and sorting when switching tabs
    page.value = 1;
    contentPage.value = 1;

    // Reset facets and sorting
    filters.value = { term: searchTerm.value, sort: '', sortContent: '', open: '1' };

    if (newTab === 'products') {
        productSearch();
    } else if (newTab === 'content') {
        contentSearch();
    }
});

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
            <div v-if="productSearchResult" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
                <!-- Tabs -->
                <div class="mb-6 flex border-b border-slate-200">
                    <div
                        class="px-4 py-2 text-lg font-semibold focus:outline-none"
                        :class="activeTab === 'products' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-600'"
                        @click="activeTab = 'products'">
                        Products
                    </div>
                    <div
                        class="px-4 py-2 text-lg font-semibold focus:outline-none"
                        :class="activeTab === 'content' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-600'"
                        @click="activeTab = 'content'">
                        Content
                    </div>
                </div>

                <!-- Tab content -->
                <div v-if="activeTab === 'products'">
                    <!-- BEGIN: Product tab content (moved from previous markup) -->
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
                            <Facets v-if="productSearchResult.facets && productSearchResult.hits > 0"
                                    :filters="filters"
                                    :facets="productSearchResult.facets"
                                    :context="route.query.brandName ? 'Brand' : 'SearchOverlay'"
                                    @search="productSearch"/>
                            <div v-if="contentRecommendationResult && contentRecommendationResult.results && contentRecommendationResult.results.length > 0">
                                <h4 class="font-semibold text-lg mb-1">
                                    Content
                                </h4>
                                <div class="flex flex-col gap-1">
                                    <template v-for="content in contentRecommendationResult.results" :key="content.contentId ?? ''">
                                        <ContentTile :content="content" :show-content-demo-variant="contextStore.context.value.showContentMenu"/>
                                    </template>
                                </div>
                            </div>
                        </div>
                        <div class="w-full lg:w-4/5">
                            <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
                                <span v-if="productSearchResult.hits > 0">Showing {{ page * (productPageSize) - (productPageSize - 1) }} - {{
                                    productSearchResult?.hits < productPageSize ? productSearchResult?.hits : page * productPageSize }} of {{
                                    productSearchResult?.hits }}</span>
                                <div class="hidden lg:block lg:flex-grow">
                                </div>
                                <Sorting v-model="filters.sort" type="Product" @change="productSearch"/>
                            </div>
                            <div v-if="productSearchResult && productSearchResult?.redirects && productSearchResult.redirects.length > 0"
                                 class="mb-3 p-3 bg-white">
                                <h2 class="text-xl font-semibold mb-2">
                                    Redirect(s)
                                </h2>

                                <div v-for="redirect in productSearchResult.redirects"
                                     :key="redirect.id"
                                     class="mb-1 pb-1 flex border-b border-solid border-gray-300">
                                    {{ redirect.destination }}
                                </div>
                            </div>
                            <div v-if="productSearchResult.hits == 0" class="p-3 text-xl bg-white">
                                No products found
                            </div>
                            <div v-if="contextStore.context.value.switchOnVariantBasedSearchDisplay">
                                <VariantBasedProductList :product-result="ref(productSearchResult)"/>
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
                                {{ productSearchResult.hits }}
                                <Pagination v-model:total="productSearchResult.hits"
                                            v-model:model-value="page"
                                            v-model:page-size="productPageSize"
                                            @change="productSearch"/>
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
                    <!-- END: Product tab content -->
                </div>
                <div v-else-if="activeTab === 'content'">
                    <div v-if="contentSearchResult" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
                        <ContentSearchOverlayResult 
                            v-model:sort="filters.sortContent"
                            v-model:page="contentPage"
                            :content-search-result="contentSearchResult"
                            :page-size="contentPageSize"
                            :term="filters.term"
                            @search="contentSearch"/>
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