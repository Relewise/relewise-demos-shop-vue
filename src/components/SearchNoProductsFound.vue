<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ProductCategoryRecommendationResponse, ProductRecommendationResponse } from '@relewise/client';
import ProductCategoryRecommendationTiles from '@/components/ProductCategoryRecommendationTiles.vue';
import ProductTile from '@/components/ProductTile.vue';

const props = defineProps({
    term: { type: [String, Array] as PropType<string | string[]>, required: true },
    popularCategoryRecommendations: { type: Object as PropType<ProductCategoryRecommendationResponse | null>, required: false, default: null },
    productRecommendations: { type: Object as PropType<ProductRecommendationResponse | null>, required: false, default: null },
});

const termLabel = computed(() => Array.isArray(props.term) ? props.term.join(' ') : props.term);
const categories = computed(() => props.popularCategoryRecommendations?.recommendations ?? []);
const products = computed(() => props.productRecommendations?.recommendations ?? []);
</script>

<template>
  <div class="bg-white rounded p-4 md:p-6">
    <div class="mb-6">
      <h3 class="text-xl font-semibold">
        No products found
      </h3>
      <p
        v-if="termLabel"
        class="mt-1 text-slate-600"
      >
        We could not find any products matching
        <span class="font-medium text-slate-900">{{ termLabel }}</span>.
      </p>
    </div>

    <section
      v-if="categories.length > 0"
      class="mb-8"
    >
      <h4 class="text-xl font-semibold mb-3">
        Popular Categories
      </h4>
      <ProductCategoryRecommendationTiles :categories="categories" />
    </section>

    <section v-if="products.length > 0">
      <h4 class="text-xl font-semibold mb-3">
        Recommended for you
      </h4>
      <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <ProductTile
          v-for="(product, index) in products"
          :key="product.productId ?? index"
          :product="product"
        />
      </div>
    </section>
  </div>
</template>
