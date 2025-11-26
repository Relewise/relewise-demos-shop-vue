<template>
    <div class="container mx-auto">
        <h1 class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block">Your Favorites</h1>

        <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3" v-if="results">
            <ProductTile v-for="(product, index) in results.results" :key="index" :product="product"></ProductTile>
        </div>

        <div class="py-3 flex justify-center mt-10" v-if="results">
            <Pagination v-model.sync="page" v-model:total="results.hits" :page-size="40" />
        </div>

        <div v-if="userIsAnonymous(contextStore.user.value)">
            <p>Engagement tracking works only when the user is identified.</p>
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