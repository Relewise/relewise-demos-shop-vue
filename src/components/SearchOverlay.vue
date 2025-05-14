import contextStore from '@/stores/context.store';
<script setup lang="ts">
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, type SearchTermPredictionResult, type PriceRangeFacetResult, type CategoryHierarchyFacetResult, type ProductCategoryResult, type CategoryHierarchyFacetResultCategoryNode, type CategoryPath, type CategoryNameAndId, ContentSearchBuilder, type ContentSearchResponse, type ProductResult, type VariantResult, type FacetResult, type DoubleNullableDataObjectRangeFacet } from '@relewise/client';
import { computed, ref, watch } from 'vue';
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
import { addAssortmentFilters } from '@/stores/customFilters';
import { addCampaignRelevanceModifier } from '@/stores/campaignRelevanceModifier';
import { facetConfig, FacetContexts, getCategoryThreshold, getDefaultFilters, getFacetKeysForContext, getSelectedCategoryFilterIds } from '@/config/FacetConfig';
import contextStore from '@/stores/context.store';

const open = ref(false);
const searchTerm = ref<string>('');
const result = ref<ProductSearchResponse | null>(null);
const products = ref<ProductWithType[] | null>(null);
const fallbackRecommendations = ref<ProductRecommendationResponse | null | undefined>(null);
const page = ref(1);
const predictionsList = ref<SearchTermPredictionResult[]>([]);
const contentElements = ref<ContentSearchResponse | null>(null);

const filters = ref(getDefaultFilters());

const route = useRoute();

const selectedCategoriesForFilters = ref<ProductCategoryResult[]>([]);
const categoriesForFilterOptions = ref<CategoryHierarchyFacetResultCategoryNode[] | undefined>(undefined);

let abortController = new AbortController();

const pageSize = 25;


//USED IN B2B Variant scenario
const groupedProducts = computed(() => {
    const groups: Record<string, ProductResult & { Variants: VariantResult[] }> = {};

    result.value?.results?.forEach((product) => {
        const id = product.productId as string;
        if (!groups[id]) {
            groups[id] = { ...product, Variants: [] };
        }
        product.variant && groups[id].Variants.push(product.variant as VariantResult);
    });

    return Object.values(groups);
});

function close() {
    showOrHide(false);
}

