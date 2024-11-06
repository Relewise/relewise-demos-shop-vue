<template>
    <div>
        <div v-if="product" class="mb-10">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="product"/>
          

            <div class="flex gap-3 ">
                <div class="relative flex h-[275px] overflow-hidden bg-white p-3 rounded">
                    <ProductImage :product="product"/>
                </div>

                <div class="bg-white py-4 px-6 rounded flex-grow">
                    <div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ product.displayName }}
                        </h1>
                        <div>
                            <span class="text-zinc-500">Product ID:</span> {{ product.productId }}
                        </div>

                        <div v-if="product.brand">
                            <span class="text-zinc-500">Brand:</span>  {{ product.brand.displayName }}
                        </div>

                        <div v-if="product.data && product.data.Description && product.data.Description.value">
                            <span class="text-zinc-600">{{ product.data.Description.value }}</span> 
                        </div>
                    </div>

                    <div class="mt-6">
                        <div class="mb-2 flex gap-2">
                            <span v-if="product.salesPrice !== product.listPrice" class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">ON SALE</span>

                            <span
                                v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === true"
                                class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">
                                SOLD OUT
                            </span>
                        </div>

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
            <div class="mb-10">
                <div class="text-2xl mb-2 font-semibold">
                    Purchased with the product
                </div>
                <relewise-purchased-with-product
                    :key="productId" 
                    class="grid grid-cols-2 lg:grid-cols-5"
                    number-of-recommendations="5" 
                    :displayed-at-location="defaultSettings.displayedAtLocation" 
                    :product-id="productId"/>
            </div>
            <div class="">
                <div class="text-2xl mb-2 font-semibold">
                    Products viewed after viewing the product
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
import { ProductSearchBuilder, type CategoryNameAndIdResult, type ProductResult } from '@relewise/client';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ProductImage from '../components/ProductImage.vue';
import Breadcrumb from '../components/Breadcrumb.vue';

const productId = ref<string>('');
const product = ref<ProductResult|null|undefined>(null);
const route = useRoute();

const defaultSettings = ref(contextStore.defaultSettings);
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();

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
        if (product.value?.categoryPaths) {
            // Taking the first path on the product to render the breadcrumb
            breadcrumb.value = product.value?.categoryPaths[0].pathFromRoot ?? [];
        }
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