<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, type SearchTermPredictionResult, type PriceRangeFacetResult, type CategoryHierarchyFacetResult, type ProductCategoryResult, type CategoryHierarchyFacetResultCategoryNode, type CategoryPath, type CategoryNameAndId, ContentSearchBuilder, type ContentSearchResponse } from '@relewise/client';
import { ref, watch } from 'vue';
import ProductTile from './ProductTile.vue';
import Facets from './Facets.vue';
import { useRoute } from 'vue-router';
import router from '@/router';
import Sorting from '../components/Sorting.vue';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';
import Pagination from '../components/Pagination.vue';
import { findCategoryById } from '@/helpers/categoryHelper';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import ContentTile from './ContentTile.vue';

const open = ref(false);
const searchTerm = ref<string>('');
const productResult = ref<ProductSearchResponse | null>(null);
const contentResult = ref<ContentSearchResponse | null>(null);
const products = ref<ProductWithType[] | null>(null);
const fallbackRecommendations = ref<ProductRecommendationResponse | null | undefined>(null);
const page = ref(1);
const predictionsList = ref<SearchTermPredictionResult[]>([]);
const filters = ref<Record<string, string | string[]>>({ price: [], term: '', sort: '' });
const route = useRoute();

const selectedCategoriesForFilters = ref<ProductCategoryResult[]>([]);
const categoriesForFilterOptions = ref<CategoryHierarchyFacetResultCategoryNode[] | undefined>(undefined);

let abortController = new AbortController();

const pageSize = 40;

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
        productResult.value = null;
        predictionsList.value = [];
        filters.value = { price: [], term: '', sort: ''  };
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

