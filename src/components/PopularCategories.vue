<template>
  <div class="flex mx-auto container">
    <div class="w-full">
      <h1 class="text-3xl font-semibold mb-3">
        Popular Categories
      </h1>
      <div class="flex flex-row flex-wrap gap-8">
        <RouterLink
          v-for="(category, index) in categories?.recommendations"
          :key="category.categoryId ?? ''"
          :to="`/category/${category.categoryId}`"
          class="popular-category-tile flex w-36 shrink-0 flex-col items-center text-center text-stone-900 hover:text-brand-800"
        >
          <div
            class="overflow-hidden rounded-full h-[100px] w-[100px]"
            :class="`brand${index+1}`"
          >
            <Image
              v-if="findImage(category)"
              :entity="category"
            />
          </div>
          <h4 class="popular-category-title mt-2 font-bold">
            {{ category.displayName }}
          </h4>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { PopularProductCategoriesRecommendationBuilder, type ProductCategoryRecommendationResponse } from '@relewise/client';
import { ref, type Ref } from 'vue';
import Image from '@/components/Image.vue';
import { findImage } from '@/helpers/imageHelper';

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

<style scoped>
.popular-category-title {
    min-height: 2.75rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.375rem;
}
</style>
