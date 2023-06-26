<script setup lang="ts">
import type { ProductResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import ProductImage from './ProductImage.vue';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
});

const { product } = toRefs(props);

</script>

<template>
    <RouterLink :to="{name: 'product', params: { id: product.productId }}" class="relative rounded flex flex-col overflow-hidden py-3 bg-white hover:bg-brand-50 transition duration-200">
        <div class="relative mx-3 flex h-[275px] overflow-hidden justify-center">
            <ProductImage :product="product"/>
            <span v-if="product.salesPrice !== product.listPrice" class="absolute top-0 left-0 m-2 rounded-full bg-black px-2 text-center text-sm font-medium text-white">ON SALE</span>
        </div>
        <div class="mt-3 px-3">
            <div class="text-left">
                <span v-if="product.brand" class="text-sm text-zinc-500">{{ product.brand.displayName }}</span>
                <h5 class="tracking-tight text-zinc-900 font-semibold leading-tight h-10">
                    {{ product.displayName }}
                </h5>
            </div>
            <div class="mt-2 flex items-center justify-between">
                <p>
                    <span class="text-lg font-semibold text-zinc-900 mr-1 leading-none">{{ $format(product.salesPrice) }}</span>
                    <span v-if="product.salesPrice !== product.listPrice" class="text-zinc-900 line-through">
                        {{ $format(product.listPrice) }}
                    </span>
                </p>
            </div>
        </div>
    </RouterLink>
</template>