<template>
  <div
    id="product-page"
    class="container entity-page mx-auto px-2 lg:p-0"
  >
    <div
      v-if="product"
      class="mb-16"
    >
      <Breadcrumb
        v-if="breadcrumb"
        :breadcrumb="breadcrumb"
        :product="product"
      />

      <div class="flex flex-wrap xl:flex-nowrap gap-8 xl:gap-20 mt-3">
        <div class="relative flex overflow-hidden w-full xl:w-1/2 justify-center items-center">
          <Image
            :entity="product"
            class="!h-[300px] xl:!h-[600px] !w-auto"
          />
        </div>

        <div class="bg-white w-full xl:w-1/2 relative">
          <div>
            <div
              class="flex items-center gap-2 mb-1"
              :class="product.brand ? 'justify-between' : 'items-end'"
            >
              <RouterLink
                v-if="product.brand"
                :to="{ path: '/', query: { term: '', sort: '', brand: product.brand.id, open: '1', brandName: product.brand.displayName, }, }"
                class="text-slate-600 text-lg inline-block hover:underline"
              >
                {{ product.brand.displayName }}
              </RouterLink>

              <app-product-favorite-button :product="product" />
            </div>

            <h1 class="text-4xl mb-4 font-semibold">
              {{ product.displayName }}
            </h1>

            <div
              v-if="product.data && ((product.data.description && product.data.description.value) || (product.data.Description && product.data.Description.value))"
            >
              <p class="text-slate-600 line-clamp-3">
                {{ product.data.description?.value ?? product.data.Description?.value }}
              </p>
            </div>
          </div>
          <div v-if="product.allVariants">
            <ProductVariants
              :product="product"
              :selected-variant-id="variantId ?? undefined"
            />
          </div>
          <div class="mt-6">
            <div class="mb-2 flex gap-2">
              <span
                v-if="product.salesPrice !== product.listPrice"
                class="rounded-full bg-red-200 px-2 text-center text-sm font-medium text-red-900"
              >ON
                SALE</span>

              <span
                v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === 'true'"
                class="rounded-full bg-black px-2 text-center text-sm font-medium text-white"
              >
                SOLD OUT
              </span>
            </div>

            <div>
              <h3 class="text-2xl font-semibold text-slate-900 leading-none inline-block">
                {{ $format(product.salesPrice) }}
              </h3>
              <span
                v-if="product.salesPrice !== product.listPrice"
                class="text-slate-900 line-through ml-4"
              >
                {{ $format(product.listPrice) }}
              </span>
            </div>
          </div>

          <div class="text-left mt-5">
            <button
              class="w-full text-lg bg-slate-900 transition-transform duration-300 hover:bg-slate-700"
              :class="buttonClass"
              @click="addToBasket"
            >
              Add to cart
            </button>
          </div>

          <section
            v-if="availability"
            aria-labelledby="store-availability-heading"
            class="mt-5 rounded-lg border border-slate-200 p-4"
          >
            <h2
              id="store-availability-heading"
              class="text-lg font-semibold"
            >
              {{ availability.kind === 'stores' || (availability.kind === 'unavailable' && availability.byStore) ? 'Store availability' : 'Stock availability' }}
            </h2>
            <dl
              v-if="availability.kind === 'stores'"
              class="mt-1 divide-y divide-slate-100 text-sm"
            >
              <div
                v-for="store in availability.stores"
                :key="store.id"
                class="flex items-baseline justify-between gap-4 py-2"
              >
                <dt>{{ store.name }}</dt>
                <dd
                  class="text-right"
                  :class="(store.quantity ?? 0) > 0 ? 'font-medium text-emerald-700' : 'text-slate-600'"
                >
                  <template v-if="store.quantity === undefined">
                    Stock unknown
                  </template>
                  <template v-else-if="store.quantity <= 0">
                    Out of stock
                  </template>
                  <template v-else>
                    {{ store.quantity }} in stock
                  </template>
                </dd>
              </div>
            </dl>
            <p
              v-else-if="availability.kind === 'summary'"
              class="mt-2 flex items-center gap-2 text-sm font-medium"
              :class="availability.inStock ? 'text-emerald-700' : 'text-slate-600'"
            >
              <CheckCircleIcon
                v-if="availability.inStock"
                class="size-5"
                aria-hidden="true"
              />
              <XCircleIcon
                v-else
                class="size-5"
                aria-hidden="true"
              />
              {{ availability.inStock ? (availability.quantity === undefined ? 'In stock' : `${availability.quantity} in stock`) : 'Out of stock' }}
            </p>
            <p
              v-else
              class="mt-2 text-sm text-slate-600"
            >
              {{ availability.byStore ? 'Store stock information is unavailable.' : 'Stock information is unavailable.' }}
            </p>
          </section>

          <div class="mt-5">
            <h3 class="text-xl inline-block">
              Highlighed details
            </h3>
            <DataValueList :entries="highlightedDetails">
              <template
                v-if="product.brand"
                #Brand
              >
                <RouterLink
                  :to="{ path: '/', query: { term: '', sort: '', brand: product.brand.id, open: '1', brandName: product.brand.displayName } }"
                  class="text-brand-500 hover:underline"
                >
                  {{ product.brand.displayName }}
                </RouterLink>
              </template>
            </DataValueList>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="product?.data
        && product.data.SoldOut
        && product.data.SoldOut.value === 'true'
        && contextStore.context.value.similarProductsOnPdp"
    >
      <SimilarProductsRecommendation :product="product" />
    </div>
    <relewise-product-recommendation-batcher v-else>
      <div class="mb-16 scrollbar">
        <h2 class="text-2xl mb-2 font-semibold">
          Purchased with the product
        </h2>
        <div class="w-full overflow-x-scroll">
          <relewise-purchased-with-product
            :key="productId"
            class="flex flex-row gap-3"
            :number-of-recommendations="contextStore.numberOfProductsToRecommend"
            :displayed-at-location="defaultSettings.displayedAtLocation"
            :product-id="productId"
            :variant-id="variantId"
          />
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
            :number-of-recommendations="contextStore.numberOfProductsToRecommend"
            :displayed-at-location="defaultSettings.displayedAtLocation"
            :product-id="productId"
            :variant-id="variantId"
          />
        </div>
      </div>
    </relewise-product-recommendation-batcher>


    <div
      v-if="product?.variant && variantId"
      class="mt-10"
    >
      <h3 class="text-xl inline-block">
        Variant Data
      </h3>
      <DataValueList :entries="variantData" />
    </div>

    <div
      v-if="product"
      class="mt-10"
    >
      <h3 class="text-xl inline-block">
        Product Data
      </h3>
      <DataValueList :entries="productData">
        <template
          v-if="product.brand"
          #Brand
        >
          <RouterLink
            :to="{ path: '/', query: { term: '', sort: '', brand: product.brand.id, open: '1', brandName: product.brand.displayName } }"
            class="text-brand-500 hover:underline"
          >
            {{ product.brand.displayName }}
          </RouterLink>
        </template>
      </DataValueList>
    </div>
  </div>
