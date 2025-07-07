<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, ContentSearchBuilder, type ContentSearchResponse, type SearchTermPredictionResult } from '@relewise/client';
import { ref, watch } from 'vue';
import router from '@/router';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import { addRelevanceModifiers } from '@/helpers/relevanceModifierHelper';
import { getFacets } from '@/helpers/facetHelper';
import { useRoute } from 'vue-router';
import ContentSearchOverlayResult from './ContentSearchOverlayResult.vue';
import ProductSearchOverlayResult from './ProductSearchOverlayResult.vue';

enum Tabs {
    Products,
    Content
}

const open = ref(false);	
const searchTerm = ref<string>('');
const productSearchResult = ref<ProductSearchResponse | null>(null);
const contentRecommendationResult = ref<ContentSearchResponse | null>(null);
const contentSearchResult = ref<ContentSearchResponse | null>(null);
const products = ref<ProductWithType[] | null>(null);
const fallbackRecommendations = ref<ProductRecommendationResponse | null>(null);
const page = ref(1);	
const predictionsList = ref<SearchTermPredictionResult[]>([]);	
const filters = ref<Record<string, string | string[]>>({ term: '', sort: '' });	
const route = useRoute();

let abortController = new AbortController();

const productPageSize = 40;
const contentPageSize = 10;

const activeTab = ref(Tabs.Products);

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
        productSearchResult.value = null;
        contentSearchResult.value = null;
        predictionsList.value = [];
        filters.value = { term: '', sort: '' };
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

    const variationName = breakpointService.active.value.toUpperCase();

    const selectedCategoryFilterIds = filters.value['category'];
    const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

    const request = new SearchCollectionBuilder()
        .addRequest(new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({displayName: true,
                pricing: true,
                allData: true})
            .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
            .setExplodedVariants(contextStore.context.value.variantBasedSearchOverlay ? 5 : 1)
            .filters(f => {
                if (Array.isArray(selectedCategoryFilterIds)) {
                    selectedCategoryFilterIds.slice(0, categoryFilterThreshold).forEach(id => {
                        f.addProductCategoryIdFilter('Ancestor', id);
                    });
                }

                if (route.query.brandName && typeof route.query.brandName === 'string') {
                    f.addBrandIdFilter(route.query.brandName);
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
            })
            .build())
        .addRequest(new SearchTermPredictionBuilder(contextStore.defaultSettings)
            .addEntityType('Product', 'Content')
            .setTerm(searchTerm.value)
            .take(5)
            .filters(f => globalProductRecommendationFilters(f))
            .build())
        .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
            .setTerm(searchTerm.value)
            .pagination(p => p.setPageSize(10))
            .setContentProperties(contextStore.selectedContentProperties)
            .build())
        .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
            .pagination(p => p.setPageSize(contentPageSize).setPage(page.value))
            .facets(f => {
                getFacets('ContentSearch', f, filters.value);
            })
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
                        maxWordsBeforeMatch: 100,
                        maxWordsAfterMatch: 100,
                        maxSentencesToIncludeBeforeMatch: 10,
                        maxSentencesToIncludeAfterMatch: 10,
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
                if (filters.value.sort === 'Popular') {
                    s.sortByContentPopularity();
                }
            })
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

        if (response.responses.length === 4) {
            contentSearchResult.value = response.responses[3] as ContentSearchResponse;
        }

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

            fallbackRecommendations.value = await recommender.recommendSearchTermBasedProducts(request) ?? null;
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

function searchFor(term: string) {
    searchTerm.value = term;
    search();
}

watch(activeTab, () => {
    page.value = 1;
    filters.value = { term: searchTerm.value, sort: '', open: '1' };
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
            <div v-if="productSearchResult || contentSearchResult" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
                <div v-if="contextStore.context.value.contentSearch && !route.query.brandName" class="mb-6 flex border-b border-slate-200">
                    <div
                        :class="(activeTab == Tabs.Products ? 'border-b-2 border-solid border-brand-500' : '') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'"
                        @click="() => activeTab = Tabs.Products">
                        Products ({{ productSearchResult?.hits }})
                    </div>
                    <div
                        :class="(activeTab == Tabs.Content ? 'border-b-2 border-solid border-brand-500' : '') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'"
                        @click="() => activeTab = Tabs.Content">
                        Content ({{ contentSearchResult?.hits }})
                    </div>
                </div>

                <ProductSearchOverlayResult 
                    v-if="activeTab === Tabs.Products
                        && productSearchResult" 
                    v-model:sort="filters.sort"
                    v-model:page="page"
                    :page-size="productPageSize"
                    :term="filters.term"
                    :product-search-result="productSearchResult"
                    :content-recommendation-result="contentRecommendationResult"
                    :fallback-recommendations="fallbackRecommendations"
                    :products="products"
                    :predictions-list="predictionsList"
                    :filters="filters"
                    @search-for="searchFor"
                    @search="search"/>
                <ContentSearchOverlayResult 
                    v-else-if="activeTab === Tabs.Content 
                        && contextStore.context.value.contentSearch
                        && contentSearchResult"
                    v-model:sort="filters.sort"
                    v-model:page="page"
                    :content-search-result="contentSearchResult"
                    :page-size="contentPageSize"
                    :term="filters.term"
                    :predictions-list="predictionsList"
                    :filters="filters"
                    @search-for="searchFor"
                    @search="search"/>
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