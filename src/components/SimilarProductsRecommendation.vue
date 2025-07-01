<template>
    <div class="my-3">
        <div class="text-2xl font-semibold">
            Sold out....consider an alternative
        </div>
        <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProductTile v-for="(prod, index) in similarProds?.recommendations" :key="index" :product="prod"/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import contextStore from '@/stores/context.store';
import { SimilarProductsProductBuilder, type ProductRecommendationResponse, type ProductResult } from '@relewise/client';
import { addBasketLineitemFilter } from '../stores/applicationFilters';
import {globalProductRecommendationFilters} from '../stores/globalProductFilters';
import ProductTile from './ProductTile.vue';

const prodId = ref<string>('');
const productResult = ref<ProductResult | null | undefined>(null);
const similarProds = ref<ProductRecommendationResponse | null | undefined>(null);

const props = defineProps<{
    productId: string,
    product: ProductResult
}>();

function init()
{
    prodId.value = props.productId;
    productResult.value = props.product;

    if (!prodId.value || !productResult.value) return;

    const similarproductsRequest = new SimilarProductsProductBuilder(contextStore.defaultSettings)
        .product({ productId: prodId.value })
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .filters(f => {
            globalProductRecommendationFilters(f);
            addBasketLineitemFilter(f);

            const categoryId = productResult.value?.categoryPaths?.[0]?.pathFromRoot?.[1]?.id;
            if (!categoryId || typeof categoryId !== 'string') {
                console.warn('Category ID missing');
                return;
            }

            f.addProductCategoryIdFilter('ImmediateParentOrItsParent', categoryId);
        })
        .build();

    similarproductsRequest.settings.numberOfRecommendations = 4;

    const recommender = contextStore.getRecommender();
    recommender.recommendSimilarProducts(similarproductsRequest)
        .then(result =>{
            similarProds.value = result;
        })
        .catch (err => {
            console.error('Error fetching recommendations:', err);
        });
}
init();
</script>