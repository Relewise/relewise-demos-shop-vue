<template>
  <div
    id="product-page"
    class="container entity-page mx-auto px-2 lg:p-0"
  >
    <div
      v-if="loadFailed"
      class="my-4 flex flex-wrap items-center gap-3"
    >
      <p
        class="text-sm text-red-700"
        role="status"
      >
        {{ variantId ? 'This variant could not be loaded.' : 'This product could not be loaded.' }}
      </p>
      <button
        type="button"
        class="outline"
        @click="retryAttempt++"
      >
        Retry
      </button>
    </div>
    <div
      v-if="product || variants.length"
      class="mb-16"
    >
      <Breadcrumb
        v-if="product && breadcrumb"
        :breadcrumb="breadcrumb"
        :product="product"
      />

      <div class="flex flex-wrap xl:flex-nowrap gap-8 xl:gap-20 mt-3">
        <div
          v-if="product"
          class="relative flex overflow-hidden w-full xl:w-1/2 justify-center items-center"
        >
          <Image
            :entity="product"
            class="!h-[300px] xl:!h-[600px] !w-auto"
          />
        </div>

        <div class="bg-white w-full xl:ml-auto xl:w-1/2 relative">
          <div v-if="product">
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
            <p
              v-if="dimensionKeys.length && variantId && product.variant?.variantId === variantId && product.variant?.displayName !== product.displayName"
              class="mb-3 text-slate-600"
            >
              {{ product.variant?.displayName }}
            </p>

            <div
              v-if="product.data && ((product.data.description && product.data.description.value) || (product.data.Description && product.data.Description.value))"
            >
              <p class="text-slate-600 line-clamp-3">
                {{ product.data.description?.value ?? product.data.Description?.value }}
              </p>
            </div>
          </div>
          <ProductVariants
            v-if="variants.length"
            :product-id="productId"
            :variants="variants"
            :dimension-keys="dimensionKeys"
            :selected-variant-id="variantId ?? undefined"
            :language="language"
          />
          <div
            v-if="product"
            class="mt-6"
          >
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

          <div
            v-if="product"
            class="text-left mt-5"
          >
            <button
              class="w-full text-lg bg-slate-900 transition-transform duration-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              :class="buttonClass"
              :disabled="!canAddToBasket"
              @click="addToBasket"
            >
              Add to cart
            </button>
          </div>

          <div
            v-if="product"
            class="mt-5"
          >
            <h3 class="text-xl inline-block">
              Highlighted details
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
    <relewise-product-recommendation-batcher v-else-if="product">
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
      v-if="product?.variant && product.variant.variantId === variantId"
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
import { withVariantPricing } from '@/helpers/productPricing';
import { DataValueFactory, FilterBuilder, ProductSearchBuilder, type ProductResult, type VariantResult } from '@relewise/client';
import { computed, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import Image from '../components/Image.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import ProductVariants from '../components/ProductVariants.vue';
import SimilarProductsRecommendation from '../components/SimilarProductsRecommendation.vue';
import DataValueList, { type DataValueEntry } from '../components/DataValueList.vue';
import { applyVariantRequestSettings } from '@/helpers/productSearchRequest';

const route = useRoute();
const productId = computed(() => typeof route.params.id === 'string' ? route.params.id : '');
const variantId = computed(() => typeof route.params.variant === 'string' ? route.params.variant : null);
const product = ref<ProductResult>();
const variants = shallowRef<VariantResult[]>([]);
const buttonClass = ref('');
const isLoading = ref(false);
const loadFailed = ref(false);
// Retry reruns the existing loader and its stale-response guard without changing the URL.
const retryAttempt = ref(0);
const language = contextStore.language;
const defaultSettings = contextStore.defaultSettings;
const dimensionKeys = computed(() => contextStore.context.value.variantDimensionKeys ?? []);
const breadcrumb = computed(() => product.value?.categoryPaths?.[0]?.pathFromRoot ?? undefined);
const canAddToBasket = computed(() => {
  if (isLoading.value || loadFailed.value || product.value?.productId !== productId.value) return false;
  if (variantId.value) return product.value?.variant?.variantId === variantId.value;
  // Require an explicit variant on the product route when the configured picker has options.
  return dimensionKeys.value.length === 0 || variants.value.length === 0;
});

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

watch([productId, variantId, retryAttempt], async([id, selectedId], previousRoute, onCleanup) => {
  let active = true;
  // Vue runs cleanup before the watcher reruns or stops, so a late response can't overwrite the current variant.
  onCleanup(() => { active = false; });
  // Keep the same product's options usable during navigation without showing the previous variant's details.
  product.value = undefined;
  if (previousRoute?.[0] !== id) variants.value = [];
  if (!id) return;

  isLoading.value = true;
  loadFailed.value = false;
  const hasDimensions = dimensionKeys.value.length > 0;

  try {
    const selectedProperties = { ...contextStore.selectedProductProperties };
    if (hasDimensions) {
      // Apply the contextual filters without inheriting the URL's variant ID filter in the option list.
      const variantFilters = new FilterBuilder();
      contextStore.userClassificationBasedFilters(variantFilters);
      selectedProperties.allVariants = false;
      selectedProperties.filteredVariants = { filters: variantFilters.build(), inheritFiltersFromRequest: false };
    }
    const request = applyVariantRequestSettings(new ProductSearchBuilder(contextStore.defaultSettings)
      .setSelectedProductProperties(selectedProperties)
      .setSelectedVariantProperties({ allData: true, displayName: true, allSpecifications: hasDimensions, pricing: true })
      .filters(f => {
        f.addProductIdFilter([id]);
        if (selectedId) f.addVariantIdFilter(selectedId);
        contextStore.userClassificationBasedFilters(f);
      })
      .pagination(p => p.setPageSize(1)), contextStore.context.value)
      .build();

    const response = await contextStore.getSearcher().searchProducts(request);
    // A slower request for a previous route must never overwrite the result used for add-to-cart.
    if (!active) return;
    if (response) contextStore.assertApiCall(response);
    const result = response?.results?.[0];
    if (result?.productId !== id || (selectedId && result.variant?.variantId !== selectedId)) {
      loadFailed.value = true;
      return;
    }
    variants.value = (hasDimensions ? result.filteredVariants : result.allVariants) ?? [];
    product.value = withVariantPricing(result);
    trackingService.trackProductView(id, selectedId ?? undefined);
  }
  catch (error) {
    if (active) {
      loadFailed.value = true;
      console.error('Could not load product details.', error);
    }
  }
  finally {
    if (active) isLoading.value = false;
  }
}, { immediate: true });

function addToBasket() {
  if (!canAddToBasket.value || !product.value) return;

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
