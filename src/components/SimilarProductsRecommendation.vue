<template>
    <div v-if="productRecommendation" class="scrollbar mt-8">
        <h2 class="text-2xl font-semibold mb-3">
            Consider an alternative
        </h2>
        <div class="w-full">
            <div class="flex flex-row gap-6">
                <div v-for="(p, index) in productRecommendation?.recommendations ?? []"
                     :key="index"
                     class="min-w-[250px] pb-3">
                    <ProductTile :product="p"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import contextStore from '@/stores/context.store';
import { SimilarProductsProductBuilder, type ProductRecommendationResponse, type ProductResult } from '@relewise/client';
import {globalProductRecommendationFilters} from '../stores/globalProductFilters';
import ProductTile from './ProductTile.vue';
import basketService from '@/services/basket.service';

const productRecommendation = ref<ProductRecommendationResponse | null | undefined>(null);

const props = defineProps<{
    product: ProductResult
}>();

async function init()
{
    if (!props.product.productId) return;

    const similarproductsRequest = new SimilarProductsProductBuilder(contextStore.defaultSettings)
        .product({ productId: props.product.productId })
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .filters(f => {
            globalProductRecommendationFilters(f);

            const productIds =  basketService.model.value.lineItems
                .filter(item => item.product.productId)
                .map(item => item.product.productId as string);
            
            if (productIds.length > 0) {
                f.addProductIdFilter(productIds, true);
            }

            const categoryId = props.product.categoryPaths?.[0]?.pathFromRoot?.[1]?.id;
            if (categoryId) {
                f.addProductCategoryIdFilter('ImmediateParentOrItsParent', categoryId);
            }
        })
        .setNumberOfRecommendations(10)
        .build();

    const recommender = contextStore.getRecommender();
    const response = await recommender.recommendSimilarProducts(similarproductsRequest);
    
    contextStore.assertApiCall(response);

    productRecommendation.value = response;
}
init();
</script>