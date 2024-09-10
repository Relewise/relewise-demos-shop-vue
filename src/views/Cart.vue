<template>
    <h1 class="mb-3 text-4xl font-semibold">
        Cart
    </h1>
    <div v-if="isEmpty">
        Cart is empty
    </div>
    <div class=" justify-center md:flex md:space-x-6 xl:px-0">
        <div class="rounded md:w-2/3">
            <div v-for="item in model.lineItems" :key="item.product.productId ?? ''" class="justify-between mb-3 rounded bg-white p-3 sm:flex sm:justify-start">
                <ProductImage :product="item.product" class="w-full rounded sm:w-20"/>
                <div class="sm:ml-4 sm:flex sm:w-full sm:justify-between">
                    <div class="mt-5 sm:mt-0">
                        <h2 class="text-lg font-semibold text-gray-900">
                            {{ item.product.displayName }}
                        </h2>
                        <p class="mt-1 text-gray-500">
                            {{ item.product.brand?.displayName }}
                        </p>
                    </div>
                    <div class="mt-4 flex justify-between sm:space-y-6 sm:mt-0 sm:block sm:space-x-6">
                        <div class="flex items-center justify-end border-gray-100">
                            <span class="cursor-pointer rounded-l bg-gray-100 py-1 px-3.5 duration-100 hover:bg-brand-500 hover:text-brand-50" @click="updateLineItem(item, -1)"> - </span>
                            <input v-model="item.quantity"
                                   class="h-8 w-8 border bg-white text-center text-xs outline-none"
                                   type="number"
                                   min="1">
                            <span class="cursor-pointer rounded-r bg-gray-100 py-1 px-3 duration-100 hover:bg-brand-500 hover:text-brand-50" @click="updateLineItem(item, 1)"> + </span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <p class="">
                                <span class="text-lg text-zinc-900 mr-1 leading-none">{{ $format(item.product.salesPrice) }}</span>
                                <span v-if="item.product.salesPrice !== item.product.listPrice" class="text-zinc-900 line-through">
                                    {{ $format(item.product.listPrice) }}
                                </span>
                            </p>
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 fill="none"
                                 viewBox="0 0 24 24"
                                 stroke-width="1.5"
                                 stroke="currentColor"
                                 class="h-5 w-5 cursor-pointer duration-150 hover:text-red-500"
                                 @click="remove(item)">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Sub total -->
        <div v-if="!isEmpty" class="mt-6 h-full rounded bg-white p-6 md:mt-0 md:w-1/3">
            <div class="flex justify-between">
                <p class="text-lg font-bold">
                    Total
                </p>
                <div class="">
                    <p class="mb-1 text-lg font-bold">
                        {{ $format(model.lineItems.map(x => (x.product.salesPrice ?? 0) * x.quantity).reduce((partialSum, a) => partialSum + a, 0)) }}
                    </p>
                    <p class="text-sm text-gray-700">
                        including VAT
                    </p>
                </div>
            </div>
            <button @click="checkout">
                Check out
            </button>
        </div>
    </div>
    <div v-if="result" class="">
        <h2 class="text-2xl font-semibold mt-4">
            Recommendations
        </h2>
        <div class="grid gap-3 grid-cols-2 lg:grid-cols-5 mt-3">
            <ProductTile v-for="(product, pIndex) in result?.recommendations ?? []" :key="pIndex" :product="product"/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import ProductTile from '../components/ProductTile.vue';
import { ref } from 'vue';
import { ConditionBuilder, DataValueFactory, type ProductRecommendationResponse, PurchasedWithCurrentCartBuilder, PurchasedWithMultipleProductsBuilder } from '@relewise/client';
import contextStore from '@/stores/context.store';
import basketService, { type ILineItem } from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import { computed } from 'vue';
import ProductImage from '@/components/ProductImage.vue';
import { addAssortmentFilters } from '@/stores/customFilters';

const result = ref<ProductRecommendationResponse | undefined>(undefined);
const recommender = contextStore.getRecommender();
const model = ref(basketService.model);
const isEmpty = computed(() => basketService.model.value.lineItems.length === 0);
const mappedProducts = basketService.model.value.lineItems.map((item) => ({
  productId: item.product.productId as string
}));

function init() {
    if (!isEmpty.value) {
        recommend();
    }
}

init();

async function recommend() {
    const take = 5;
    // const request = new PurchasedWithCurrentCartBuilder(contextStore.defaultSettings)
    const request = new PurchasedWithMultipleProductsBuilder(contextStore.defaultSettings)
    
        .addProducts(mappedProducts)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({allData: true})
        .setNumberOfRecommendations(take)
        .filters(
                 f=> {
                    addAssortmentFilters(f); 
                    f.addProductDataFilter("soldOut", (c:ConditionBuilder) => c.addEqualsCondition(DataValueFactory.boolean(true)), true, false, true);
                 }
         )
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPurchasedWithMultipleProducts(request);
    contextStore.assertApiCall(response);

    result.value = response;
}

function updateLineItem(item : ILineItem, quantityDelta: number) {
    basketService.addProduct({ product: item.product, quantityDelta });
    trackingService.trackCart(basketService.model.value.lineItems);
}

function remove(item: ILineItem) {
    basketService.remove(item);
    trackingService.trackCart(basketService.model.value.lineItems);
}

function checkout() {
    trackingService.trackOrder(basketService.model.value.lineItems);
    basketService.clear();
}
</script>