</template>

<script lang="ts" setup>
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';
import { DataValueFactory, ProductSearchBuilder, type CategoryNameAndIdResult, type ProductResult } from '@relewise/client';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Image from '../components/Image.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import ProductVariants from '../components/ProductVariants.vue';
import SimilarProductsRecommendation from '../components/SimilarProductsRecommendation.vue';
import DataValueList, { type DataValueEntry } from '../components/DataValueList.vue';
import { applyVariantRequestSettings } from '@/helpers/productSearchRequest';
import { getStockAvailability } from '@/helpers/storeAvailability';

const productId = ref<string>('');
const variantId = ref<string | null>(null);
const product = ref<ProductResult | null | undefined>(null);
const route = useRoute();
const buttonClass = ref('');
const defaultSettings = ref(contextStore.defaultSettings);
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();
const dataset = contextStore.context;
const availability = computed(() => product.value ? getStockAvailability(product.value, dataset.value) : undefined);
let requestSequence = 0;

const details = computed(() => {
  if (!product.value) return [];

  const productDetails = Object.entries(product.value.data ?? {})
    .filter((x) =>
      x[1].type.indexOf('Object') === -1 &&
      ['Margin', 'ImportedAt', 'Serie', 'FeedIntegrationVersion', 'InStock', 'OnSale', 'AvailableInChannels', 'AvailableInMarkets', `${contextStore.language.value}_StockLevel`].includes(x[0]));

  const variantColor = product.value.variant?.data?.Color;
  if (variantColor) {
    productDetails.push(['Color', variantColor]);
  }

  const variantMaterial = product.value.variant?.data?.Material;
  if (variantMaterial) {
    productDetails.push(['Material', variantMaterial]);
  }

  return productDetails;
});

