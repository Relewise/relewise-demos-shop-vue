<template>
    <div class="container mx-auto">
        <h2 class="text-3xl font-semibold mb-3 text-center">
            Popular Categories
        </h2>

        <div class="flex flex-row gap-8 justify-center">
            <RouterLink
                v-for="category in categories?.recommendations" 
                :key="category.categoryId ?? ''" 
                :to="`/category/${category.categoryId}`" 
                class="flex flex-col flex-wrap items-center text-stone-900 hover:text-brand-800">
                <div class="overflow-hidden rounded-full h-[150px] w-[150px]"
                     :style="{'background-color': getColor()}">
                     <!-- <img 
                         :alt="category.displayName ?? category.categoryId ?? ''"
                         class="h-[150px] w-[150px]"> -->
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
        .setNumberOfRecommendations(8)
        .sinceMinutesAgo(contextStore.getRecommendationsSinceMinutesAgo())
        .build());

    contextStore.assertApiCall(categories.value);
}

setup();

function getColor() {
    return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

</script>