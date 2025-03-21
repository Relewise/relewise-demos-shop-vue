<template>
    <div v-if="result && result.recommendations && result.recommendations.length > 0" class="container mx-auto scrollbar mt-8">
        <h2 class="text-3xl font-semibold mb-3 text-center">
            On sale right now
        </h2>
        <div class="w-full overflow-x-scroll">
            <div class="flex flex-row gap-6">
                <div v-for="(product, pIndex) in result?.recommendations ?? []" :key="pIndex" class="min-w-[250px] pb-3">
                    <ProductTile :product="product"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import ProductTile from '../components/ProductTile.vue';
import { ref } from 'vue';
import { DataValueFactory, PopularProductsBuilder, type ProductRecommendationResponse } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';

const result = ref<ProductRecommendationResponse | undefined>(undefined);
const recommender = contextStore.getRecommender();

recommend();

async function recommend() {
    const take = 8;
    const request = new PopularProductsBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({allData: true})
        .setNumberOfRecommendations(take)
       
        .filters(builder => {
            builder.addProductDataFilter('OnSale', c => c.addEqualsCondition(DataValueFactory.string('true')));
            globalProductRecommendationFilters(builder); 
        })
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPopularProducts(request);
    contextStore.assertApiCall(response);

    result.value = response;
}
</script>