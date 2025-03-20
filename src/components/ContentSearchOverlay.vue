<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { SearchCollectionBuilder, type ProductRecommendationResponse, type SearchTermPredictionResult, type PriceRangeFacetResult, type ProductCategoryResult, type CategoryHierarchyFacetResultCategoryNode, ContentSearchBuilder, type ContentSearchResponse } from '@relewise/client';
import { ref, watch } from 'vue';
import ContentResult from './ContentResult.vue';
import { useRoute } from 'vue-router';
import router from '@/router';
import Sorting from '../components/Sorting.vue';
import breakpointService from '@/services/breakpoint.service';
import Pagination from '../components/Pagination.vue';

const open = ref(false);
const searchTerm = ref<string>('');
const result = ref<ContentSearchResponse | null>(null);
const page = ref(1);
const predictionsList = ref<SearchTermPredictionResult[]>([]);
const filters = ref<Record<string, string | string[]>>({ price: [], term: '', sort: '' });
const route = useRoute();

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
        result.value = null;
        predictionsList.value = [];
        filters.value = { price: [], term: '', sort: '' };
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
    if (result.value?.facets?.items?.length === 3) {
        const salesPriceFacet = result.value?.facets.items[2] as PriceRangeFacetResult;

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
        .addRequest(new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .setTerm(filters.value.term.length > 0 ? filters.value.term : null)
            .pagination(p => p.setPageSize(10).setPage(1))
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
        result.value = response.responses[0] as ContentSearchResponse;
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
                    Showing content results for <span class="underline--yellow inline-block">{{ filters.term }}</span>
                </h2>
                <div class="flex gap-10">
                    <div class="w-full lg:w-4/5">
                        <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
                            <span v-if="result.hits > 0">Showing {{ page * (pageSize) - (pageSize - 1) }} - {{
                                result?.hits < pageSize ? result?.hits : page * pageSize }} of {{ result?.hits }}</span>
                                    <div class="hidden lg:block lg:flex-grow">
                                    </div>
                                    <Sorting v-model="filters.sort" @change="search" />
                        </div>
                        <div v-if="result.hits == 0" class="p-3 text-xl bg-white">
                            No products found
                        </div>
                        <div v-else>
                                <div class="flex flex-col divide-y divide-slate-200">
                                <ContentResult 
                                    v-for="(content, pIndex) in result?.results" 
                                    :key="content.contentId || pIndex"
                                    :content="content" />
                            </div>
                            <div class="py-3 flex justify-center">
                                <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="pageSize"
                                    @change="search" />
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