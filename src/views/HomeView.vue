<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { PopularBrandsRecommendationBuilder, type BrandRecommendationResponse } from '@relewise/client';
import { ref } from 'vue';

const brands = ref<BrandRecommendationResponse | undefined | null>(null);

const defaultSettings = ref(contextStore.defaultSettings);
const isConfigured = ref(contextStore.isConfigured);

recommend();

async function recommend() {
    if (!isConfigured.value) return;

    const recommender = contextStore.getRecommender();

    const popularBrandsRequest = new PopularBrandsRecommendationBuilder(contextStore.defaultSettings).setWeights({brandViews: 2, productPurchases: 4, productViews: 2}).setNumberOfRecommendations(20).build();
    const brandResponse = await recommender.recommendPopularBrands(popularBrandsRequest);
    brands.value = brandResponse;
}

</script>
<template>
    <main class="pt-3">
        <div class="flex justify-center">
            <div class="mb-10 bg-white p-6 rounded">
                <h1 class="text-3xl font-semibold mb-5">
                    Welcome to the Relewise Demo Shop
                </h1>

                <p class="pb-2">
                    Discover a wide range of offerings with our search and discovery tools, and take advantage of personalized product recommendations. Our platform provides a powerful search experience and intelligent recommendations to help you find exactly what you're looking for. With our advanced technology, exploring and discovering new products has never been easier.
                </p>

                <p>
                    Relewise is an intelligent personalization platform that provides customized and relevant online experiences, designed to empower both developers and marketers. Our advanced search and recommendation algorithms ensure that you always find what you're looking for, and discover products you'll love.
                </p>
            </div>
        </div>

        <template v-if="isConfigured">
            <h2 class="text-3xl font-semibold mb-3">
                Popular products
            </h2>
            <relewise-popular-products class="grid grid-cols-2 lg:grid-cols-5" :displayed-at-location="defaultSettings.displayedAtLocation" number-of-recommendations="30" since-minutes-ago="100000"/>
        </template>

        <template v-if="brands?.recommendations">
            <h2 class="text-3xl font-semibold mb-3 mt-10">
                Popular brands
            </h2>

            <div class="grid gap-3 grid-cols-2 lg:grid-cols-5 mt-3">
                <RouterLink v-for="(brand, index) in brands.recommendations" :key="index" :to="{ query: { brand: brand.id, open: '1' } }" class="rounded bg-white hover:bg-zinc-200 px-3 py-3">
                    {{ brand.displayName ?? brand.id }}
                </RouterLink>
            </div>
        </template>
    </main>
</template>
