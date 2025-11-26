<template>
    <div id="product-page" class="container entity-page mx-auto px-2 lg:p-0">
        <div v-if="product" class="mb-16">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="product"/>

            <div class="flex flex-wrap xl:flex-nowrap gap-8 xl:gap-20 mt-3">
                <div class="relative flex overflow-hidden w-full xl:w-1/2 justify-center items-center">
                    <Image :entity="product" class="!h-[300px] xl:!h-[600px] !w-auto"/>
                </div>

                <div class="bg-white w-full xl:w-1/2 relative">
                    <div>
                        <div v-if="product.brand">
                            <RouterLink
                                :to="{ path: '/', query: { term: '', sort: '', brand: product.brand.id, open: '1', brandName: product.brand.displayName, }, }"
                                class="text-slate-600 mb-4 text-lg inline-block hover:underline">
                                {{ product.brand.displayName }}
                            </RouterLink>
                        </div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ product.displayName }}
                        </h1>

                        <div v-if="product.data && ((product.data.description && product.data.description.value) || (product.data.Description && product.data.Description.value))">
                            <p class="text-slate-600 line-clamp-3">
                                {{ product.data.description?.value ?? product.data.Description?.value }}
                            </p> 
                        </div>

                        <div class="absolute top-0 right-0 m-3">
                            <product-favorite-button :product="product" />
                        </div>
                    </div>
                    <div v-if="product.allVariants">
                        <ProductVariants :product="product" :selected-variant-id="variantId ?? undefined"/>
                    </div>
                    <div class="mt-6">
                        <div class="mb-2 flex gap-2">
                            <span v-if="product.salesPrice !== product.listPrice" class="rounded-full bg-red-200 px-2 text-center text-sm font-medium text-red-900">ON SALE</span>

                            <span
                                v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === 'true'"
                                class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">
                                SOLD OUT
                            </span>
                        </div>

                        <div>
                            <h3 class="text-2xl font-semibold text-slate-900 leading-none inline-block">
                                {{ $format(product.salesPrice) }}
                            </h3>
                            <span v-if="product.salesPrice !== product.listPrice" class="text-slate-900 line-through ml-4">
                                {{ $format(product.listPrice) }}
                            </span>
                        </div>
                    </div>

                    <div class="text-left mt-5">
                        <button class="w-full text-lg bg-slate-900 transition-transform duration-300 hover:bg-slate-700" :class="buttonClass" @click="addToBasket">
                            Add to cart
                        </button>
                    </div>

                    <div class="mt-5">
                        <h3 class="text-2xl inline-block">
                            Details
                        </h3>
                        <dl class="mt-2 border border-solid border-slate-100 border-b-0">
                            <dt>Product Id</dt>
                            <dd>{{ product.productId }}</dd>
                            <template v-if="product.brand">
                                <dt>Brand</dt>
                                <dd>
                                <RouterLink
                                    :to="{ path: '/', query: { term: '', sort: '', brand: product.brand.id, open: '1', brandName: product.brand.displayName } }"
                                    class="text-black hover:underline"
                                >
                                    {{ product.brand.displayName }}
                                </RouterLink>
                                </dd>
                            </template>
                            <template v-for="[ key, value ] in details" :key="key">
                                <dt>
                                    {{ key }}
                                </dt>
                                <dd class="break-all">
                                    <template v-if="value && value.value.$values">
                                        {{ value.value.$values.join(', ') }}
                                    </template>
                                    <template v-else>
                                        {{ value.value }}
                                    </template>
                                </dd>
                            </template>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="product?.data 
            && product.data.SoldOut
            && product.data.SoldOut.value === 'true' 
            && contextStore.context.value.similarProductsOnPdp">
            <SimilarProductsRecommendation :product="product"/>
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
                        :variant-id="variantId"/>
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
                        :variant-id="variantId"/>
                </div>
            </div>
        </relewise-product-recommendation-batcher>
    </div>
</template>

<script lang="ts" setup>
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { DataValueFactory, ProductSearchBuilder, type CategoryNameAndIdResult, type ProductResult } from '@relewise/client';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Image from '../components/Image.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import ProductVariants from '../components/ProductVariants.vue';
import SimilarProductsRecommendation from '../components/SimilarProductsRecommendation.vue';

const productId = ref<string>('');
const variantId = ref<string | null>(null);
const product = ref<ProductResult|null|undefined>(null);
const route = useRoute();
const buttonClass = ref('');
const defaultSettings = ref(contextStore.defaultSettings);
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();

const details = computed(() => {
    if (!product.value) return [];

    const productDetails = Object.entries(product.value.data ?? {})
        .filter((x) => 
            x[1].type.indexOf('Object') === -1 && 
            ['Margin', 'ImportedAt', 'Serie', 'FeedIntegrationVersion', 'InStock', 'OnSale', 'AvailableInChannels', 'AvailableInMarkets', `${contextStore.context.value.language}_StockLevel`].includes(x[0]));

    var variantColor = product.value.variant?.data?.Color;
    if (variantColor) {
        productDetails.push(['Color', variantColor]);
    }
    
    var variantMaterial = product.value.variant?.data?.Material;
    if (variantMaterial) {
        productDetails.push(['Material', variantMaterial]);
    }

    return productDetails; 
});

async function init() {
    const id = route.params.id;
    const variantIdFromRoute = route.params.variant;

    if (id && !Array.isArray(id)) {
        productId.value = id;

        if (variantIdFromRoute && !Array.isArray(variantIdFromRoute)) {
            variantId.value = variantIdFromRoute;
        }

        trackingService.trackProductView(id, variantId.value ?? undefined);

        const request = new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({allData: true, displayName: true})
            .setExplodedVariants(1)
            .filters(f => {
                f.addProductIdFilter([id]);

                if (variantId.value) {
                    f.addVariantIdFilter(variantId.value);
                }

                contextStore.userClassificationBasedFilters(f);
            })
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        product.value = (await searcher.searchProducts(request))?.results![0];
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

<style lang="scss" scoped>

dl {
  display: grid;
  grid-template-columns: max-content auto;
}

dt {
  grid-column-start: 1;
  @apply bg-gray-100 px-4 py-2 border-b border-solid border-gray-100 font-medium capitalize;
}

dd {
  grid-column-start: 2;
  @apply p-2 border-b border-solid border-gray-100 pl-2;
}</style>