watch(() => ({ ...route }), (value, oldValue) => {
    if (route.query.open === '1' && !open.value) {
        scrollTo({ top: 0 });

        const searchParams = new URLSearchParams(window.location.search);
        searchParams.forEach((value, key) => {
            const normalizedKey = key.toLowerCase();

            if (normalizedKey === 'term') {
                searchTerm.value = value;
                return;
            }
            if (normalizedKey === 'sort') {
                filters.value.sort = value;
                return;
            }

            const existing = filters.value[normalizedKey];
            existing && Array.isArray(existing)
                ? existing.push(value)
                : filters.value[normalizedKey] = [value];
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
        filters.value = { SalesPrice: [], term: '', sort: '' };
        router.push({ path: router.currentRoute.value.path, query: {}, replace: true });
        //router.push({ path: router.currentRoute.value.path, query: { ...route.query }, replace: true });
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

    const variationName = breakpointService.active.value.toUpperCase();
    const selectedCategoryFilterIds = getSelectedCategoryFilterIds(filters.value);
    const categoryFilterThreshold = getCategoryThreshold();

    const request = new SearchCollectionBuilder()
    .addRequest(
        (() => {
            const builder = new ProductSearchBuilder(contextStore.defaultSettings)
                .setSelectedProductProperties(contextStore.selectedProductProperties)
                .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
                .filters(f => {
                    if (Array.isArray(selectedCategoryFilterIds)) {
                        selectedCategoryFilterIds.slice(0, categoryFilterThreshold).forEach(id => {
                            f.addProductCategoryIdFilter('Ancestor', id);
                        });
                    }
                    addAssortmentFilters(f);
                })
                .relevanceModifiers(rm => {
                    addCampaignRelevanceModifier(rm);
                })
                .facets(f => {
                    const keys = getFacetKeysForContext(FacetContexts.SearchOverlay);
                    keys.forEach(key => {
                        const facetItem = facetConfig.find(k => k.key == key);
                        facetItem?.config?.addToBuilder?.(f, filters.value);
                    });
                })
                .sorting(s => {
                    if (filters.value.sort === 'Popular') {
                        s.sortByProductPopularity();
                    } else if (filters.value.sort === 'SalesPriceDesc') {
                        s.sortByProductAttribute('SalesPrice', 'Descending');
                    } else if (filters.value.sort === 'SalesPriceAsc') {
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
                .setExplodedVariants(1);

            if (contextStore.getswitchOnVariantBasedSearchDisplay()) {
                builder.setExplodedVariants(5);
                builder.setSelectedVariantProperties({
                    displayName: true,
                    pricing: true,
                    allData: true,
                });
            }

            return builder.build();
        })()
    )
    .addRequest(
        new SearchTermPredictionBuilder(contextStore.defaultSettings)
            .addEntityType('Product')
            .setTerm(searchTerm.value)
            .filters(f=>{
                addAssortmentFilters(f);
            })
            .take(5)
            .build()
    )
    .addRequest(
        new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
            .pagination(p => p.setPageSize(10).setPage(1))
            .build()
    )
    .build();

    // const request = new SearchCollectionBuilder()
    //     .addRequest(new ProductSearchBuilder(contextStore.defaultSettings)
    //         .setSelectedProductProperties(contextStore.selectedProductProperties)
            
    //         .setSelectedVariantProperties(contextStore.getswitchOnVariantBasedSearchDisplay() ? { displayName: true, pricing: true, allData: true }: {})
    //         .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
    //         .filters(f => {
    //             if (Array.isArray(selectedCategoryFilterIds)) {
    //                 selectedCategoryFilterIds.slice(0, categoryFilterThreshold).forEach(id => {
    //                     f.addProductCategoryIdFilter('Ancestor', id);
    //                 });
    //             }
    //             addAssortmentFilters(f);
    //         })
    //         .relevanceModifiers(rm => {
    //             addCampaignRelevanceModifier(rm);
    //         })
    //         .facets(f => {
    //             const keys = getFacetKeysForContext(FacetContexts.SearchOverlay);
    //             keys.forEach(key => {
    //                 const facetItem = facetConfig.find(k => k.key == key);
    //                 facetItem?.config?.addToBuilder?.(f, filters.value);
    //             });
    //         })
    //         .sorting(s => {
    //             if (filters.value.sort === 'Popular') {
    //                 s.sortByProductPopularity();
    //             }
    //             else if (filters.value.sort === 'SalesPriceDesc') {
    //                 s.sortByProductAttribute('SalesPrice', 'Descending');
    //             }
    //             else if (filters.value.sort === 'SalesPriceAsc') {
    //                 s.sortByProductAttribute('SalesPrice', 'Ascending');
    //             }
    //         })
    //         .pagination(p => p.setPageSize(pageSize).setPage(page.value))
    //         .setRetailMedia({
    //             location: {
    //                 key: 'SEARCH_RESULTS_PAGE',
    //                 placements: [{ key: 'TOP' }],
    //                 variation: { key: variationName },
    //             },
    //         })
    //         .setExplodedVariants(5)
    //         .build())


    //     .addRequest(new SearchTermPredictionBuilder(contextStore.defaultSettings)
    //         .addEntityType('Product')
    //         .setTerm(searchTerm.value)
    //         .take(5)
    //         .build())

    //     .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
    //         .setContentProperties(contextStore.selectedContentProperties)
    //         .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
    //         .pagination(p => p.setPageSize(10).setPage(1))
    //         .build())

    //     .build();

    abortController = new AbortController();
    const searcher = contextStore.getSearcher();
    const response = await searcher.batch(request, { abortSignal: abortController.signal });
    contextStore.assertApiCall(response);

    const query = { ...filters.value };

    await router.push({
        path: route.path,
        query: { ...route.query, ...query }, // Merge in existing query
        replace: true
    });

    if (response && response.responses) {
        result.value = response.responses[0] as ProductSearchResponse;
        products.value = result.value.results?.map(x => ({ isPromotion: false, product: x })) ?? [];

        predictionsList.value = (response.responses[1] as SearchTermPredictionResponse)?.predictions ?? [];
        contentElements.value = response.responses[2] as ContentSearchResponse;

        if (result.value.hits === 0) {
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

        if (result.value?.facets && result.value.facets.items) {
            const categoryHeirarchyFacetResult = (result.value.facets.items[0] as CategoryHierarchyFacetResult);

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

function searchFor(term: string) {
    searchTerm.value = term;
    search();
}

</script>

<template>
    <div class="inline-flex overflow-hidden rounded-full w-full xl:max-w-xl relative">
        <span class="flex items-center bg-slate-100 rounded-none px-3">
            <MagnifyingGlassIcon class="h-6 w-6 text-slate-600" />
        </span>
        <XMarkIcon v-if="open" class="h-6 w-6 text-slate-600 absolute right-4 top-2.5 cursor-pointer" @click="close" />
        <input v-model="searchTerm" type="text" placeholder="Search..."
            class="!rounded-r-full !shadow-none !pl-0 !bg-slate-100 !border-slate-100 focus:!border-slate-100 focus:!ring-0"
            @keyup="typeAHeadSearch()">
    </div>

    <Teleport to="#modal">
        <div v-if="open" id="search-result-overlay" class="modal">
            <div v-if="result" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
                <h2 v-if="filters.term" class="text-xl lg:text-3xl mb-6">
                    Showing results for <span class="underline--yellow inline-block">{{ filters.term }}</span>
                </h2>
                <div class="flex gap-10">
                    <div class="hidden lg:block lg:w-1/5">
                        <div v-if="predictionsList.length > 0 && filters.term && filters.term.length > 0"
                            class="pb-6 bg-white mb-6 border-b border-solid border-slate-300">
                            <h3 class="font-semibold text-lg">
                                Suggestions
                            </h3>
                            <a v-for="(prediction) in predictionsList" :key="prediction.term ?? ''"
                                class="mb-1 block cursor-pointer text-slate-900"
                                @click.prevent="searchFor(prediction.term ?? '')">
                                {{ prediction.term }}
                            </a>
                        </div>
                        <Facets v-if="result.facets && result.hits > 0" v-model:page="page" :filters="filters"
                            :facets="result.facets" :categories-for-filter-options="categoriesForFilterOptions"
                            :selected-category-filter-options="selectedCategoriesForFilters" context="search-overlay"
                            @search="search" />

                        <div v-if="contentElements && Array.isArray(contentElements.results) && contentElements?.results?.length > 0"
                            class="pb-6 bg-white mb-6 border-b border-solid border-slate-300">
                            <h3 class="font-semibold text-lg">
                                Articles
                            </h3>
                            <ul class="space-y-6">
                                <li v-for="(blogpost) in contentElements?.results" :key="blogpost.contentId ?? ''"
                                    class="flex items-center">
                                    <RouterLink :to="{ name: 'content-blog', params: { id: blogpost.contentId } }"
                                        class="text-xl text-blue-600 hover:underline font-medium">
                                        <a class="flex items-center space-x-4">
                                            <figure class="w-28 h-28 flex-shrink-0 overflow-hidden">
                                                <picture>
                                                    <img :src="blogpost?.data?.Image.value"
                                                        class="w-full h-full object-cover" />
                                                </picture>
                                            </figure>
                                            <span class="text-lg font-semibold text-black">
                                                {{ blogpost.displayName }}
                                            </span>
                                        </a>
                                    </RouterLink>

                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="w-full lg:w-4/5">
                        <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
                            <span v-if="result.hits > 0">Showing {{ page * (pageSize) - (pageSize - 1) }} - {{
                                result?.hits < pageSize ? result?.hits : page * pageSize }} of {{ result?.hits }}</span>
                                    <div class="hidden lg:block lg:flex-grow">
                                    </div>
                                    <Sorting v-model="filters.sort" @change="search" />
                        </div>
                        <div v-if="result && result?.redirects && result.redirects.length > 0"
                            class="mb-3 p-3 bg-white">
                            <h2 class="text-xl font-semibold mb-2">
                                Redirect(s)
                            </h2>

                            <div v-for="redirect in result.redirects" :key="redirect.id"
                                class="mb-1 pb-1 flex border-b border-solid border-gray-300">
                                {{ redirect.destination }}
                            </div>
                        </div>
                        <div v-if="result.hits == 0" class="p-3 text-xl bg-white">
                            No products found
                        </div>
                        <div v-else>
                            <div v-if="contextStore.getswitchOnVariantBasedSearchDisplay()">
                                <div v-for="(product, index) in groupedProducts"
                                    :key="product.productId ?? 'group-' + index" class="bg-white p-4 rounded shadow">
                                    <h3 class="text-lg font-semibold flex justify-between items-center mb-2">
                                        <RouterLink :to="{ name: 'product', params: { id: product.productId } }"
                                            class="text-blue-600 underline">
                                            <span v-html="product.displayName"></span>
                                        </RouterLink>
                                        <span class="text-sm text-gray-500 ml-4">
                                            {{ product.brand?.displayName }}
                                        </span>
                                    </h3>
                                    <div v-if="product.Variants.length > 0">

                                        <table class="w-full mt-4 border-t border-gray-200 text-left text-sm">
                                            <thead class="bg-gray-50 text-gray-700 uppercase">
                                                <tr>
                                                    <th class="py-2 px-3">Image</th>
                                                    <th class="py-2 px-3">Variant name</th>
                                                    <th class="py-2 px-3">Variant Id</th>
                                                    <th class="py-2 px-3">Availability</th>
                                                    <th class="py-2 px-3">Price</th>
                                                    <th class="py-2 px-3">Price incl. VAT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="(variant, index) in product.Variants"
                                                    :key="variant.variantId ?? 'variant-' + index"
                                                    class="border-b border-gray-200">

                                                    <td class="py-2 px-3">
                                                        <img :src="variant.data?.Image?.value" alt="Variant Image"
                                                            class="w-12 h-12 object-contain" />
                                                    </td>
                                                    <td
                                                        class="py-2 px-3 max-w-[300px] truncate whitespace-nowrap overflow-hidden align-top">
                                                        <span v-html="variant.displayName"></span>
                                                    </td>
                                                    <td class="py-2 px-3">
                                                        <RouterLink :to="{
                                                            name: 'product',
                                                            params: { id: product.productId },
                                                            ...(product.variant?.variantId ? { query: { variantId: product.variant.variantId } } : {})
                                                        }" class="block text-blue-600 underline">
                                                            {{ variant.variantId }}
                                                        </RouterLink>
                                                    </td>

                                                    <td class="py-2 px-3 text-green-600">
                                                        In stock
                                                    </td>
                                                    <td class="py-2 px-3 font-semibold">
                                                        EUR {{ variant.listPrice ?? product.listPrice }}
                                                    </td>
                                                    <td class="py-2 px-3 font-semibold">
                                                        EUR {{ variant.salesPrice ?? product.salesPrice }}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div class="py-3 flex justify-center">
                                    <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="pageSize"
                                        @change="search" />
                                </div>
                            </div>

                            <div v-else>
                                <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    <ProductTile v-for="(product, index) in products" :key="index"
                                        :product="product.product" :is-promotion="product.isPromotion" />
                                </div>
                                <div class="py-3 flex justify-center">
                                    <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="pageSize"
                                        @change="search" />
                                </div>
                            </div>
                        </div>
                        <div v-if="fallbackRecommendations && fallbackRecommendations.recommendations && fallbackRecommendations.recommendations?.length > 0"
                            class="w-full p-3 bg-white rounded mb-6">
                            <h2 class="text-xl">
                                You may like
                            </h2>
                            <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <ProductTile v-for="(product, index) in fallbackRecommendations?.recommendations"
                                    :key="index" :product="product" />
                            </div>
                        </div>
                        <div v-if="fallbackRecommendations && fallbackRecommendations.recommendations && fallbackRecommendations.recommendations?.length > 0"
                            class="w-full p-3 bg-white rounded mb-6">
                            <h2 class="text-xl">
                                You may like
                            </h2>
                            <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                <ProductTile v-for="(product, index) in fallbackRecommendations?.recommendations"
                                    :key="index" :product="product" />
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