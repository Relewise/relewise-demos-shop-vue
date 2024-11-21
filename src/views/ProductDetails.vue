<template>
    <div class="container mx-auto">
        <div v-if="product" class="mb-16">
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

                        <div v-if="product.data && product.data.description && product.data.description.value">
                            <p class="text-slate-600 line-clamp-3">
                                {{ product.data.description.value }}
                            </p> 
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

                    <div class="mt-5">
                        <h3 class="text-2xl inline-block">
                            Details
                        </h3>
                        <dl class="mt-2 border border-solid border-slate-100">
                            <dt>Product Id</dt>
                            <dd>{{ product.productId }}</dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
        <relewise-product-recommendation-batcher>
            <div class="mb-16 scrollbar">
                <h2 class="text-2xl mb-2 font-semibold">
                    Purchased with the product
                </h2>
                <div class="w-full overflow-x-scroll">
                    <relewise-purchased-with-product
                        :key="productId" 
                        class="flex flex-row gap-3"
                        number-of-recommendations="15" 
                        :displayed-at-location="defaultSettings.displayedAtLocation" 
                        :product-id="productId"/>
                </div>
            </div>
            <div class="scrollbar">
                <h2 class="text-2xl mb-2 font-semibold">
                    Products viewed after viewing the product
                </h2>
                <div class="w-full overflow-x-scroll">
                    <relewise-products-viewed-after-viewing-product
                        :key="productId" 
                        class="flex flex-row gap-3"
                        number-of-recommendations="15" 
                        :displayed-at-location="defaultSettings.displayedAtLocation" 
                        :product-id="productId"/>
                </div>
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

<style lang="scss" scoped>
dl {
  display: grid;
  grid-template-columns: max-content auto;
}

dt {
  grid-column-start: 1;
  @apply bg-slate-100 px-4 py-2 border-b border-solid border-slate-100;
}

dd {
  grid-column-start: 2;
  @apply p-2 border-b border-solid border-slate-100 pl-10;
}</style>