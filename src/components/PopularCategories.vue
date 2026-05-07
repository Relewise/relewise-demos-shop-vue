<template>
  <div :class="useContainer ? 'flex mx-auto container' : ''">
    <div class="w-full">
      <h1 :class="titleClass">
        {{ title }}
      </h1>
      <div class="flex flex-row flex-wrap gap-4 md:gap-8">
        <RouterLink
          v-for="(category, index) in categories?.recommendations"
          :key="category.categoryId ?? ''"
          :to="`/category/${category.categoryId}`"
          class="popular-category-tile flex w-32 md:w-36 shrink-0 flex-col items-center text-center text-stone-900 hover:text-brand-800"
        >
          <div
            class="overflow-hidden rounded-full h-[88px] w-[88px] md:h-[100px] md:w-[100px]"
            :class="`brand${(index % 6) + 1}`"
          >
            <Image :entity="category" />
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

const categories: Ref<ProductCategoryRecommendationResponse | undefined> = ref<ProductCategoryRecommendationResponse | undefined>({});

const props = withDefaults(defineProps<{
    numberOfRecommendations?: number,
    title?: string,
    titleClass?: string,
    useContainer?: boolean,
}>(), {
    numberOfRecommendations: 4,
    title: 'Popular Categories',
    titleClass: 'text-3xl font-semibold mb-3',
    useContainer: true,
});

async function setup() {
    categories.value = await contextStore.getRecommender().recommendPopularProductCategories(new PopularProductCategoriesRecommendationBuilder(contextStore.defaultSettings)
        .setProductCategoryProperties(contextStore.selectedCategoryProperties)
        .setNumberOfRecommendations(props.numberOfRecommendations)
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
