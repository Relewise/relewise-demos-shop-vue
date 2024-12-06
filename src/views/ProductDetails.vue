<template>
    <div id="product-page" class="container mx-auto px-2 lg:p-0">
        <div v-if="product" class="mb-16">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="product" />

            <div class="flex flex-wrap xl:flex-nowrap gap-8 xl:gap-20 mt-3">
                <div class="relative flex overflow-hidden w-full xl:w-1/2 justify-center">
                    <ProductImage :product="product" :variantId="variantId" class="!h-[300px] xl:!h-[600px] !w-auto" />
                </div>

                <div class="bg-white flex-grow">
                    <div>
                        <div v-if="product.brand">
                            <span class="text-slate-600 mb-4 text-lg">{{ product.brand.displayName }}</span>
                        </div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ product.displayName }}
                        </h1>

                        <div v-if="product.data && product.data.description && product.data.description.value">
                            <p class="text-slate-600 line-clamp-3">
                                {{ product.data.description.value }}
                            </p>
                        </div>
                    </div>

                    <div class="mt-6">
                        <div class="mb-2 flex gap-2">
                            <span v-if="product.salesPrice !== product.listPrice"
                                class="rounded-full bg-red-200 px-2 text-center text-sm font-medium text-red-900">ON
                                SALE</span>

                            <span v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === 'true'"
                                class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">
                                SOLD OUT
                            </span>
                        </div>

                        <div>
                            <h3 class="text-2xl font-semibold text-slate-900 leading-none inline-block">
                                {{ $format(product.salesPrice) }}
                            </h3>
                            <span v-if="product.salesPrice !== product.listPrice"
                                class="text-slate-900 line-through ml-4">
                                {{ $format(product.listPrice) }}
                            </span>
                        </div>
                    </div>

                    <div class="text-left mt-5">
                        <button class="w-full text-lg bg-slate-900 transition-transform duration-300 hover:bg-slate-700"
                            :class="buttonClass" @click="addToBasket">
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
                            <template v-for="[key, value] in details" :key="key">
                                <dt v-if="key.includes('_StockLevel')">
                                    {{ key.replace(/.*_StockLevel/, 'StockLevel') }}
                                </dt>
                                <dt v-else>
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

        <div>
            <template v-if="product?.filteredVariants?.length">
                <div class="my-3">
                    <div class="text-2xl font-semibold">
                        Showing {{ Math.min(product.filteredVariants.length, 10) }} of {{
                            product.filteredVariants.length }} variants
                    </div>
                    <table class="w-full mt-4 border-t border-gray-200 text-left text-sm">
                        <thead class="bg-gray-50 text-gray-700 uppercase">
                            <tr>
                                <th class="py-2 px-3">Image</th>
                                <th class="py-2 px-3">Product name</th>
                                <th class="py-2 px-3">Variant Id</th>
                                <th class="py-2 px-3">Availability</th>
                                <th class="py-2 px-3">Price</th>
                                <th class="py-2 px-3">Price incl. VAT</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(variant, index) in product.filteredVariants.slice(0, 10)" :key="index" class="border-b border-gray-200">
                                <td class="py-2 px-3">
                                    <img :src="variant.data?.Image?.value" alt="Variant Image"
                                        class="w-12 h-12 object-contain" />
                                </td>
                                <td class="py-2 px-3">
                                    {{ variant.displayName }}
                                </td>
                                <router-link :to="{ path: $route.path, query: { variantId: variant.variantId } }" class="text-blue-600 underline">
                                        {{ variant.variantId }}
                                    </router-link>
                                <td class="py-2 px-3 text-green-600">
                                    In stock
                                </td>
                                <td class="py-2 px-3 font-semibold">
                                    EUR {{variant.listPrice??product.listPrice}}
                                </td>
                                <td class="py-2 px-3 font-semibold">
                                    EUR {{variant.salesPrice??product.salesPrice}}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>


            </template>
        </div>

        <div v-if="product!.data && product!.data.SoldOut && product!.data.SoldOut.value == 'true'">
            <div class="my-3">
                <div class="text-2xl font-semibold">
                    Sold out....consider an alternative
                </div>
                <div class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <ProductTile v-for="(product, index) in similarProds?.recommendations" :key="index"
                        :product="product" />
                </div>
            </div>
        </div>
        <div v-else>
            <relewise-product-recommendation-batcher>
                <div class="mb-16 scrollbar">
                    <h2 class="text-2xl mb-2 font-semibold">
                        Purchased with the product
                    </h2>
                    <div class="w-full overflow-x-scroll">
                        <relewise-purchased-with-product :key="productId" class="flex flex-row gap-3"
                            number-of-recommendations="8" :displayed-at-location="defaultSettings.displayedAtLocation"
                            :product-id="productId" />
                    </div>
                </div>
                <div class="scrollbar">
                    <h2 class="text-2xl mb-2 font-semibold">
                        Products viewed after viewing the product
                    </h2>
                    <div class="w-full overflow-x-scroll">
                        <relewise-products-viewed-after-viewing-product :key="productId" class="flex flex-row gap-3"
                            number-of-recommendations="8" :displayed-at-location="defaultSettings.displayedAtLocation"
                            :product-id="productId" />
                    </div>
                </div>
            </relewise-product-recommendation-batcher>
        </div>
    </div>
