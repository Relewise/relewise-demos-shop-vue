<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, SparklesIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { type ProductSearchResponse, SearchCollectionBuilder, ProductSearchBuilder, SearchTermPredictionBuilder, PersonalProductRecommendationBuilder, SearchTermBasedProductRecommendationBuilder, type ProductRecommendationResponse, type SearchTermPredictionResponse, ContentSearchBuilder, type ContentSearchResponse, type SearchTermPredictionResult, type RetailMediaResultPlacementResultEntityDisplayAd, type DisplayAdResult, type RetailMediaResultPlacementResultEntity } from '@relewise/client';
import { onBeforeUnmount, ref, watch } from 'vue';
import router from '@/router';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';
import trackingService from '@/services/tracking.service';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import { addRelevanceModifiers } from '@/helpers/relevanceModifierHelper';
import { getFacets } from '@/helpers/facetHelper';
import { useRoute, type LocationQueryValue } from 'vue-router';
import ContentSearchOverlayResult from './ContentSearchOverlayResult.vue';
import ProductSearchOverlayResult from './ProductSearchOverlayResult.vue';
import { applyVariantRequestSettings, selectedProductPropertiesForTermSearch } from '@/helpers/productSearchRequest';
import { routeConversationalSearch } from '@/helpers/conversationalSearchApi';

const emit = defineEmits<{
    openAssistant: [query: string];
}>();

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
const rightSide = ref<RetailMediaResultPlacementResultEntity[] | null>(null);
const noResultProductRecommendations = ref<ProductRecommendationResponse | null>(null);
const noResultProductRecommendationsTitle = ref('Recommended for you');
const trackedBrandId = ref<string | null>(null);
// page moved into filters below as filters.value.page (string)
const predictionsList = ref<SearchTermPredictionResult[]>([]);
const filters = ref<Record<string, string | string[]>>({ term: '', sort: '', page: '1' });
const route = useRoute();
let abortController = new AbortController();
let intentAbortController = new AbortController();
let intentTimer: number | undefined;
let intentRevision = 0;
const assistantSuggestion = ref<string | null>(null);
const dismissedAssistantQuery = ref<string | null>(null);

const productPageSize = 40;
const contentPageSize = 10;

const activeTab = ref(Tabs.Products);

function close() {
    showOrHide(false);
}

function openWithPrompt(prompt = '') {
    searchTerm.value = prompt.trim();

    if (!searchTerm.value) {
        showOrHide(false);
        return;
    }

    showOrHide(true);
    typeAHeadSearch();
}

function switchToAssistant() {
    const query = searchTerm.value;
    close();
    emit('openAssistant', query);
}

function acceptAssistantSuggestion() {
    const query = assistantSuggestion.value ?? searchTerm.value.trim();
    close();
    emit('openAssistant', query);
}

function keepSearching() {
    dismissedAssistantQuery.value = assistantSuggestion.value;
    assistantSuggestion.value = null;
    typeAHeadSearch();
}

defineExpose({ openWithPrompt });

