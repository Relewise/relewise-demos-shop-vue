<template>
    <div>
        <div v-if="product" class="mb-10">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="product"/>
            <div class="flex gap3">
                <div class="relative flex h-[275px] overflow-hidden">
                    <ProductImage :product="product" />
                    <span v-if="product.salesPrice !== product.listPrice"
                        class="absolute top-0 left-0 m-2 rounded-full bg-black px-2 text-center text-sm font-medium text-white">ON
                        SALE</span>
                </div>

                <div class="bg-white py-4 px-6 rounded flex-grow">
                    <div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ product.displayName }}
                        </h1>
                        <div>
                            <span class="text-zinc-500">Product ID:</span> {{ product.productId }}
                        </div>

                        <div v-if="product.brand">
                            <span class="text-zinc-500">Brand:</span>  {{ product.brand.displayName }}
                        </div>

                        <div v-if="stockLevelExists">
                            <span class="text-zinc-500">No in stock:</span> {{ stockLevelValue }}
                        </div>

                        <div v-if="product.data && product.data.Description && product.data.Description.value">
                            <span class="text-zinc-600">{{ product.data.Description.value }}</span> 
                        </div>
                    </div>

                    <div class="mt-6">
                        <div class="mb-2 flex gap-2">
                            <span v-if="product.salesPrice !== product.listPrice" class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">ON SALE</span>

                            <span
                                v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === true"
                                class="rounded-full bg-black px-2 text-center text-sm font-medium text-white">
                                SOLD OUT
                            </span>
                        </div>

                        <p>
                            <span class="text-zinc-900 ">
                                {{ product.data?.Description.value }}
                            </span>
                        </p>
                    </div>

                    <div class="mt-2 flex items-center justify-between">
                        <p>
                            <span class="text-lg font-semibold text-zinc-900 mr-1 leading-none">{{
                                $format(product.salesPrice) }}</span>
                            <span v-if="product.salesPrice !== product.listPrice" class="text-zinc-900 line-through">
                                {{ $format(product.listPrice) }}
                            </span>
                        </p>
                    </div>

                    <div class="text-left mt-3">
                        <button @click="addToBasket">
                            Add to cart
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="product!.data && product!.data.soldOut && product!.data.soldOut.value == 'true'">
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
            <div class="mb-10">
                <div class="text-2xl mb-2 font-semibold">
                    Purchased with the product
                </div>
                <relewise-purchased-with-product
                    :key="productId" 
                    class="grid grid-cols-2 lg:grid-cols-5"
                    number-of-recommendations="5" 
                    :displayed-at-location="defaultSettings.displayedAtLocation" 
                    :product-id="productId"/>
            </div>
            <div class="">
                <div class="text-2xl mb-2 font-semibold">
                    Products viewed after viewing the product
                </div>
                <relewise-products-viewed-after-viewing-product
                    :key="productId" 
                    class="grid grid-cols-2 lg:grid-cols-5"
                    number-of-recommendations="5" 
                    :displayed-at-location="defaultSettings.displayedAtLocation" 
                    :product-id="productId"/>
            </div>
        </relewise-product-recommendation-batcher>
        </div>

    </div>
</template>

<script lang="ts" setup>
import basketService from '@/services/basket.service';
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { type ProductRecommendationResponse, ProductSearchBuilder, SimilarProductsProductBuilder, type CategoryNameAndIdResult, type ProductResult } from '@relewise/client';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ProductImage from '../components/ProductImage.vue';
import { context } from '@relewise/web-components';
import ProductTile from '../components/ProductTile.vue';
import { addAssortmentFilters, addCartFilter } from '@/stores/customFilters';
import Breadcrumb from '../components/Breadcrumb.vue';

const productId = ref<string>('');
const product = ref<ProductResult | null | undefined>(null);
const route = useRoute();
const similarProds = ref<ProductRecommendationResponse | null | undefined>(null);

const defaultSettings = ref(contextStore.defaultSettings);
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();

var stockLevelExists: boolean = false;
var stockLevelValue: number = 0;


async function init() {
    const id = route.params.id;
    // Computed properties for stock level


    if (id && !Array.isArray(id)) {
        productId.value = id;

        trackingService.trackProductView(id);

        const request = new ProductSearchBuilder(contextStore.defaultSettings)
            .setSelectedProductProperties(contextStore.selectedProductProperties)
            .setSelectedVariantProperties({ allData: true, displayName: true })
            .setExplodedVariants(1)
            .filters(f => f.addProductIdFilter([id]))
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        product.value = (await searcher.searchProducts(request))?.results![0];

        stockLevelExists = product.value?.data?.stockLevel?.value !== undefined;
        stockLevelValue = product.value?.data?.stockLevel?.value ?? 0;

        console.log(`stockLevelValue: ${stockLevelExists}`)

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
        // const similarproductsRequest = new SimilarProductsProductBuilder(contextStore.defaultSettings)
        //     .product({ productId: productId.value })
        //     .setSelectedProductProperties(contextStore.selectedProductProperties)
        //     .filters(
        //         f => {
        //             addAssortmentFilters(f);
        //             addCartFilter(f);
        //             f.addProductCategoryIdFilter("ImmediateParentOrItsParent", product.value?.categoryPaths[0].pathFromRoot[1].id as string);
        //         }
        //     )
        //     .build();
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
}


</script>