<script setup lang="ts">
import { ref, watch } from 'vue';
import { ProductSearchBuilder, type ProductResult } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import { renewtechAnchors } from '@/helpers/renewtechDemo';
import ProductTile from '@/components/ProductTile.vue';

const products = ref<ProductResult[]>([]);
const loading = ref(false);
const error = ref('');
let requestToken = 0;
async function load() {
    const token = ++requestToken;
    products.value = [];
    error.value = '';
    loading.value = false;
    if (!contextStore.isConfigured.value) return;
    loading.value = true;
    try {
        const request = new ProductSearchBuilder({ ...contextStore.defaultSettings, displayedAtLocation: 'Renewtech - Server discovery' })
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .filters(f => { f.addProductIdFilter(renewtechAnchors); globalProductRecommendationFilters(f); })
            .pagination(p => p.setPageSize(3)).build();
        const response = await contextStore.getSearcher().searchProducts(request);
        contextStore.assertApiCall(response);
        if (token === requestToken) products.value = response?.results ?? [];
    } catch {
        if (token === requestToken) error.value = 'We could not load the servers. Try again.';
    } finally {
        if (token === requestToken) loading.value = false;
    }
}
watch(() => contextStore.activeContextRevision.value, load, { immediate: true });
</script>

<template>
  <main class="container mx-auto px-4 py-12 lg:py-16">
    <div class="max-w-3xl">
      <h1 class="text-4xl lg:text-5xl font-semibold text-slate-900">
        Find the part. Keep your systems running.
      </h1>
      <p class="mt-5 text-lg text-slate-700 max-w-2xl">
        Search by part number or model, or start with a server to explore its listed components.
      </p>
      <div class="flex flex-wrap gap-3 mt-7">
        <RouterLink
          :to="{ path: '/', query: { open: '1', term: '00FK930' } }"
          class="bg-brand-500 text-white rounded-lg px-5 py-3 hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Find part 00FK930
        </RouterLink>
        <RouterLink
          :to="{ path: '/', query: { open: '1', term: 'x3650 M5' } }"
          class="border border-slate-400 rounded-lg px-5 py-3 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Search a server model
        </RouterLink>
      </div>
    </div>
    <section
      class="mt-16"
      aria-labelledby="server-heading"
    >
      <h2
        id="server-heading"
        class="text-3xl font-semibold"
      >
        Start with your server
      </h2>
      <p class="mt-3 text-slate-700 max-w-2xl">
        Explore options listed in Renewtech’s product feed. Final fit depends on your selected configuration.
      </p>
      <p
        v-if="loading"
        role="status"
        class="mt-6"
      >
        Loading servers…
      </p>
      <div
        v-else-if="error"
        role="alert"
        class="mt-6"
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
        class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8"
      >
        <ProductTile
          v-for="product in products"
          :key="product.productId ?? undefined"
          :product="product"
        />
      </div>
      <p
        v-else
        class="mt-6 text-slate-700"
      >
        The featured servers are not available in this dataset or market. Import the Renewtech bundle and check the active language and currency in Settings.
      </p>
    </section>
    <section class="mt-16 border-t border-slate-200 pt-8">
      <h2 class="text-2xl font-semibold">
        Your market. Your catalogue.
      </h2>
      <p class="mt-3 text-slate-700 max-w-2xl">
        Use the context switcher to explore COM prices in EUR or DK prices in DKK. Product names follow the supplied feeds.
      </p>
    </section>
  </main>
</template>
