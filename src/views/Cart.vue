<template>
  <div
    id="cart-page"
    class="container mx-auto p-2 xl:p-0 min-h-[60vh]"
  >
    <Breadcrumb :items="[{ name: 'Cart', route: { name: 'cart' } }]" />
    <h1 class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block">
      Cart
    </h1>
    <div
      v-if="isEmpty"
      class="rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm lg:px-10"
    >
      <div class="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <ShoppingBagIcon class="h-8 w-8" />
        </div>
        <h2 class="mt-6 text-2xl text-slate-900 lg:text-3xl">
          Your cart is empty
        </h2>
        <p class="mt-3 max-w-xl text-sm text-slate-600 lg:text-base">
          Looks like you haven’t added anything yet. Explore the shop and add something you like.
        </p>
        <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <RouterLink
            to="/"
            class="inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Start shopping
          </RouterLink>
          <RouterLink
            to="/favorites"
            class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            View favorites
          </RouterLink>
        </div>
      </div>
    </div>
    <div class="justify-center md:flex md:space-x-6 xl:px-0">
      <div class="md:w-3/5">
        <div
          v-for="item in model.lineItems"
          :key="item.product.productId ?? ''"
          class="justify-between mb-5 rounded bg-white sm:flex sm:justify-start"
        >
          <Image
            :entity="item.product"
            class="w-full rounded sm:!w-20 xl:!w-60"
          />
          <div class="sm:ml-4 flex-grow">
            <div class="mt-5 sm:mt-0">
              <p
                v-if="item.product.brand"
                class="mt-1 text-gray-500"
              >
                {{ item.product.brand?.displayName }}
              </p>
              <h2 class="text-xl font-semibold text-gray-900">
                {{ item.product.displayName }}
              </h2>
            </div>
            <div class="mt-4 flex flex-wrap gap-4 justify-between w-full">
              <div class="flex items-center border-gray-100 w-1/2">
                <span
                  class="cursor-pointer rounded-l bg-gray-100 py-1 px-3.5 duration-100 hover:bg-gray-300"
                  @click="updateLineItem(item, -1)"
                > - </span>
                <input
                  v-model="item.quantity"
                  class="h-8 w-12 border bg-white text-center text-xs outline-none"
                  type="number"
                  min="1"
                >
                <span
                  class="cursor-pointer rounded-r bg-gray-100 py-1 px-3 duration-100 hover:bg-gray-300"
                  @click="updateLineItem(item, 1)"
                > + </span>
              </div>
              <div class="flex-grow flex items-center justify-end">
                <span class="text-xl text-slate-900 mr-1 leading-none">{{
                  $format(item.product.salesPrice) }}</span>
                <span
                  v-if="item.product.salesPrice !== item.product.listPrice"
                  class="text-slate-900 line-through"
                >
                  {{ $format(item.product.listPrice) }}
                </span>
              </div>

              <div class="flex items-center w-full">
                <a
                  href="#"
                  class="inline-flex text-neutral-600 hover:underline"
                  @click.prevent="remove(item)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-5 w-5 cursor-pointer duration-150"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span class="ml-3 text-sm">Remove from cart</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="!isEmpty"
        class="mt-6 h-full bg-neutral-200 p-6 md:mt-0 md:w-2/5"
      >
        <div class="flex justify-between mb-6">
          <h4 class="text-xl font-bold">
            Total
          </h4>
          <div class="">
            <h4 class="mb-1 text-xl font-bold">
              {{ $format(model.lineItems.map(x => (x.product.salesPrice ?? 0) *
                x.quantity).reduce((partialSum, a) => partialSum + a, 0)) }}
            </h4>
            <p class="text-sm text-gray-700">
              including VAT
            </p>
          </div>
        </div>
        <button
          class="bg-slate-900 w-full text-lg"
          @click="checkout"
        >
          Place order
        </button>
      </div>
    </div>

    <div
      v-if="result"
      class="scrollbar mt-8"
    >
      <h2 class="text-2xl font-semibold mb-3">
        {{ recommendationTitle }}
      </h2>
      <div class="w-full overflow-x-scroll">
        <div class="flex flex-row gap-6">
          <div
            v-for="(product, pIndex) in result?.recommendations ?? []"
            :key="pIndex"
            class="min-w-[250px] pb-3"
          >
            <ProductTile :product="product" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Breadcrumb from '@/components/Breadcrumb.vue';
import ProductTile from '../components/ProductTile.vue';
import { ref } from 'vue';
import { PopularProductsBuilder, type ProductRecommendationResponse, PurchasedWithMultipleProductsBuilder } from '@relewise/client';
import contextStore from '@/stores/context.store';
import basketService, { type ILineItem } from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import { computed } from 'vue';
import Image from '@/components/Image.vue';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import router from '@/router';
import { ShoppingBagIcon } from '@heroicons/vue/24/outline';

const result = ref<ProductRecommendationResponse | undefined>(undefined);
const recommendationTitle = ref('People also buy');
const recommender = contextStore.getRecommender();
const model = ref(basketService.model);
const isEmpty = computed(() => basketService.model.value.lineItems.length === 0);

function init() {
    if (contextStore.user.value.classifications?.channel === 'B2B'
    && contextStore.context.value.B2bRecommendations) {
        recommendB2B();
    } else if (isEmpty.value) {
        recommendPopular();
    } else {
        recommend();
    }
}

init();

async function recommendB2B() {
    const request = new PopularProductsBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .relevanceModifiers(modifier => {
            if (contextStore.user.value.company?.id) {
                modifier.addProductRecentlyPurchasedByCompanyRelevanceModifier(86400, [contextStore.user.value.company.id], 10);
            }
        })
        .filters(builder => {
            globalProductRecommendationFilters(builder);
            builder.addProductCategoryIdFilter('ImmediateParent', ['3_5']);
        })
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPopularProducts(request);
    contextStore.assertApiCall(response);

    recommendationTitle.value = 'People also buy';
    result.value = response;
}
async function recommend() {
    const request = new PurchasedWithMultipleProductsBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .addProducts(basketService.model.value.lineItems
            .filter(item => item.product.productId)
            .map(item => ({
                productId: item.product.productId as string,
            })),
        )
        .filters(builder => globalProductRecommendationFilters(builder))
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPurchasedWithMultipleProducts(request);
    contextStore.assertApiCall(response);

    recommendationTitle.value = 'People also buy';
    result.value = response;
}

async function recommendPopular() {
    const request = new PopularProductsBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .filters(builder => globalProductRecommendationFilters(builder))
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPopularProducts(request);
    contextStore.assertApiCall(response);

    recommendationTitle.value = 'Popular right now';
    result.value = response;
}

function updateLineItem(item: ILineItem, quantityDelta: number) {
    basketService.addProduct({ product: item.product, quantityDelta });
    trackingService.trackCart(basketService.model.value.lineItems);
    init();
}

function remove(item: ILineItem) {
    basketService.remove(item);
    trackingService.trackCart(basketService.model.value.lineItems);

    init();
}

function checkout() {
    trackingService.trackOrder(basketService.model.value.lineItems);
    basketService.clear();
    router.push({
        name: 'receipt',
    });
}
</script>
