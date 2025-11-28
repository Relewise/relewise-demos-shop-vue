<template>
  <div class="container mx-auto">
    <h1 class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block">Your Favorites</h1>

    <template v-if="results">
      <div v-if="results.hits === 0" class="mt-6">
        <p class="text-lg font-semibold">No favorites yet</p>
        <p>Add products to your favorites to see them listed here. See documentation about <a target="_blank" href="https://docs.relewise.com/docs/tracking/user-engagement.html#user-engagement">user engagement.</a></p>
      </div>

      <template v-else>
        <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-3">
          <ProductTile v-for="(product, index) in results.results" :key="index" :product="product" />
        </div>

        <div class="py-3 flex justify-center mt-10">
          <Pagination v-model.sync="page" v-model:total="results.hits" :page-size="40" />
        </div>
      </template>
    </template>

    <div v-if="userIsAnonymous(contextStore.user.value)">
      <p>This feature requires a non-anonymous user. See documentation about <a target="_blank" href="https://docs.relewise.com/docs/tracking/user-engagement.html#user-engagement">user engagement</a></p>
    </div>
  </div>
</template>


<script setup lang="ts">
import ProductTile from '@/components/ProductTile.vue';
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, userIsAnonymous, type ProductSearchResponse } from '@relewise/client';
import { onMounted, ref, watch } from 'vue';
import Pagination from '@/components/Pagination.vue';

const results = ref<ProductSearchResponse>();
const page = ref(1);

onMounted(async () => {
    // If the user is anonymous, do not attempt to load favorites as they won't have any.
    if (userIsAnonymous(contextStore.user.value)) {
        results.value = undefined;
        return;
    }

    await search();
});

async function search() {
    const builder = new ProductSearchBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setExplodedVariants(1)
        .pagination(p => p.setPage(page.value).setPageSize(40))
        .filters(f => f.addProductEngagementFilter({ isFavorite: true }));

    const searcher = await contextStore.getSearcher();

    results.value = (await searcher.searchProducts(builder.build()));
}

watch(page, async () => {
    await search();
});
</script>
