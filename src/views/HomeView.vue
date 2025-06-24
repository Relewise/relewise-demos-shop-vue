<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { PopularBrandsRecommendationBuilder, PopularProductsBuilder, type BrandRecommendationResponse, type ProductRecommendationResponse } from '@relewise/client';
import { ref } from 'vue';
import { ChevronRightIcon } from '@heroicons/vue/24/outline';
import OnSaleSlider from '@/components/OnSaleSlider.vue';
import HeroBanner from '@/components/HeroBanner.vue';
import PopularCategories from '@/components/PopularCategories.vue';
import ProductTile from '../components/ProductTile.vue';
import { addAssortmentFilters } from '@/stores/customFilters';
// import { addAssortmentFilters } from '@/stores/customFilters';
// import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';

const brands = ref<BrandRecommendationResponse | undefined | null>(null);

const defaultSettings = ref(contextStore.defaultSettings);
const isConfigured = ref(contextStore.isConfigured);
const recommender = contextStore.getRecommender();
const result = ref<ProductRecommendationResponse | undefined>(undefined);

recommendB2B();
recommend();

async function recommendB2B() {
    const take = 8;
    const request = new PopularProductsBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(take)
        .relevanceModifiers(modifier => {
            modifier.addProductRecentlyPurchasedByCompanyRelevanceModifier(86400, [contextStore.user.value.company?.id as string], 1, 5)
        })
        .filters(f => {
            addAssortmentFilters(f);
        })
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPopularProducts(request);
    contextStore.assertApiCall(response);

    result.value = response;
}

async function recommend() {
    if (!isConfigured.value) return;

    const popularBrandsRequest = new PopularBrandsRecommendationBuilder(contextStore.defaultSettings).setWeights({ brandViews: 2, productPurchases: 4, productViews: 2 }).setNumberOfRecommendations(4).sinceMinutesAgo(contextStore.getRecommendationsSinceMinutesAgo()).build();
    const brandResponse = await recommender.recommendPopularBrands(popularBrandsRequest);
    brands.value = brandResponse;
}
</script>
<template>
    <main class="pt-0 flex flex-col gap-20">
        <div class="flex flex-col">
            <HeroBanner />
            <template v-if="isConfigured">
                <PopularCategories class="pl-20 xl:hidden" />
            </template>
        </div>

        <div v-if="isConfigured" class="scrollbar" style="background-color: #e9effb;">
            <div class="waves"></div>
            <div class="container mx-auto py-10">
                <div v-if="result" class="scrollbar mt-8">
                    <h2 class="text-3xl font-semibold mb-3 text-center">
                        Popular products
                    </h2>
                    <div class="w-full overflow-x-scroll">
                        <div class="flex flex-row gap-6">
                            <div v-for="(product, pIndex) in result?.recommendations ?? []" :key="pIndex"
                                class="min-w-[250px] pb-3">
                                <ProductTile :product="product" />
                            </div>
                        </div>
                    </div>
                </div>
                <!-- <div class="w-full overflow-x-scroll pb-2">
                    <relewise-popular-products class="flex flex-row gap-3" :displayed-at-location="defaultSettings.displayedAtLocation" number-of-recommendations="8" :since-minutes-ago="contextStore.getRecommendationsSinceMinutesAgo()"/>
                </div> -->
            </div>
            <div class="reverse-waves"></div>
        </div>

        <div v-if="brands?.recommendations" class="container mx-auto p-2 xl:p-0">
            <h2 class="text-3xl font-semibold mb-3 text-center">
                Shop our popular brands
            </h2>

            <div v-if="isConfigured" class="grid gap-3 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 mt-3">
                <RouterLink v-for="(brand, index) in brands.recommendations" :key="index"
                    :to="{ query: { Brand: brand.id, open: '1' } }" class="rounded text-slate-800 p-6"
                    :class="`brand${6 - index}`">
                    <h3 class="text-3xl break-all">
                        {{ brand.displayName ?? brand.id }}
                    </h3>

                    <button
                        class="mt-4 bg-transparent border border-solid border-gray-800 rounded-lg text-gray-800 flex items-center gap-2">
                        Shop now
                        <ChevronRightIcon class="h-4" />
                    </button>
                </RouterLink>
            </div>
        </div>

        <template v-if="isConfigured">
            <OnSaleSlider />
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