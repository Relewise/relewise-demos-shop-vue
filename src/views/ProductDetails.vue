<template>
    <div>
        <div v-if="product" class="mb-6">
            <h1 class="text-4xl font-semibold">
                {{ product.displayName }}
            </h1>
            <div class="text-zinc-500">
                Product ID: {{ product.productId }}
            </div>

            <div class="flex gap-6 mt-3">
                <div class="relative flex h-[275px] overflow-hidden">
                    <ProductImage :product="product"/>
                    <span v-if="product.salesPrice !== product.listPrice" class="absolute top-0 left-0 m-2 rounded-full bg-black px-2 text-center text-sm font-medium text-white">ON SALE</span>
                </div>

                <div>
                    <div class="mt-2 flex items-center justify-between">
                        <p>
                            <span class="text-lg font-semibold text-zinc-900 mr-1 leading-none">{{ $format(product.salesPrice) }}</span>
                            <span v-if="product.salesPrice !== product.listPrice" class="text-zinc-900 line-through">
                                {{ $format(product.listPrice) }}
                            </span>
                        </p>
                    </div>

                    <div class="text-left mt-3">
                        <button @click="addToBasket">
                            Add to cart
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="result?.responses">
            <div v-for="(response, index) in result?.responses" :key="index" class="mb-10">
                <div class="my-3">
                    <div class="text-2xl font-semibold">
                        {{ (index === 0 ? "Purchased with" : "Products viewed after viewing") }}
                    </div>
                </div>
                <div class="grid gap-3 grid-cols-5 mt-3">
                    <ProductTile v-for="(p, pIndex) in response?.recommendations ?? []" :key="pIndex" :product="p"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import ProductTile from '../components/ProductTile.vue';
import ProductImage from '../components/ProductImage.vue';
import { ref, watch } from 'vue';
import { type ProductRecommendationRequestCollection, type ProductRecommendationResponseCollection, PurchasedWithProductBuilder, ProductsRecommendationCollectionBuilder, ProductsViewedAfterViewingProductBuilder, ProductSearchBuilder, type ProductResult } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { useRoute } from 'vue-router';
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';

const result= ref<ProductRecommendationResponseCollection | undefined| null>(null);
const productId = ref<string>('');
const product = ref<ProductResult|null|undefined>(null);
const recommender = contextStore.getRecommender();
const route = useRoute();

async function init() {
    
    const id = route.params.id;

    if (id && !Array.isArray(id)) {
        productId.value = id;

        trackingService.trackProductView(id);

        const request = new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({allData: true, displayName: true})
            .setExplodedVariants(1)
            .filters(f => f.addProductIdFilter([id]))
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        product.value = (await searcher.searchProducts(request))?.results![0];
        recommend();
    }
}

init();

watch(route, () => {
    init();
});

async function recommend() {
    const take = 5;
    const request: ProductRecommendationRequestCollection = new ProductsRecommendationCollectionBuilder()
        .addRequest(new PurchasedWithProductBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({allData: true})
            .product({ productId: productId.value })
            .setNumberOfRecommendations(take)
            .build())
        .addRequest(new ProductsViewedAfterViewingProductBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({allData: true})
            .product({ productId: productId.value })
            .setNumberOfRecommendations(take)
            .build())
        .build();

    const response: ProductRecommendationResponseCollection | undefined = await recommender.batchProductRecommendations(request);
    contextStore.assertApiCall(response);

    result.value = response;
}

function addToBasket() {
    if (!product.value) return;

    basketService.addProduct({ 
        product: product.value, 
        quantityDelta: 1, 
    });

    trackingService.trackCart(basketService.model.value.lineItems);
}
</script>