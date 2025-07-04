<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import type { ProductSearchResponse, ProductResult, VariantResult } from '@relewise/client';
import Image from './Image.vue';

const props = defineProps({
    productResult: { type: Object as PropType<ProductSearchResponse>, required: true },
});

const router = useRouter();

const groupedProducts = computed(() => {
    const result = props.productResult;
    const groups: Record<string, ProductResult & { Variants: VariantResult[] }> = {};

    result.results?.forEach(product => {
        if (!product.productId) return;

        if (!groups[product.productId]) {
            groups[product.productId] = { ...product, Variants: [] };
        } 

        if (product.variant) {
            groups[product.productId].Variants.push(product.variant);
        }
    });

    return groups;
});

function goToProductOrVariant(product: ProductResult, variant: VariantResult | null) {
    if (variant) {
        router.push({ name: 'variant', params: { id: product.productId, variant: variant.variantId } });
    } else {
        router.push({ name: 'product', params: { id: product.productId } });
    }
}
</script>

<template>
    <div v-for="(product, index) in groupedProducts"
         :key="product.productId ?? index"
         class="p-2 lg:p-4 rounded shadow mb-4">
        <h3 class="lg:text-lg font-semibold flex justify-between items-center mb-2">
            <RouterLink :to="{ name: 'product', params: { id: product.productId } }" class="text-slate-900 hover:!text-blue-500">
                <span v-html="product.displayName"></span>
            </RouterLink>
            <span class="text-sm text-gray-500 ml-4">
                {{ product.brand?.displayName }}
            </span>
        </h3>

        <div class="lg:grid lg:grid-cols-12 items-center lg:px-3 lg:h-10 bg-gray-100 text-gray-700 uppercase text-xs lg:text-sm font-semibold border-t border-b border-gray-200">
            <div class="hidden lg:block col-span-1">
                Image
            </div>
            <div class="hidden lg:block col-span-5">
                {{ product.Variants.length > 0 ? 'Variant name' : 'Product name' }}
            </div>
            <div class="hidden lg:block col-span-2">
                Availability
            </div>
            <div class="hidden lg:block col-span-2">
                Price
            </div>
            <div class="hidden lg:block col-span-2">
                Price incl. VAT
            </div>
        </div>

        <div v-for="(variant, vIndex) in product.Variants.length > 0 ? product.Variants : [null]"
             :key="variant?.variantId ?? index"
             class="lg:grid lg:grid-cols-12 text-sm gap-2 py-2 px-2 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition items-center"
             :class="vIndex % 2 === 1 ? 'bg-gray-100': ''"
             tabindex="0"
             @click="goToProductOrVariant(product, variant)">
            <div class="hidden lg:block col-span-1">
                <div class="w-fit">
                    <Image :entity="variant ?? product" class="w-12 h-12"/>
                </div>
            </div>
            <div class="col-span-5 flex lg:block w-full">
                <span class="lg:hidden font-semibold shrink-0 grow-0 basis-1/3 w-1/3 max-w-1/3 inline-block align-top">
                    {{ product.Variants.length > 0 ? 'Variant name' : 'Product name' }}:
                </span>
                <span class="truncate block flex-1 min-w-0">
                    {{ variant?.displayName || product.displayName }}
                </span>
            </div>
            <hr class="lg:hidden">
            <div class="col-span-2 flex lg:block w-full">
                <span class="lg:hidden font-semibold inline-block w-1/3">Availability: </span>
                <span v-if="(product.data 
                          && product.data.SoldOut 
                          && product.data.SoldOut.value !== 'true'
                          || (variant
                              && variant.data
                              && variant.data.SoldOut 
                              && variant.data.SoldOut.value !== 'true'
                          ))"
                      class="text-green-600">In stock</span>
                <span v-else class="text-red-600">Sold Out</span>
            </div>
            <hr class="lg:hidden">
            <div class="col-span-2 font-semibold flex lg:block w-full">
                <span class="lg:hidden inline-block w-1/3">Price: </span>
                <span v-if="variant?.listPrice ?? product.listPrice" class="text-slate-900">
                    {{ $format(variant?.listPrice ?? product.listPrice) }}
                </span>
            </div>
            <hr class="lg:hidden">
            <div class="col-span-2 font-semibold flex lg:block w-full">
                <span class="lg:hidden inline-block w-1/3">Price incl. VAT: </span>
                <span v-if="variant?.salesPrice ?? product.salesPrice" class="text-slate-900">
                    {{ $format(variant?.salesPrice ?? product.salesPrice) }}
                </span>
            </div>
        </div>
    </div>
</template>