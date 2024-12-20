<template>
    <div class="container mx-auto pt-10 p-2 xl:p-0">
        <h2 class="text-3xl font-semibold mb-3 text-center">
            Popular Categories
        </h2>

        <div class="flex flex-row flex-wrap gap-8 justify-center">
            <RouterLink v-for="(category, index) in categories?.recommendations"
                        :key="category.categoryId ?? ''"
                        :to="`/category/${category.categoryId}`"
                        class="flex flex-col flex-wrap items-center text-stone-900 hover:text-brand-800">
                <div class="overflow-hidden rounded-full h-[150px] w-[150px]" :class="`brand${index+1}`">
                </div>
                <h4 class="font-bold mt-2">
                    {{ category.displayName }}
                </h4>
            </RouterLink>
        </div>
    </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { PopularProductCategoriesRecommendationBuilder, type ProductCategoryRecommendationResponse } from '@relewise/client';
import { ref, type Ref } from 'vue';

const categories: Ref<ProductCategoryRecommendationResponse | undefined> = ref<ProductCategoryRecommendationResponse | undefined>({});

async function setup() {
    categories.value = await contextStore.getRecommender().recommendPopularProductCategories(new PopularProductCategoriesRecommendationBuilder(contextStore.defaultSettings)
        .setProductCategoryProperties({ displayName: true })
        .setNumberOfRecommendations(6)
        .sinceMinutesAgo(contextStore.getRecommendationsSinceMinutesAgo())
        .build());

    contextStore.assertApiCall(categories.value);
}

setup();

</script>