watch(() => ({ ...route }), (value, oldValue) => {
    if (route.query.open === '1') {
        scrollTo({ top: 0 });

        const searchParams = new URLSearchParams(window.location.search);

        // Build a new filters object from the current URL params so
        // any previous/old filters are removed when the URL doesn't include them.
        const newFilters: Record<string, string | string[]> = { term: '', sort: '', page: '1' };
        searchParams.forEach((value, key) => {
            if (key === 'term') {
                if (oldValue.query.open !== '1') {
                    searchTerm.value = value;
                }

                newFilters.term = value;
                return;
            }
            if (key === 'sort') {
                newFilters.sort = value;
                return;
            }
            if (key === 'page') {
                newFilters.page = value;
                return;
            }

            const existing = newFilters[key];
            if (!existing) {
                newFilters[key] = [value];
            } else if (Array.isArray(existing) && !existing.includes(value)) {
                (existing as string[]).push(value);
            } else if (!Array.isArray(existing) && existing !== value) {
                newFilters[key] = [existing as string, value];
            }
        });

        newFilters['open'] = '1';
        filters.value = newFilters;

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
        noResultProductRecommendations.value = null;
        noResultProductRecommendationsTitle.value = 'Recommended for you';
        predictionsList.value = [];
        filters.value = { term: '', sort: '' };
        trackedBrandId.value = null;
        assistantSuggestion.value = null;
        dismissedAssistantQuery.value = null;
        router.push({ path: router.currentRoute.value.path, query: {} });
    }

    open.value = show;
    if (show) {
        window.document.documentElement.classList.add('overflow-hidden');
        window.document.body.classList.add('overflow-hidden');
        window.document.body.classList.add('xl:pr-[17px]');
    } else {
        window.document.documentElement.classList.remove('overflow-hidden');
        window.document.body.classList.remove('overflow-hidden');
        window.document.body.classList.remove('xl:pr-[17px]');
    }
}

function typeAHeadSearch() {
    if (filters.value.term !== searchTerm.value) {
        // reset page to 1 when doing a type-ahead search
        filters.value = { term: searchTerm.value, sort: '', open: '1', page: '1' };
        persistInUrl();
    }
}

function handleSearchKeyup(event: KeyboardEvent) {
    window.clearTimeout(intentTimer);

    const query = searchTerm.value.trim();
    if (assistantSuggestion.value !== query) {
        assistantSuggestion.value = null;
    }

    if (!contextStore.context.value.conversationalSearchEnabled || !query || !query.includes(' ')) {
        intentAbortController.abort();
        typeAHeadSearch();
        return;
    }

    if (event.key === 'Enter') {
        void routeSearchIntent(query);
        return;
    }

    intentTimer = window.setTimeout(() => void routeSearchIntent(query), 250);
}

async function routeSearchIntent(query: string) {
    const revision = ++intentRevision;
    intentAbortController.abort();
    const controller = new AbortController();
    intentAbortController = controller;

    try {
        const route = await routeConversationalSearch(
            contextStore.context.value.datasetId,
            contextStore.context.value.apiKey,
            query,
            controller.signal,
        );
        if (revision !== intentRevision || query !== searchTerm.value.trim()) {
            return;
        }

        if (route.mode === 'conversation' && dismissedAssistantQuery.value !== query) {
            assistantSuggestion.value = query;
            typeAHeadSearch();
            return;
        }

        assistantSuggestion.value = null;
        typeAHeadSearch();
    }
    catch (exception) {
        if (controller.signal.aborted) {
            return;
        }

        typeAHeadSearch();
    }
}

function searchFor(term: string) {
    searchTerm.value = term;
    typeAHeadSearch();
}

async function persistInUrl() {
    const query = { ...filters.value };
    await router.push({ path: route.path, query: query, replace: true });
}

async function search() {
    abortController.abort();

    window.document.getElementById('search-result-overlay')?.scrollTo({ top: 0 });

    const show = searchTerm.value.length > 0 || Object.keys(filters.value).length > 0;

    if (!show) return; else showOrHide(show);

    filters.value.term = searchTerm.value;
    rightSide.value = null;
    noResultProductRecommendations.value = null;
    noResultProductRecommendationsTitle.value = 'Recommended for you';

    const variationName = breakpointService.active.value.toUpperCase();

    const selectedCategoryFilterIds = filters.value['category'];
    const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

    const brandIdRaw = route.query.brand;
    const brandNameRaw = route.query.brandName;
    const brandId = Array.isArray(brandIdRaw) ? brandIdRaw[0] : brandIdRaw;
    const brandName = Array.isArray(brandNameRaw) ? brandNameRaw[0] : brandNameRaw;

    const contentTerm = filters.value.term.length > 0
        ? filters.value.term
        : (typeof brandName === 'string' ? brandName : null);
    const productTerm = filters.value.term.length > 0 ? filters.value.term : null;
    const useVariantResolutionImages = !!productTerm && (contextStore.context.value.variantResolutionImages ?? false);

    const request = new SearchCollectionBuilder()
        .addRequest(applyVariantRequestSettings(new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(selectedProductPropertiesForTermSearch(contextStore.selectedProductProperties, useVariantResolutionImages))
            .setSelectedVariantProperties({
                displayName: true,
                pricing: true,
                allData: true,
            })
            .setTerm(productTerm)
            .filters(f => {
                if (Array.isArray(selectedCategoryFilterIds)) {
                    selectedCategoryFilterIds.slice(0, categoryFilterThreshold).forEach(id => {
                        f.addProductCategoryIdFilter('Ancestor', id);
                    });
                }

                if (brandId && typeof brandId === 'string') {
                    f.addBrandIdFilter(brandId);
                }

                contextStore.userClassificationBasedFilters(f);
            })
            .facets(f => getFacets(brandName ? 'Brand' : 'SearchOverlay', f, filters.value))
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
            .pagination(p => p.setPageSize(productPageSize).setPage(Number(filters.value.page)))
            .setRetailMedia(rm => rm
                .setLocation({
                    key: 'SEARCH_RESULTS_PAGE',
                    placements: [{ key: 'RIGHT' }, { key: 'TOP' }],
                    variation: { key: variationName },
                })
                .setSelectedDisplayAdProperties({
                    allData: true,
                }))
            .highlighting(h =>
                h.enabled(contextStore.context.value.searchHighlight ?? false)
                    .setHighlightable({
                        displayName: true,
                    })
                    .setShape({
                        snippets: {
                            include: false,
                            useEllipses: true,
                            includeMatchedWords: true,
                        },
                        offsets: {
                            include: true,
                        },
                    }),
            )
            , contextStore.context.value).build())
        .addRequest(new SearchTermPredictionBuilder(contextStore.defaultSettings)
            .addEntityType('Product', 'Content')
            .setTerm(searchTerm.value)
            .take(5)
            .filters(f => globalProductRecommendationFilters(f))
            .build())
        .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .setTerm(contentTerm)
            .pagination(p => p.setPageSize(contentPageSize).setPage(Number(filters.value.page)))
            .facets(f => {
                getFacets('ContentSearch', f, filters.value);
            })
            .highlighting(h =>
                h.enabled(contextStore.context.value.searchHighlight ?? false)
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
    const abortSignal = abortController.signal;
    const searcher = contextStore.getSearcher();
    const response = await searcher.batch(request, { abortSignal });
    contextStore.assertApiCall(response);

    if (response && response.responses) {
        trackBrandView(brandId, brandName);

        contentRecommendationResult.value = response.responses[2] as ContentSearchResponse;
        productSearchResult.value = response.responses[0] as ProductSearchResponse;
        products.value = productSearchResult.value.results?.map(x => ({ isPromotion: false, product: x })) ?? [];

        if (response.responses.length === 3) {
            contentSearchResult.value = response.responses[2] as ContentSearchResponse;
        }

        predictionsList.value = (response.responses[1] as SearchTermPredictionResponse)?.predictions ?? [];
        if (productSearchResult.value.hits === 0) {
            await recommendNoResultProducts(abortSignal).catch(error => {
                if (!abortSignal.aborted) {
                    throw error;
                }
            });
            return;
        }

        const placement = productSearchResult.value.retailMedia?.placements?.TOP;
        if (placement) {

            if (placement?.results) {
                products.value = placement.results
                    .map(x => ({
                        isPromotion: true,
                        product: x.promotedProduct?.result,
                        displayAd: x.promotedDisplayAd,
                    }) as ProductWithType)
                    .concat(products.value ?? []);
            }
        }

        const rightPlacement = productSearchResult.value.retailMedia?.placements?.RIGHT;
        if (rightPlacement) {

            if (rightPlacement?.results) {
                rightSide.value = rightPlacement.results;
            }
        }
    }
}

function hasRecommendations(response: ProductRecommendationResponse | undefined) {
    return (response?.recommendations?.length ?? 0) > 0;
}

async function recommendNoResultProducts(abortSignal: AbortSignal) {
    const term = Array.isArray(filters.value.term) ? filters.value.term.join(' ') : filters.value.term;

    if (term.trim().length > 0) {
        const searchTermBasedProductsResponse = await recommendNoResultSearchTermBasedProducts(term, abortSignal);

        if (abortSignal.aborted) {
            return;
        }

        contextStore.assertApiCall(searchTermBasedProductsResponse);

        if (hasRecommendations(searchTermBasedProductsResponse)) {
            noResultProductRecommendations.value = searchTermBasedProductsResponse ?? null;
            noResultProductRecommendationsTitle.value = `Recommended based on "${term}"`;
            return;
        }
    }

    const personalProductsResponse = await recommendNoResultPersonalProducts(abortSignal);

    if (abortSignal.aborted) {
        return;
    }

    contextStore.assertApiCall(personalProductsResponse);

    noResultProductRecommendations.value = personalProductsResponse ?? null;
    noResultProductRecommendationsTitle.value = 'Recommended for you';
}

async function recommendNoResultSearchTermBasedProducts(term: string, abortSignal: AbortSignal) {
    const recommender = contextStore.getRecommender();

    const searchTermBasedProductsRequest = new SearchTermBasedProductRecommendationBuilder(contextStore.defaultSettings)
        .setTerm(term)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .filters(builder => globalProductRecommendationFilters(builder))
        .build();

    return await recommender.recommendSearchTermBasedProducts(searchTermBasedProductsRequest, { abortSignal });
}

async function recommendNoResultPersonalProducts(abortSignal: AbortSignal) {
    const recommender = contextStore.getRecommender();

    const personalProductsRequest = new PersonalProductRecommendationBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .filters(builder => globalProductRecommendationFilters(builder))
        .build();

    return await recommender.recommendPersonalProducts(personalProductsRequest, { abortSignal });
}

watch(activeTab, () => {
    // reset page when switching tabs
    filters.value = { term: searchTerm.value, sort: '', open: '1', page: '1' };
});

function trackBrandView(
    brand: LocationQueryValue | LocationQueryValue[] | undefined,
    brandName: LocationQueryValue | LocationQueryValue[] | undefined,
) {
    if (!brandName || typeof brandName !== 'string') return;
    if (!brand || typeof brand !== 'string') return;
    if (trackedBrandId.value === brand) return;

    trackingService.trackBrandView(brand);
    trackedBrandId.value = brand;
}

onBeforeUnmount(() => {
    window.clearTimeout(intentTimer);
    intentAbortController.abort();
});

</script>

<template>
  <div class="inline-flex overflow-hidden rounded-full w-full xl:max-w-xl relative">
    <span class="flex items-center bg-slate-100 rounded-none px-3">
      <MagnifyingGlassIcon class="h-6 w-6 text-slate-600" />
    </span>
    <input
      v-model="searchTerm"
      type="text"
      placeholder="Search or describe what you need..."
      class="!rounded-r-full !shadow-none !pl-0 !bg-slate-100 !border-slate-100 focus:!border-slate-100 focus:!ring-0"
      @keyup="handleSearchKeyup"
    >
  </div>

  <Teleport to="#modal">
    <div
      v-if="open"
      id="search-result-overlay"
      class="modal"
    >
      <nav
        class="sticky top-0 z-10 border-b border-slate-200 bg-white px-2"
        aria-label="Discovery mode"
      >
        <div class="container mx-auto flex items-center gap-2 xl:px-0">
          <div
            class="flex min-w-0 flex-1"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected="true"
              class="flex-1 rounded-none border-b-2 border-brand-500 bg-transparent px-4 py-3 text-sm font-semibold text-brand-700 shadow-none"
            >
              Search
            </button>
            <button
              v-if="contextStore.context.value.conversationalSearchEnabled"
              type="button"
              role="tab"
              aria-selected="false"
              class="flex-1 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-semibold text-slate-600 shadow-none hover:border-slate-300 hover:text-slate-900"
              @click="switchToAssistant"
            >
              Shopping Assistant
            </button>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-full bg-transparent p-2 text-slate-500 shadow-none hover:bg-slate-100 hover:text-slate-800"
            title="Close"
            aria-label="Close search"
            @click="close"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
      </nav>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <section
          v-if="assistantSuggestion"
          class="fixed left-1/2 top-20 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-brand-100 bg-white p-4 shadow-xl"
          role="dialog"
          aria-label="Switch to Shopping Assistant"
        >
          <div class="flex items-start gap-3">
            <span class="rounded-full bg-brand-50 p-2 text-brand-600">
              <SparklesIcon class="h-5 w-5" />
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="text-base font-semibold text-slate-900">
                Want help from the Shopping Assistant?
              </h2>
              <p class="mt-1 text-sm leading-5 text-slate-600">
                This looks like a shopping request. The assistant can help narrow down the right products.
              </p>
              <div class="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  @click="keepSearching"
                >
                  Keep searching
                </button>
                <button
                  type="button"
                  class="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  @click="acceptAssistantSuggestion"
                >
                  Use Shopping Assistant
                </button>
              </div>
            </div>
          </div>
        </section>
      </Transition>
      <div
        v-if="productSearchResult || contentSearchResult"
        class="container mx-auto pb-10 px-2 xl:px-0"
      >
        <div
          v-if="contextStore.context.value.contentSearch && !route.query.brandName"
          class="mb-6 flex border-b border-slate-200"
        >
          <div
            :class="(activeTab == Tabs.Products ? 'border-b-2 border-solid border-brand-500' : '') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'"
            @click="() => activeTab = Tabs.Products"
          >
            Products ({{ productSearchResult?.hits }})
          </div>
          <div
            :class="(activeTab == Tabs.Content ? 'border-b-2 border-solid border-brand-500' : '') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'"
            @click="() => activeTab = Tabs.Content"
          >
            Content ({{ contentSearchResult?.hits }})
          </div>
        </div>

        <ProductSearchOverlayResult
          v-if="activeTab === Tabs.Products
            && productSearchResult"
          v-model:sort="filters.sort!"
          :page-size="productPageSize"
          :term="filters.term ?? ''"
          :product-search-result="productSearchResult"
          :content-recommendation-result="contentRecommendationResult"
          :no-result-product-recommendations="noResultProductRecommendations"
          :no-result-product-recommendations-title="noResultProductRecommendationsTitle"
          :products="products"
          :predictions-list="predictionsList"
          :filters="filters"
          :right-side="rightSide"
          @search-for="searchFor"
          @search="persistInUrl"
        />
        <ContentSearchOverlayResult
          v-else-if="activeTab === Tabs.Content
            && contextStore.context.value.contentSearch
            && contentSearchResult"
          v-model:sort="filters.sort!"
          :content-search-result="contentSearchResult"
          :page-size="contentPageSize"
          :term="filters.term ?? ''"
          :predictions-list="predictionsList"
          :filters="filters"
          @search-for="searchFor"
          @search="persistInUrl"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
    background-color: #fff;
    overflow-y: auto;
    position: fixed;
    z-index: 999;
    top: var(--header-height, 132px);
    left: 0;
    width: 100%;
    height: calc(100% - var(--header-height, 132px));
}
</style>
