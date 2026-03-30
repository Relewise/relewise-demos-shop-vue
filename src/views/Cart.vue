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
    <div
      v-else
      class="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr),22rem] xl:gap-8 xl:px-0"
    >
      <div>
        <div
          v-for="item in model.lineItems"
          :key="item.product.productId ?? ''"
          class="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div class="flex flex-col gap-4 sm:grid sm:grid-cols-[auto,minmax(0,1fr),8.5rem,9rem,4rem] sm:items-center sm:gap-5">
            <RouterLink
              :to="productRoute(item)"
              class="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 transition hover:bg-slate-100 sm:mx-0 xl:h-28 xl:w-28"
            >
              <Image
                :entity="item.product"
                class="h-24 w-24 rounded-2xl xl:h-28 xl:w-28"
              />
            </RouterLink>

            <div class="min-w-0 flex-1">
              <p
                v-if="item.product.brand"
                class="text-sm font-medium uppercase tracking-[0.18em] text-slate-500"
              >
                {{ item.product.brand?.displayName }}
              </p>
              <RouterLink
                :to="productRoute(item)"
                class="mt-2 block text-lg font-semibold leading-snug text-slate-900 transition hover:text-brand-500 sm:text-xl"
              >
                {{ item.product.displayName }}
              </RouterLink>
              <p
                v-if="productMeta(item)"
                class="mt-2 text-sm text-slate-500"
              >
                {{ productMeta(item) }}
              </p>
            </div>

            <div class="border-t border-slate-200 pt-4 sm:self-center sm:justify-self-center sm:border-t-0 sm:pt-0">
              <div class="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm">
                <button
                  type="button"
                  class="bg-slate-50 px-3 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                  aria-label="Decrease quantity"
                  @click="updateLineItem(item, -1)"
                >
                  -
                </button>
                <input
                  :value="item.quantity"
                  class="!block !h-10 !w-10 !min-w-0 !rounded-none !border-x !border-y-0 !border-slate-200 !bg-white !px-0 !py-0 text-center !text-sm !font-semibold tabular-nums !text-slate-900 !shadow-none !ring-0 outline-none focus:!border-slate-200 focus:!ring-0"
                  type="text"
                  inputmode="numeric"
                  maxlength="3"
                  @change="setLineItemQuantity(item, $event)"
                  @blur="setLineItemQuantity(item, $event)"
                >
                <button
                  type="button"
                  class="bg-slate-50 px-3 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                  aria-label="Increase quantity"
                  @click="updateLineItem(item, 1)"
                >
                  +
                </button>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-4 text-left sm:self-center sm:justify-self-end sm:border-t-0 sm:pt-0 sm:text-right">
              <p class="text-2xl font-semibold leading-none text-slate-900">
                {{ $format(lineTotal(item)) }}
              </p>
              <div class="mt-2 text-sm text-slate-500">
                <p>Each: {{ $format(item.product.salesPrice) }}</p>
                <p
                  v-if="item.product.salesPrice !== item.product.listPrice"
                  class="line-through"
                >
                  Was {{ $format(item.product.listPrice) }}
                </p>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-4 sm:self-center sm:justify-self-center sm:border-t-0 sm:pt-0">
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Remove from cart"
                aria-label="Remove from cart"
                @click="remove(item)"
              >
                <TrashIcon
                  class="shrink-0"
                  style="width: 1.25rem; height: 1.25rem;"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        class="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28"
      >
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Order summary
            </p>
            <h4 class="mt-2 text-2xl font-semibold text-slate-900">
              Total
            </h4>
          </div>
          <div class="text-right">
            <h4 class="text-3xl font-semibold text-slate-900">
              {{ $format(cartTotal) }}
            </h4>
            <p class="mt-1 text-sm text-slate-500">
              including VAT
            </p>
          </div>
        </div>
        <dl class="space-y-3 py-5 text-sm text-slate-600">
          <div class="flex items-center justify-between gap-4">
            <dt>Items</dt>
            <dd class="font-medium text-slate-900">
              {{ itemCount }}
            </dd>
          </div>
        </dl>
        <div class="space-y-3">
          <button
            class="w-full bg-slate-900 text-lg"
            @click="checkout"
          >
            Place order
          </button>
          <RouterLink
            to="/"
            class="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Continue shopping
          </RouterLink>
        </div>
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
import { computed, ref } from 'vue';
import { PersonalProductRecommendationBuilder, PopularProductsBuilder, PurchasedWithMultipleProductsBuilder, type ProductRecommendationResponse } from '@relewise/client';
import contextStore from '@/stores/context.store';
import basketService, { type ILineItem } from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import Image from '@/components/Image.vue';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import router from '@/router';
import { ShoppingBagIcon, TrashIcon } from '@heroicons/vue/24/outline';

const result = ref<ProductRecommendationResponse | undefined>(undefined);
const recommendationTitle = ref('People also buy');
const recommender = contextStore.getRecommender();
const model = ref(basketService.model);
const isEmpty = computed(() => basketService.model.value.lineItems.length === 0);
const cartTotal = computed(() => basketService.model.value.lineItems
    .map(x => (x.product.salesPrice ?? 0) * x.quantity)
    .reduce((partialSum, a) => partialSum + a, 0));
const itemCount = computed(() => basketService.model.value.lineItems
    .map(x => x.quantity)
    .reduce((partialSum, a) => partialSum + a, 0));

function init() {
    if (contextStore.user.value.classifications?.channel === 'B2B'
    && contextStore.context.value.B2bRecommendations) {
        recommendB2BPopularProducts();
    } else if (isEmpty.value) {
        recommendPersonalProducts();
    } else {
        recommendPurchasedWithMultipleProducts();
    }
}

init();

async function recommendB2BPopularProducts() {
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

async function recommendPurchasedWithMultipleProducts() {
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

async function recommendPersonalProducts() {
    const request = new PersonalProductRecommendationBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .filters(builder => globalProductRecommendationFilters(builder))
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendPersonalProducts(request);
    contextStore.assertApiCall(response);

    recommendationTitle.value = 'Recommended for you';
    result.value = response;
}

function productRoute(item: ILineItem) {
    return {
        name: item.product.variant ? 'variant' : 'product',
        params: {
            id: item.product.productId,
            variant: item.product.variant?.variantId,
        },
    };
}

function productMeta(item: ILineItem) {
    const variantName = item.product.variant?.displayName?.trim();
    if (!variantName || variantName === item.product.displayName)
        return '';

    return `Variant: ${variantName}`;
}

function lineTotal(item: ILineItem) {
    return (item.product.salesPrice ?? 0) * item.quantity;
}

function setLineItemQuantity(item: ILineItem, event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input)
        return;

    const rawValue = input.value.trim();
    if (!/^\d{1,3}$/.test(rawValue)) {
        input.value = String(item.quantity);
        return;
    }

    const nextQuantity = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0 || nextQuantity > 999) {
        input.value = String(item.quantity);
        return;
    }

    const quantityDelta = nextQuantity - item.quantity;
    if (quantityDelta === 0) {
        input.value = String(item.quantity);
        return;
    }

    basketService.addProduct({ product: item.product, quantityDelta });
    trackingService.trackCart(basketService.model.value.lineItems);
    init();
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
