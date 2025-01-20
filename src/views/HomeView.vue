<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { PopularBrandsRecommendationBuilder, type BrandRecommendationResponse } from '@relewise/client';
import { ref } from 'vue';
import { ChevronRightIcon } from '@heroicons/vue/24/outline';
import OnSaleSlider from '@/components/OnSaleSlider.vue';
import HeroBanner from '@/components/HeroBanner.vue';
import PopularCategories from '@/components/PopularCategories.vue';

const brands = ref<BrandRecommendationResponse | undefined | null>(null);

const defaultSettings = ref(contextStore.defaultSettings);
const isConfigured = ref(contextStore.isConfigured);

recommend();

async function recommend() {
    if (!isConfigured.value) return;

    const recommender = contextStore.getRecommender();

    const popularBrandsRequest = new PopularBrandsRecommendationBuilder(contextStore.defaultSettings).setWeights({brandViews: 2, productPurchases: 4, productViews: 2}).setNumberOfRecommendations(4).sinceMinutesAgo(contextStore.getRecommendationsSinceMinutesAgo()).build();
    const brandResponse = await recommender.recommendPopularBrands(popularBrandsRequest);
    brands.value = brandResponse;
}
</script>
<template>
    <main class="pt-0 flex flex-col gap-20">
        <div class="flex flex-col">
            <HeroBanner/>
            <template v-if="isConfigured">
                <PopularCategories class="pl-20 xl:hidden"/>
            </template>
        </div>

        <div v-if="isConfigured" class="scrollbar" style="background-color: #e9effb;">
            <div class="waves"></div>
            <div class="container mx-auto py-10">
                <h2 class="text-3xl font-semibold mb-3 text-center">
                    Most popular products right now
                </h2>
                <div class="w-full overflow-x-scroll pb-2">
                    <relewise-popular-products class="flex flex-row gap-3" :displayed-at-location="defaultSettings.displayedAtLocation" number-of-recommendations="12" :since-minutes-ago="contextStore.getRecommendationsSinceMinutesAgo()"/>
                </div>
            </div>
            <div class="reverse-waves"></div>
        </div>

        <div v-if="brands?.recommendations" class="container mx-auto p-2 xl:p-0">
            <h2 class="text-3xl font-semibold mb-3 text-center">
                Shop our popular brands
            </h2>

            <div v-if="isConfigured" class="grid gap-3 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 mt-3">
                <RouterLink 
                    v-for="(brand, index) in brands.recommendations" 
                    :key="index" 
                    :to="{ query: { brand: brand.id, open: '1', brandName: brand.displayName } }" 
                    class="rounded text-slate-800 p-6"
                    :class="`brand${6-index}`">
                    <h3 class="text-3xl break-all">
                        {{ brand.displayName ?? brand.id }}
                    </h3>

                    <button class="mt-4 bg-transparent border border-solid border-gray-800 rounded-lg text-gray-800 flex items-center gap-2">
                        Shop now <ChevronRightIcon class="h-4"/>
                    </button>
                </RouterLink>
            </div>
        </div>

        <template v-if="isConfigured">
            <OnSaleSlider/>
        </template>
    </main>
</template>

<style lang="scss">
.cover {
    background-image: url('/17580.jpg');
    height: 500px;
}

.bg-gradient {
    background: rgb(55, 100, 228);
    background: radial-gradient(circle, rgb(55, 100, 228) 0%, rgb(15, 41, 115) 81%);
}

.is-animated {
    animation: rotate 200s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>