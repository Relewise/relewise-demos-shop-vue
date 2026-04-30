<template>
  <div class="flex mx-auto container">
    <div class="w-full">
      <h1 class="text-3xl font-semibold mb-3">
        Popular Categories
      </h1>
      <ProductCategoryRecommendationTiles
        v-if="categories?.recommendations"
        :categories="categories.recommendations"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { PopularProductCategoriesRecommendationBuilder, type ProductCategoryRecommendationResponse } from '@relewise/client';
import { ref, type Ref } from 'vue';
import ProductCategoryRecommendationTiles from '@/components/ProductCategoryRecommendationTiles.vue';

const categories: Ref<ProductCategoryRecommendationResponse | undefined> = ref<ProductCategoryRecommendationResponse | undefined>({});

async function setup() {
    categories.value = await contextStore.getRecommender().recommendPopularProductCategories(new PopularProductCategoriesRecommendationBuilder(contextStore.defaultSettings)
        .setProductCategoryProperties(contextStore.selectedCategoryProperties)
        .setNumberOfRecommendations(4)
        .sinceMinutesAgo(contextStore.getRecommendationsSinceMinutesAgo())
        .build());

    contextStore.assertApiCall(categories.value);
}

setup();

</script>
