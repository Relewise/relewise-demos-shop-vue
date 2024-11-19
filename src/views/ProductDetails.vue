<template>
    <div class="container mx-auto">
        <div v-if="product" class="mb-10">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="product"/>
          

            <div class="flex gap-20 mt-3">
                <div class="relative flex overflow-hidden w-1/2">
                    <ProductImage :product="product"/>
                </div>

                <div class="bg-white flex-grow">
                    <div>
                        <div v-if="product.brand">
                            <span class="text-slate-600 mb-4 text-lg">{{ product.brand.displayName }}</span>
                        </div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ product.displayName }}
                        </h1>
                       
                        <div>
                            <span class="text-slate-600">AWESOME PRODUCT ON SALE</span> 
                        </div>

                        <div v-if="product.data && product.data.Description && product.data.Description.value">
                            <span class="text-slate-600">{{ product.data.Description.value }}</span> 
                        </div>
                    </div>

                    <div class="mt-6">
                        <div class="mb-2 flex gap-2">
                            <span v-if="product.salesPrice !== product.listPrice" class="rounded-full bg-red-200 px-2 text-center text-sm font-medium text-red-900">ON SALE</span>

                            <span
                                v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === true"
                                class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">
                                SOLD OUT
                            </span>
                        </div>

                        <div>
                            <h3 class="text-2xl font-semibold text-slate-900 leading-none inline-block">
                                {{ $format(product.salesPrice) }}
                            </h3>
                            <span v-if="product.salesPrice !== product.listPrice" class="text-slate-900 line-through ml-4">
                                {{ $format(product.listPrice) }}
                            </span>
                        </div>
                    </div>

                    <div class="text-left mt-5">
                        <button class="w-full text-lg bg-slate-900 hover:bg-slate-800" @click="addToBasket">
                            Add to cart
                        </button>
                    </div>

                    <div class=" mt-5">
                        <span class="text-slate-600">Product Id:</span> {{ product.productId }}
                    </div>
                </div>
            </div>
        </div>
        <relewise-product-recommendation-batcher>
            <div class="mb-10">
                <h2 class="text-2xl mb-2 font-semibold">
                    Purchased with the product
                </h2>
                <relewise-purchased-with-product
                    :key="productId" 
                    class="grid grid-cols-2 lg:grid-cols-5"
                    number-of-recommendations="5" 
                    :displayed-at-location="defaultSettings.displayedAtLocation" 
                    :product-id="productId"/>
            </div>
            <div class="">
                <h2 class="text-2xl mb-2 font-semibold">
                    Products viewed after viewing the product
                </h2>
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