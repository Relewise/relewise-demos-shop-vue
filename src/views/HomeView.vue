<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { PopularBrandsRecommendationBuilder, type BrandRecommendationResponse, type ProductRecommendationResponse } from '@relewise/client';
import { ref, type Ref } from 'vue';
import ProductTile from '../components/ProductTile.vue';
import { initializeRelewiseUI } from '@relewise/web-components';
import { WebComponentProductTemplate } from '@/components/WebComponentProductTemplate';

const result: Ref<ProductRecommendationResponse | undefined> = ref<ProductRecommendationResponse | undefined>({} as ProductRecommendationResponse);
const brands = ref<BrandRecommendationResponse | undefined | null>(null);
const recommender = contextStore.getRecommender();

recommend();

const context = contextStore.context;
initializeRelewiseUI(
    {
        contextSettings: {
            getUser: () => {
                return contextStore.getUser();
            },
            language: 'da-dk',
            currency: 'DKK',
        },
        datasetId: context.value.datasetId,
        apiKey: context.value.apiKey,
        clientOptions: {
            serverUrl: context.value.serverUrl,
        },
        selectedPropertiesSettings: {
            product:  {
                displayName: true,
                allData: true,
                brand: true,
                categoryPaths: true,
                pricing: true,
            },
        },
        templates: {
            product: (product, extentions) => {
                return WebComponentProductTemplate(product, extentions);
            },
        },
    });

async function recommend() {
    const popularBrandsRequest = new PopularBrandsRecommendationBuilder(contextStore.defaultSettings).setWeights({brandViews: 2, productPurchases: 4, productViews: 2}).setNumberOfRecommendations(20).build();
    const brandResponse = await recommender.recommendPopularBrands(popularBrandsRequest);
    brands.value = brandResponse;
}

</script>

<template>
    <main class="">
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

        <h2 class="text-3xl font-semibold mb-3">
            Popular products
        </h2>

        <relewise-popular-products displayedatlocation="Demo Store"/>
        <div class="grid gap-3 grid-cols-5 mt-3">
            <ProductTile v-for="(product, index) in result!.recommendations" :key="index" :product="product"/>
        </div>

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