const highlightedDetails = computed<DataValueEntry[]>(() => {
  if (!product.value) return [];

  return [
    ['Product Id', DataValueFactory.string(product.value.productId ?? '')],
    ...(product.value.brand ? [['Brand', DataValueFactory.string(product.value.brand.displayName ?? '')] as DataValueEntry] : []),
    ...details.value,
  ];
});

const variantData = computed<DataValueEntry[]>(() => {
  if (!product.value?.variant) return [];

  return [
    ['Variant Id', DataValueFactory.string(product.value.variant.variantId ?? '')],
    ...Object.entries(product.value.variant.data ?? {}),
  ];
});

const productData = computed<DataValueEntry[]>(() => {
  if (!product.value) return [];

  return [
    ['Product Id', DataValueFactory.string(product.value.productId ?? '')],
    ...(product.value.brand ? [['Brand', DataValueFactory.string(product.value.brand.displayName ?? '')] as DataValueEntry] : []),
    ...Object.entries(product.value.data ?? {}),
  ];
});

async function init() {
  const sequence = ++requestSequence;
  const id = route.params.id;
  const variantIdFromRoute = route.params.variant;

  if (id && !Array.isArray(id)) {
    const requestedVariantId = typeof variantIdFromRoute === 'string' ? variantIdFromRoute : null;
    if (productId.value !== id || variantId.value !== requestedVariantId) {
      product.value = null;
    }
    productId.value = id;
    variantId.value = requestedVariantId;

    trackingService.trackProductView(id, variantId.value ?? undefined);

    const request = applyVariantRequestSettings(new ProductSearchBuilder(contextStore.defaultSettings)
      .setSelectedProductProperties(contextStore.selectedProductProperties)
      .setSelectedVariantProperties({ allData: true, displayName: true })
      .filters(f => {
        f.addProductIdFilter([id]);

        if (variantId.value) {
          f.addVariantIdFilter(variantId.value);
        }

        contextStore.userClassificationBasedFilters(f);
      })
      .pagination(p => p.setPageSize(1)), contextStore.context.value)
      .build();

    const searcher = contextStore.getSearcher();
    const result = (await searcher.searchProducts(request))?.results?.[0];
    // Returning to a variant can leave multiple requests for the same ID in flight.
    if (sequence !== requestSequence) return;
    product.value = result;
    if (product.value?.categoryPaths) {
      // Taking the first path on the product to render the breadcrumb
      breadcrumb.value = product.value?.categoryPaths[0]?.pathFromRoot ?? [];
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

  buttonClass.value = 'animate-bounce'; // Add Tailwind's bounce class
  setTimeout(() => {
    buttonClass.value = ''; // Remove the animation class
  }, 2000); // Match the animation duration (500ms for `animate-bounce`)
}

</script>
