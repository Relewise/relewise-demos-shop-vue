<script setup lang="ts">
import { type ContentSearchResponse, type ProductRecommendationResponse, type ProductSearchResponse, type RetailMediaResultPlacementResultEntity, type SearchTermPredictionResult } from '@relewise/client';
import { computed, ref, watch, type PropType } from 'vue';
import Sorting from '../components/Sorting.vue';
import Pagination from '../components/Pagination.vue';
import { useRoute } from 'vue-router';
import contextStore from '@/stores/context.store';
import type { ProductWithType } from '@/types';
import ProductTile from './ProductTile.vue';
import ContentTile from './ContentTile.vue';
import Facets from './Facets.vue';
import VariantBasedProductList from './VariantBasedProductList.vue';
import DisplayAdTile from './DisplayAds/DisplayAd-Tile.vue';
import SearchNoProductsFound from '@/components/SearchNoProductsFound.vue';

const props = defineProps({
    productSearchResult: { type: Object as PropType<ProductSearchResponse>, required: true },
    noResultProductRecommendations: { type: Object as PropType<ProductRecommendationResponse | null>, required: false },
    noResultProductRecommendationsTitle: { type: String, required: true },
    products: { type: Array as PropType<ProductWithType[] | null>, required: true },
    rightSide: { type: [Array, null] as PropType<RetailMediaResultPlacementResultEntity[] | null>, required: true },
    contentRecommendationResult: { type: Object as PropType<ContentSearchResponse | null>, required: true },
    pageSize: { type: Number, required: true },
    term: { type: [String, Array] as PropType<string | string[]>, required: true },
    sort: { type: [String, Array] as PropType<string | string[]>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    predictionsList: { type: Array as PropType<SearchTermPredictionResult[]>, required: true },
});

const route = useRoute();

const emit = defineEmits(['search', 'update:sort', 'search-for']);

const sortValue = ref(props.sort);
const pageValue = computed(() => Number(props.filters.page ?? 1));

const hasProductResults = computed(() => props.productSearchResult.hits > 0);
const contentResults = computed(() => props.contentRecommendationResult?.results?.slice(0, 10));

watch(sortValue, (newVal) => {
    emit('update:sort', newVal);
    emit('search');
});

function searchFor(term: string) {
    emit('search-for', term);
}

</script>

<template>
  <div
    v-if="productSearchResult"
    class="relative container mx-auto pt-6 pb-10 px-2 xl:px-0"
  >
    <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-6">
      <h2
        v-if="term"
        class="text-xl lg:text-3xl"
      >
        Showing results for <span class="underline--yellow inline-block">{{ term }}</span>
      </h2>
      <h2
        v-if="route.query.brandName"
        class="text-xl lg:text-3xl"
      >
        <span class="underline--yellow inline-block">{{ Array.isArray(route.query.brandName) ?
          route.query.brandName.join('') : route.query.brandName }}</span>
      </h2>

      <span v-if="hasProductResults">
        Showing {{ pageValue * (pageSize) - (pageSize - 1) }} - {{
          productSearchResult?.hits < pageSize ? productSearchResult?.hits : pageValue * pageSize }} of {{
          productSearchResult?.hits }} </span>
      <div class="hidden lg:block lg:flex-grow" />
      <Sorting
        v-if="hasProductResults"
        v-model="sortValue"
        type="Product"
      />
    </div>
    <div :class="hasProductResults ? 'lg:flex lg:gap-10' : ''">
      <div :class="{ 'lg:w-1/5': hasProductResults }">
        <div
          v-if="hasProductResults && predictionsList.length > 0 && filters.term && filters.term.length > 0"
          class="hidden pb-6 bg-white mb-6 border-b border-solid border-slate-300 lg:flex flex-col gap-1"
        >
          <h3 class="font-semibold text-lg">
            Suggestions
          </h3>
          <a
            v-for="(prediction) in predictionsList"
            :key="prediction.term ?? ''"
            class="block cursor-pointer text-slate-900 hover:!text-brand-500"
            @click.prevent="searchFor(prediction.term ?? '')"
          >
            {{ prediction.term }}
          </a>
        </div>
        <Facets
          :filters="filters"
          :facets="hasProductResults ? productSearchResult.facets : null"
          :context="route.query.brandName ? 'Brand' : 'SearchOverlay'"
          @search="emit('search', 1)"
          @reset="emit('search', 1)"
        />
        <div
          v-if="hasProductResults && contentResults?.length"
          class="hidden lg:block"
        >
          <h4 class="font-semibold text-lg mb-1">
            Content
          </h4>
          <div class="flex flex-col gap-1">
            <template
              v-for="content in contentResults"
              :key="content.contentId ?? ''"
            >
              <ContentTile :content="content" />
            </template>
          </div>
        </div>
      </div>
      <div :class="hasProductResults ? 'w-full lg:w-4/5' : 'w-full'">
        <div
          v-if="productSearchResult && productSearchResult?.redirects && productSearchResult.redirects.length > 0"
          class="mb-3 p-3 bg-white"
        >
          <h2 class="text-xl font-semibold mb-2">
            Redirect(s)
          </h2>

          <div
            v-for="redirect in productSearchResult.redirects"
            :key="redirect.id"
            class="mb-1 pb-1 flex border-b border-solid border-gray-300"
          >
            {{ redirect.destination }}
          </div>
        </div>
        <div
          v-if="!hasProductResults"
        >
          <SearchNoProductsFound
            :term="term"
            :product-recommendations="noResultProductRecommendations ?? null"
            :product-recommendations-title="noResultProductRecommendationsTitle"
          />
        </div>
        <VariantBasedProductList
          v-else-if="contextStore.context.value.variantBasedSearchOverlay"
          :product-result="productSearchResult"
        />
        <div v-else>
          <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <template
              v-for="(product, pIndex) in products"
              :key="pIndex"
            >
              <ProductTile
                v-if="product.product"
                :product="product.product"
                :is-promotion="product.isPromotion"
              />
              <DisplayAdTile
                v-else-if="product.displayAd"
                :key="'ad' + pIndex"
                :display-ad="product.displayAd"
              />
            </template>
          </div>
        </div>
        <div
          v-if="hasProductResults"
          class="py-3 flex justify-center"
        >
          <Pagination
            :model-value="pageValue"
            :total="productSearchResult.hits"
            :page-size="pageSize"
            @update:model-value="emit('search', $event)"
          />
        </div>
      </div>
    </div>
    <div
      v-if="rightSide"
      class="absolute h-[95%] top-[85px] -right-56 flex flex-col gap-2"
    >
      <template v-for="(item, pIndex) in rightSide">
        <ProductTile
          v-if="item.promotedProduct?.result"
          :key="pIndex"
          :product="item.promotedProduct?.result"
          :is-promotion="true"
          class="w-[200px] shadow-sm ad"
        />
        <DisplayAdTile
          v-else-if="item.promotedDisplayAd?.result"
          :key="'ad' + pIndex"
          :display-ad="item.promotedDisplayAd"
          class="w-[200px]"
        />
      </template>
    </div>
  </div>
</template>
