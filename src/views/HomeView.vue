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
    <main class="pt-0 flex flex-col gap-20">
        <div class="flex justify-center relative mx-auto h-[500px] container">
            <div class="sliding-logos-illustration  is-animated absolute top-[-50px] right-[0px] z-[-1]" style="transform: scale(1);">
                <svg width="664"
                     height="643"
                     viewBox="0 0 664 643"
                     fill="none"
                     xmlns="http://www.w3.org/2000/svg">
                    <path d="M418 626L397.5 564"
                          stroke="#53CF78"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="65.30122375488281"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M368.5 634L363.5 602.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="31.894357681274414"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M273 604.5L278.5 572"
                          stroke="#53CF78"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="32.962100982666016"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M219 625.5L233 582"
                          stroke="#FFC1D7"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="45.69737243652344"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M128.5 584L166.5 531.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="64.80933380126953"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M89 554.5L109.5 533"
                          stroke="#2152C1"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="29.70690155029297"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M53.5 481L112 449.5"
                          stroke="#53CF78"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="66.44170379638672"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M31 438.5L62 427"
                          stroke="#E0D5D5"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="33.0643310546875"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M42.5 344L77.5 342"
                          stroke="#2152C1"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="35.05709457397461"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M57.5 302.5L8.5 299"
                          stroke="#FFC1D7"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="49.124839782714844"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M95.5 230.5L31 206.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="68.82041931152344"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M82.5 179.5L53 164.5"
                          stroke="#2152C1"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="33.09456253051758"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M135.5 107L88.5 60"
                          stroke="#E0D5D5"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="66.4680404663086"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M146.5 86.5L127.5 60.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="32.202484130859375"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M238.5 80L228 50"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="31.7844295501709"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M275 54L267.5 9"
                          stroke="#FFC1D7"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="45.62071990966797"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M358.5 72.5L368.5 9"
                          stroke="#2152C1"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="64.28257751464844"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M408 49L417 19.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="30.84234046936035"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M470 113L488.5 87.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="31.50396728515625"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M515.5 123.5L547 90.5"
                          stroke="#FFC1D7"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="45.62071990966797"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M551.5 196L609.5 165.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="65.53052520751953"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M601.5 218.5L632.5 207"
                          stroke="#2152C1"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="33.0643310546875"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M621.5 301L586.5 303.5"
                          stroke="#53CF78"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="35.08917236328125"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M655.5 346.5L606 342.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="49.661354064941406"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M633 439L568 414.5"
                          stroke="#E0D5D5"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="69.46401977539062"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M611.5 481.5L582.5 465.5"
                          stroke="#FFD93B"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="33.12099075317383"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M524.5 532L501 508"
                          stroke="#2152C1"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="33.58943176269531"
                          style="stroke-dashoffset: 0px;"/>
                    <path d="M508 584.5L480.5 547"
                          stroke="#E0D5D5"
                          stroke-width="16"
                          stroke-linecap="round"
                          stroke-dasharray="46.502689361572266"
                          style="stroke-dashoffset: 0px;"/>
                </svg>
            </div>
            <div class="p-6 w-full flex flex-col items-start justify-center text-slate-800">
                <h1 class="intro__title text-5xl">
                    <span class="underline--yellow inline-block">Personalize</span><span class="text-brand1">.</span> Connect<span class="text-brand2">.</span> Relewise
                </h1>
                <h3 class="text-2xl text-center font-medium mt-4">
                    Welcome to our Demo Shop
                </h3>
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