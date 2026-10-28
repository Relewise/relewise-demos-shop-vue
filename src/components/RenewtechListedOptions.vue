<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { ProductResult } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import { listedComponentIds, listedOptionsRequest } from '@/helpers/renewtechDemo';
import ProductTile from '@/components/ProductTile.vue';

const props = defineProps<{ product: ProductResult }>();
const products = ref<ProductResult[]>([]);
const loading = ref(false);
const error = ref('');
const condition = ref('');
const hasOptions = computed(() => listedComponentIds(props.product).length > 0);
let requestToken = 0;
async function load() {
    const token = ++requestToken;
    products.value = [];
    error.value = '';
    loading.value = false;
    const request = listedOptionsRequest(props.product, contextStore.defaultSettings, contextStore.selectedProductProperties, globalProductRecommendationFilters, condition.value);
    if (!request || !contextStore.isConfigured.value) return;
    loading.value = true;
    try {
        const response = await contextStore.getSearcher().searchProducts(request);
        contextStore.assertApiCall(response);
        if (token === requestToken) products.value = response?.results ?? [];
    } catch {
        if (token === requestToken) error.value = 'We could not load the listed options. Try again.';
    } finally {
        if (token === requestToken) loading.value = false;
    }
}
watch(() => props.product.productId, () => { condition.value = ''; });
watch(() => [props.product, condition.value, contextStore.activeContextRevision.value], load, { immediate: true });
</script>

<template>
  <section
    v-if="hasOptions"
    class="mb-16"
    aria-labelledby="listed-options-heading"
  >
    <div class="flex flex-wrap justify-between items-end gap-5">
      <div class="max-w-2xl">
        <h2
          id="listed-options-heading"
          class="text-3xl font-semibold"
        >
          Listed options for this server
        </h2>
        <p class="mt-3 text-slate-700">
          These products appear in Renewtech’s component list for this server. Check your chassis and selected options before ordering.
        </p>
      </div>
      <label class="flex flex-col gap-2 text-sm font-medium">
        Condition
        <select
          v-model="condition"
          class="border border-slate-400 rounded-lg p-3 bg-white text-slate-900"
        >
          <option value="">All conditions</option>
          <option value="Refurbished">Refurbished</option>
          <option value="Factory Sealed">Factory sealed</option>
          <option value="New Bulk">New bulk</option>
          <option value="New Open Box">New open box</option>
          <option value="New Spare">New spare</option>
        </select>
      </label>
    </div>
    <p
      v-if="loading"
      role="status"
      class="mt-8"
    >
      Loading listed options…
    </p>
    <div
      v-else-if="error"
      role="alert"
      class="mt-8"
    >
      <p>{{ error }}</p><button
        class="mt-3"
        @click="load"
      >
        Try again
      </button>
    </div>
    <div
      v-else-if="products.length"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"
    >
      <ProductTile
        v-for="option in products"
        :key="option.productId ?? undefined"
        :product="option"
      />
    </div>
    <p
      v-else
      class="mt-8 text-slate-700"
    >
      No listed options match this condition and your current availability filters. Try another condition.
    </p>
    <p class="mt-5 text-sm text-slate-600">
      Showing up to 12 options from the demo catalogue.
    </p>
  </section>
</template>
