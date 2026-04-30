<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ProductRecommendationResponse } from '@relewise/client';
import PopularCategories from '@/components/PopularCategories.vue';
import ProductTile from '@/components/ProductTile.vue';

const props = defineProps({
    term: { type: [String, Array] as PropType<string | string[]>, required: true },
    productRecommendations: { type: Object as PropType<ProductRecommendationResponse | null>, required: false, default: null },
});

const termLabel = computed(() => Array.isArray(props.term) ? props.term.join(' ') : props.term);
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

    <PopularCategories
      class="mb-8"
      :number-of-recommendations="8"
      :use-container="false"
      title-class="text-xl font-semibold mb-3"
    />

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
