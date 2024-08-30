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
        <relewise-product-recommendation-batcher>
            <div class="my-3">
                <div class="text-2xl font-semibold">
                    Purchased with
                </div>
                <relewise-purchased-with-product
                    :key="productId" 
                    class="grid grid-cols-2 lg:grid-cols-5"
                    number-of-recommendations="5" 
                    :displayed-at-location="defaultSettings.displayedAtLocation" 
                    :product-id="productId"/>
            </div>
            <div class="my-3">
                <div class="text-2xl font-semibold">
                    Products viewed after viewing
                </div>
                <relewise-products-viewed-after-viewing-product
                    :key="productId" 
                    class="grid grid-cols-2 lg:grid-cols-5"
                    number-of-recommendations="5" 
                    :displayed-at-location="defaultSettings.displayedAtLocation" 
                    :product-id="productId"/>
            </div>
        </relewise-product-recommendation-batcher>
    </div>
</template>

<script lang="ts" setup>
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, type ProductResult } from '@relewise/client';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ProductImage from '../components/ProductImage.vue';

const productId = ref<string>('');
const product = ref<ProductResult|null|undefined>(null);
const route = useRoute();

const defaultSettings = ref(contextStore.defaultSettings);

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
    }
}

init();

watch(route, () => {
    init();
});

function addToBasket() {
    if (!product.value) return;

    basketService.addProduct({ 
        product: product.value, 
        quantityDelta: 1, 
    });

    trackingService.trackCart(basketService.model.value.lineItems);
}
</script>