async function search() {
    abortController.abort();
    
    window.document.getElementById('search-result-overlay')?.scrollTo({ top: 0 });

    const show = searchTerm.value.length > 0 || Object.keys(filters.value).length > 0;

    if (!show) return; else showOrHide(show);

    filters.value.term = searchTerm.value;

    let applySalesPriceFacet = false;
    if (productResult.value?.facets?.items?.length === 3) {
        const salesPriceFacet = productResult.value?.facets.items[2] as PriceRangeFacetResult;
        
        const bothPriceFiltersSet = filters.value.price.length === 2;

        const lowerBoundNotEqualOrZero = (Number(filters.value.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive
                && salesPriceFacet.available!.value?.lowerBoundInclusive !== 0);

        const upperBoundNotEqualOrZero = (Number(filters.value.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive
                && salesPriceFacet.available!.value?.upperBoundInclusive !== 0);

        applySalesPriceFacet = salesPriceFacet && bothPriceFiltersSet && (lowerBoundNotEqualOrZero || upperBoundNotEqualOrZero);
    }
    const variationName = breakpointService.active.value.toUpperCase();

    const selectedCategoryFilterIds = filters.value['category'];
    const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

    const request = new SearchCollectionBuilder()
        .addRequest(new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({ allData: true })
            .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
            .filters(f => {
                if (Array.isArray(selectedCategoryFilterIds)) {
                    selectedCategoryFilterIds.slice(0, categoryFilterThreshold).forEach(id => {
                        f.addProductCategoryIdFilter('Ancestor', id);
                    });
                }
            })
            .facets(f => {

                let selectedCategoriesForFacet: CategoryPath[] | undefined = undefined;
                if (Array.isArray(selectedCategoryFilterIds) && selectedCategoryFilterIds.length > 0) {
                    if (selectedCategoryFilterIds.length < categoryFilterThreshold) {
                        selectedCategoriesForFacet = [{
                            breadcrumbPathStartingFromRoot: selectedCategoryFilterIds.map(id => ({ id })),
                        }];
                    } else {
                        const basePath: CategoryNameAndId[] = selectedCategoryFilterIds.slice(0, categoryFilterThreshold).map(id => ({ id }));
                        selectedCategoriesForFacet = selectedCategoryFilterIds.slice(categoryFilterThreshold).map(id => {
                            const thisPath = [...basePath, { id }];
                            return { breadcrumbPathStartingFromRoot: thisPath };
                        });
                    }
                }

                f.addProductCategoryHierarchyFacet('Descendants', selectedCategoriesForFacet, { displayName: true });

                f.addBrandFacet(
                    Array.isArray(filters.value['brand'])
                    && filters.value['brand']?.length > 0
                        ? filters.value['brand'] 
                        : null);

                f.addSalesPriceRangeFacet('Product', 
                    applySalesPriceFacet ? Number(filters.value.price[0]) : undefined,
                    applySalesPriceFacet ? Number(filters.value.price[1]) : undefined);
            })
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
            .pagination(p => p.setPageSize(pageSize).setPage(page.value))
            .setRetailMedia({
                location: {
                    key: 'SEARCH_RESULTS_PAGE',
                    placements: [{ key: 'TOP' }],
                    variation: { key: variationName },
                },
            })
            .build())
        .addRequest(new SearchTermPredictionBuilder(contextStore.defaultSettings)
            .addEntityType('Product', 'Content')
            .setTerm(searchTerm.value)
            .take(5)
            .build())
        .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
            .setTerm(searchTerm.value)
            .pagination(p => p.setPageSize(10))
            .setContentProperties({
                displayName: true,
                dataKeys: ['Image'],
            })
            .build())
        .build();

    abortController = new AbortController();
    const searcher = contextStore.getSearcher();
    const response = await searcher.batch(request, { abortSignal: abortController.signal });
    contextStore.assertApiCall(response);

    const query = { ...filters.value };
    if (!applySalesPriceFacet) delete query.price;

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

        if (productResult.value?.facets && productResult.value.facets.items) {
            const categoryHeirarchyFacetResult = (productResult.value.facets.items[0] as CategoryHierarchyFacetResult);
            
            // Populate categories for rendering with display names
            selectedCategoriesForFilters.value = [];
            if (Array.isArray(selectedCategoryFilterIds)) {
                selectedCategoryFilterIds.forEach(selectedId => {
                    const categoryNode = findCategoryById(categoryHeirarchyFacetResult.nodes, selectedId);
                    if (categoryNode) selectedCategoriesForFilters.value.push(categoryNode.category);
                });
            }

            // If no categories are selected, show root categories as options
            if (selectedCategoriesForFilters.value.length === 0) {
                categoriesForFilterOptions.value = categoryHeirarchyFacetResult.nodes;
            } else {
                // Determine the category to use as the root for filter options
                const rootCategoryId = selectedCategoriesForFilters.value[
                    Math.min(selectedCategoriesForFilters.value.length, categoryFilterThreshold) - 1
                ]?.categoryId;

                if (rootCategoryId) {
                    const rootCategoryNode = findCategoryById(categoryHeirarchyFacetResult.nodes, rootCategoryId);
                    categoriesForFilterOptions.value = rootCategoryNode?.children ?? undefined;
                }
            }

            if (productResult.value.facets.items[2] !== null) {
                const salesPriceFacet = productResult.value.facets!.items[2] as PriceRangeFacetResult;
                if (Object.keys(salesPriceFacet.selected ?? {}).length === 0 && 'available' in salesPriceFacet && salesPriceFacet.available && 'value' in salesPriceFacet.available) {
                    filters.value.price = [salesPriceFacet.available.value?.lowerBoundInclusive.toString() ?? '', salesPriceFacet.available.value?.upperBoundInclusive.toString() ?? ''];
                }
            }
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

</script>

<template>
    <div
        class="inline-flex overflow-hidden rounded-full w-full xl:max-w-xl relative">
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
                    <span class="underline--yellow inline-block">{{ Array.isArray(route.query.brandName) ? route.query.brandName.join('') : route.query.brandName }}</span>
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
                                v-model:page="page"
                                :filters="filters"
                                :facets="productResult.facets"
                                :categories-for-filter-options="categoriesForFilterOptions"
                                :selected-category-filter-options="selectedCategoriesForFilters"
                                :hide-brand-facet="!!route.query.brandName"                                
                                @search="search"/>
                        <div v-if="contentResult && contentResult.results && contentResult.results.length > 0">
                            <h4 class="font-semibold text-lg mb-1">
                                Content
                            </h4>
                            <div class="flex flex-col gap-1">
                                <template v-for="content in contentResult.results" :key="content.contentId ?? ''">
                                    <ContentTile :content="content"/>
                                </template>
                            </div>
                        </div>
                    </div>
                    <div class="w-full lg:w-4/5">
                        <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
                            <span v-if="productResult.hits > 0">Showing {{ page * (pageSize) - (pageSize - 1) }} - {{ productResult?.hits < pageSize ? productResult?.hits : page * pageSize }} of {{ productResult?.hits }}</span>
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
                        <div v-else>
                            <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <ProductTile v-for="(product, index) in products"
                                             :key="index"
                                             :product="product.product"
                                             :is-promotion="product.isPromotion"/>
                            </div>
                            <div class="py-3 flex justify-center">
                                <Pagination v-model.sync="page" v-model:total="productResult.hits" :page-size="pageSize" @change="search"/>
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