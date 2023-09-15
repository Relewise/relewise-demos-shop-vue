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

        <div class="my-3">
            <div class="text-2xl font-semibold">
                Purchased with
            </div>
            <relewise-purchased-with-product numberofrecommendations="5" displayedatlocation="Demo store" :productid="productId"/>
        </div>
        <div class="my-3">
            <div class="text-2xl font-semibold">
                Products viewed after viewing
            </div>
            <relewise-products-viewed-after-viewing-product numberofrecommendations="5" displayedatlocation="Demo store" :productid="productId"/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, ProductsRecommendationCollectionBuilder, ProductsViewedAfterViewingProductBuilder, PurchasedWithProductBuilder, type ProductRecommendationRequestCollection, type ProductRecommendationResponseCollection, type ProductResult } from '@relewise/client';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ProductImage from '../components/ProductImage.vue';

const result= ref<ProductRecommendationResponseCollection | undefined| null>(null);
const productId = ref<string>('');
const product = ref<ProductResult|null|undefined>(null);
const recommender = contextStore.getRecommender();
const route = useRoute();

contextStore.initializeWebComponents();

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