</template>

<script lang="ts" setup>
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, SimilarProductsProductBuilder, type CategoryNameAndIdResult, type ProductRecommendationResponse, type ProductResult } from '@relewise/client';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ProductImage from '../components/ProductImage.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import { addAssortmentFilters, addCartFilter } from '@/stores/customFilters';
import ProductTile from '../components/ProductTile.vue';

const productId = ref<string>('');
const product = ref<ProductResult | null | undefined>(null);
const route = useRoute();
const buttonClass = ref('');
const defaultSettings = ref(contextStore.defaultSettings);
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();
const similarProds = ref<ProductRecommendationResponse | null | undefined>(null);
const languageCode = contextStore.defaultSettings.language;
const dynamicKey = `${languageCode}_StockLevel`;
const variantId = computed(() => route.query.variantId?.toString() ?? '');

const details = computed(() => {
    if (!product.value) return [];

    return Object.entries(product.value.data ?? {})
        .filter((x) =>
            x[1].type.indexOf('Object') === -1 &&
            ['Description', 'Margin', 'ImportedAt', 'Serie', 'FeedIntegrationVersion', 'InStock', 'OnSale', 'AvailableInChannels', 'AvailableInMarkets', dynamicKey].includes(x[0]));
});

async function init() {
    const id = route.params.id;
    if (id && !Array.isArray(id)) {
        productId.value = id;

        trackingService.trackProductView(id);

        const request = new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedPdPProductProperties)
            .setSelectedVariantProperties(contextStore.selectedVariantProperties)
            .filters(f => f.addProductIdFilter([id]))
            .pagination(p => p.setPageSize(1))
            .build();
        request.custom = { "Debug_TraceMerchandising": "true" };

        const searcher = contextStore.getSearcher();

        product.value = (await searcher.searchProducts(request))?.results![0];

        const similarproductsRequest = new SimilarProductsProductBuilder(contextStore.defaultSettings)
            .product({ productId: productId.value })
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .filters(f => {
                // Safely add assortment and cart filters
                addAssortmentFilters(f);
                addCartFilter(f);

                // Safely access the category ID
                const categoryId = product.value?.categoryPaths?.[0]?.pathFromRoot?.[1]?.id;
                if (!categoryId || typeof categoryId !== 'string') {
                    throw new Error("Category ID is missing or not a valid string");
                }

                // Add the product category filter
                f.addProductCategoryIdFilter("ImmediateParentOrItsParent", categoryId);
            })
            .build();
        similarproductsRequest.custom = { "Debug_TraceMerchandising": "true" };

        similarproductsRequest.settings.numberOfRecommendations = 4;

        const recommender = contextStore.getRecommender();
        similarProds.value = await recommender.recommendSimilarProducts(similarproductsRequest);

        if (product.value?.categoryPaths) {
            // Taking the first path on the product to render the breadcrumb
            breadcrumb.value = product.value?.categoryPaths[0].pathFromRoot ?? [];
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
}
</style>