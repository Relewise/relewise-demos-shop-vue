<script setup lang="ts">
import { type ContentSearchResponse, type ProductRecommendationResponse, type ProductSearchResponse, type SearchTermPredictionResult } from '@relewise/client';
import { ref, watch, type PropType } from 'vue';
import Sorting from '../components/Sorting.vue';
import Pagination from '../components/Pagination.vue';
import { useRoute } from 'vue-router';
import contextStore from '@/stores/context.store';
import type { ProductWithType } from '@/types';
import ProductTile from './ProductTile.vue';
import Facets from './Facets.vue';

const props = defineProps({
    productSearchResult: { type: Object as PropType<ProductSearchResponse>, required: true },
    fallbackRecommendations: { type: Object as PropType<ProductRecommendationResponse | null>, required: true },
    products: { type: Array as PropType<ProductWithType[] | null>, required: true },
    contentRecommendationResult: { type: Object as PropType<ContentSearchResponse | null>, required: true },
    pageSize: { type: Number, required: true },
    page: { type: Number, required: true },
    term: { type: [String, Array] as PropType<string | string[]>, required: true },
    sort: { type: [String, Array] as PropType<string | string[]>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    predictionsList: { type: Array as PropType<SearchTermPredictionResult[]>, required: true },
});

const route = useRoute();

const emit = defineEmits(['search', 'update:sort', 'update:page', 'search-for']);

const sortValue = ref(props.sort);
const pageValue = ref(props.page);

watch(sortValue, (newVal) => {
    emit('update:sort', newVal);
    emit('search');
});

watch(pageValue, (newVal) => {
    emit('update:page', newVal);
    emit('search');
});

function search() {
    emit('search');
}

function searchFor(term: string) {
    emit('search-for', term);
}

</script>

<template>
    <div v-if="productSearchResult" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
        <h2 v-if="term" class="text-xl lg:text-3xl mb-6">
            Showing results for <span class="underline--yellow inline-block">{{ term }}</span>
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
                        @search="search"/>
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
                    <span v-if="productSearchResult.hits > 0">Showing {{ page * (pageSize) - (pageSize - 1) }} - {{
                        productSearchResult?.hits < pageSize ? productSearchResult?.hits : page * pageSize }} of {{
                        productSearchResult?.hits }}</span>
                    <div class="hidden lg:block lg:flex-grow">
                    </div>
                    <Sorting v-model="sortValue" type="Product"/>
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
                    <Pagination 
                        v-model.sync="pageValue"
                        :total="productSearchResult.hits"
                        :page-size="pageSize"/>
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
</template>
