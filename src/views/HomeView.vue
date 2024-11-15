<script setup lang="ts">
import contextStore from '@/stores/context.store';
import PopularCategories from '@/components/PopularCategories.vue';
import { PopularBrandsRecommendationBuilder, type BrandRecommendationResponse } from '@relewise/client';
import { ref } from 'vue';
import { ChevronRightIcon } from '@heroicons/vue/24/outline';

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
    <main class="pt-0 flex flex-col gap-16">
        <div class="flex justify-center">
            <div class="bg-white p-6 w-full bg-gradient h-[500px] flex flex-col items-center justify-center">
                <h1 class="text-6xl text-gray-100 text-center font-bold mb-5 drop-shadow-lg">
                    Relewise Demo Shop
                </h1>
                <p class="text-gray-100  drop-shadow-lg">
                    Explore our offerings.
                </p>
            </div>
        </div>

        <template v-if="isConfigured">
            <PopularCategories/>
        </template>

        <div v-if="isConfigured" class="scrollbar" style="background-color: #e0d5d5;">
            <div class="waves"></div>
            <div class="container mx-auto py-10">
                <h2 class="text-3xl font-semibold mb-3 text-center">
                    Most popular products right now
                </h2>
                <div class="w-full overflow-x-scroll pb-2">
                    <relewise-popular-products class=" flex flex-row gap-3" :displayed-at-location="defaultSettings.displayedAtLocation" number-of-recommendations="12" :since-minutes-ago="contextStore.getRecommendationsSinceMinutesAgo()"/>
                </div>
            </div>
            <div class="reverse-waves"></div>
        </div>

        <div v-if="brands?.recommendations" class="container mx-auto">
            <h2 class="text-3xl font-semibold mb-3 text-center">
                Shop our popular brands
            </h2>

            <div v-if="isConfigured" class="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-3">
                <RouterLink 
                    v-for="(brand, index) in brands.recommendations" 
                    :key="index" 
                    :to="{ query: { brand: brand.id, open: '1' } }" 
                    class="rounded text-slate-800 p-6"
                    :class="`brand${6-index}`">
                    <h3 class="text-3xl">
                        {{ brand.displayName ?? brand.id }}
                    </h3>

                    <button class="mt-4 bg-transparent border border-solid border-gray-800 rounded-lg text-gray-800 flex items-center gap-2">
                        Shop now <ChevronRightIcon class="h-4"/>
                    </button>
                </RouterLink>
            </div>
        </div>

        <div v-if="isConfigured" class="scrollbar container mx-auto">
            <h2 class="text-3xl font-semibold mb-3 text-center">
                New products
            </h2>
            <div class="w-full overflow-x-scroll">
                <relewise-popular-products class="flex flex-row gap-3" :displayed-at-location="defaultSettings.displayedAtLocation" number-of-recommendations="12" :since-minutes-ago="contextStore.getRecommendationsSinceMinutesAgo()"/>
            </div>
        </div>
    </main>
</template>

<style lang="scss">
.cover {
    background-image: url('/17580.jpg');
    height: 500px;
}

.scrollbar {
    scrollbar-width: thin !important;
    *::-webkit-scrollbar {
    width: 5px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: #000000 !important;
  }
  *::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px transparent;
    background-color: transparent;
  }
  *::-webkit-scrollbar {
    scrollbar-width: thin;
    width: 5px;
    //background-color: #222222;
    border-radius: 8px;
  }
  *::-webkit-scrollbar-thumb {
    background-color: #222222;
    border-radius: 8px;
    height: 5px;
    width: 5px;
  }
}

.bg-gradient {
    background: rgb(55, 100, 228);
    background: radial-gradient(circle, rgb(55, 100, 228) 0%, rgb(15, 41, 115) 81%);
}
</style>