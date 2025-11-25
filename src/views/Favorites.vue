<template>
    <div class="container mx-auto">
        <h1 class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block">Your Favorites</h1>

        <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3" v-if="results">
            <ProductTile v-for="(product, index) in results" :key="index" :product="product"></ProductTile>
        </div>

        <div v-if="userIsAnonymous(contextStore.user.value)">
            <p>You need to be logged in or accept marketing cookies to see your favorite products.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import ProductTile from '@/components/ProductTile.vue';
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, userIsAnonymous, type ProductResult } from '@relewise/client';
import { onMounted, ref } from 'vue';

const results = ref<ProductResult[]>([]);

onMounted(async () => {
    // If the user is anonymous, do not attempt to load favorites as they won't have any.
    if (userIsAnonymous(contextStore.user.value)) {
        results.value = [];
        return;
    }

    const builder = new ProductSearchBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setExplodedVariants(1)
        .filters(f => f.addProductEngagementFilter({ isFavorite: true }));

    const searcher = await contextStore.getSearcher();

    results.value = (await searcher.searchProducts(builder.build()))?.results ?? [];
});
</script>