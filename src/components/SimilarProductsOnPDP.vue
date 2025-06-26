<template>
    <div class="my-3">
        <div class="text-2xl font-semibold">
            Sold out....consider an alternative
        </div>
        <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProductTile v-for="(product, index) in similarProds?.recommendations" :key="index" :product="product" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from 'vue';
import contextStore from '@/stores/context.store';
import { SimilarProductsProductBuilder, type ProductRecommendationResponse, type ProductResult } from '@relewise/client';
import { addCartFilter } from '../stores/demoSpecificFilters';
import {globalProductRecommendationFilters} from '../stores/globalProductFilters'
import ProductTile from './ProductTile.vue'

const productId = ref<string>('');
const product = ref<ProductResult | null | undefined>(null);
const similarProds = ref<ProductRecommendationResponse | null | undefined>(null);

const props = defineProps<{
    productId: string,
    product: ProductResult
}>();

productId.value = props.productId;
product.value = props.product;

watchEffect(async () => {
    if (!productId.value || !product.value) return;

    const similarproductsRequest = new SimilarProductsProductBuilder(contextStore.defaultSettings)
        .product({ productId: productId.value })
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .filters(f => {
            globalProductRecommendationFilters(f);
            addCartFilter(f);

            const categoryId = product.value?.categoryPaths?.[0]?.pathFromRoot?.[1]?.id;
            if (!categoryId || typeof categoryId !== 'string') {
                console.warn("Category ID missing");
                return;
            }

            f.addProductCategoryIdFilter("ImmediateParentOrItsParent", categoryId);
        })
        .build();

    similarproductsRequest.settings.numberOfRecommendations = 4;

    const recommender = contextStore.getRecommender();
    try {
        similarProds.value = await recommender.recommendSimilarProducts(similarproductsRequest);
    } catch (err) {
        console.error("Error fetching recommendations:", err);
    }
});
</script>