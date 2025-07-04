<template>
    <div class="my-3">
        <div class="text-2xl font-semibold">
            Consider an alternative
        </div>
        <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProductTile v-for="(prod, index) in productRecommendation?.recommendations" :key="index" :product="prod"/>
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

function init()
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
        .build();

    similarproductsRequest.settings.numberOfRecommendations = 4;

    const recommender = contextStore.getRecommender();
    recommender.recommendSimilarProducts(similarproductsRequest)
        .then(result =>{
            productRecommendation.value = result;
        })
        .catch (err => {
            console.error('Error fetching recommendations:', err);
        });
}
init();
</script>