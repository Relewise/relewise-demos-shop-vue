<template>
  <div class="container mx-auto p-2 xl:p-0">
    <Breadcrumb :items="[{ name: 'Campaign', route: { name: 'campaign', params: { campaignID: campaignId } } }]" />

    <div class="my-6">
      <h1 class="text-xl lg:text-4xl font-semibold underline--yellow inline-block">
        {{ campaignName }}
      </h1>

      <p
        v-if="campaignId"
        class="mt-2"
      >
        Active campaign:
        <code class="rounded bg-slate-100 px-2 py-1 text-sm">{{ campaignId }}</code>
      </p>
    </div>

    <div
      v-if="!campaignId"
      class="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900"
    >
      Add a <code>campaignID</code> path parameter to load this campaign, for example
      <RouterLink
        class="font-semibold underline"
        :to="{ name: 'campaign', params: { campaignID: 'summer-sale' } }"
      >
        /landing/summer-sale
      </RouterLink>.
    </div>

    <div
      v-else-if="loading"
      class="py-12 text-center text-slate-600"
    >
      Loading campaign products...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded border border-red-300 bg-red-50 p-4 text-red-900"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="results">
      <p class="mb-3 text-sm text-slate-600">
        {{ results.hits }} products
      </p>

      <div
        v-if="results.results?.length"
        class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        <ProductTile
          v-for="product in results.results"
          :key="product.productId ?? product.rank"
          :product="product"
        />
      </div>

      <p
        v-else
        class="rounded bg-slate-50 p-4 text-slate-600"
      >
        No products were returned for this campaign context.
      </p>

      <div class="py-3 flex justify-center mt-10">
        <Pagination
          v-model="page"
          :total="results.hits"
          :page-size="pageSize"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '@/components/Breadcrumb.vue';
import Pagination from '@/components/Pagination.vue';
import ProductTile from '@/components/ProductTile.vue';
import { applyVariantRequestSettings } from '@/helpers/productSearchRequest';
import { withContextValues } from '@/helpers/requestContext';
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, type ProductSearchResponse } from '@relewise/client';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const contextKey = 'CampaignID';
const pageSize = 40;
const route = useRoute();
const page = ref(1);
const results = ref<ProductSearchResponse>();
const loading = ref(false);
const errorMessage = ref('');

const campaignId = computed(() => {
  const value = route.params.campaignID;
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
});

const campaignName = computed(() => campaignId.value
  .split('-')
  .filter(Boolean)
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' '));

async function search() {
  if (!campaignId.value) {
    results.value = undefined;
    errorMessage.value = '';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const builder = applyVariantRequestSettings(new ProductSearchBuilder(contextStore.defaultSettings)
      .setSelectedProductProperties(contextStore.selectedProductProperties)
      .setSelectedVariantProperties({ allData: true })
      .pagination(pagination => pagination
        .setPage(page.value)
        .setPageSize(pageSize))
      .filters(filters => contextStore.userClassificationBasedFilters(filters)), contextStore.context.value);

    const request = withContextValues(builder.build(), {
      [contextKey]: campaignId.value,
    });
    const response = await contextStore.getSearcher().searchProducts(request);

    if (!response) {
      throw new Error('The product search returned no response.');
    }

    contextStore.assertApiCall(response);
    results.value = response;
  }
  catch {
    results.value = undefined;
    errorMessage.value = 'The campaign products could not be loaded.';
  }
  finally {
    loading.value = false;
  }
}

watch(campaignId, async() => {
  if (page.value !== 1) {
    page.value = 1;
    return;
  }

  await search();
}, { immediate: true });

watch(page, search);
</script>
