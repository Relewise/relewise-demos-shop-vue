<script setup lang="ts">
import type { ProductResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import ProductImage from './ProductImage.vue';
import Popover from '@/components/Popover.vue';
import { ExclamationCircleIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
    isPromotion: { type: Boolean, required: false, default: false },
});

const { product } = toRefs(props);

</script>

<template>
    <RouterLink :to="{ name: 'product', params: { id: product.productId } }"
                class="relative flex flex-col overflow-hidden bg-white text-slate-900 hover:!text-brand-500 transition duration-200">
        <div class="relative flex h-max-[275px] overflow-hidden justify-center">
            <ProductImage :product="product"/>
            <div class="absolute top-0 left-0 flex gap-1">
                <Popover v-if="isPromotion" placement="bottom-start" class="bg-brand-200 px-2 py-0.5 text-center text-xs font-medium text-white flex items-center gap-1 rounded m-3">
                    <span @click="(e) => e.preventDefault()">PROMOTED</span>
                    <ExclamationCircleIcon class="w-5 h-5" @click="(e) => e.preventDefault()"/>
    
                    <template #content>
                        <div class="w-96">
                            <div class="flex flex-col">
                                <div class="font-semibold px-2 bg-gray-100 py-2">
                                    Retail Media
                                </div>
                                <hr class="p-0 my-0">
                                <div class="p-2">
                                    This product is highlighted by our supplier as it could be relevant or interesting for you.
                                </div>
                            </div>
                        </div>
                    </template>
                </Popover>

                <span
                    v-if="product.salesPrice !== product.listPrice && product.listPrice !== null && product.listPrice !== undefined"
                    class="rounded bg-red-200 px-2 py-0.5 text-center text-xs font-medium text-red-900 m-3">
                    ON SALE
                </span>
                <span
                    v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === 'true'"
                    class="rounded bg-black px-2 py-0.5 text-center text-xs font-medium text-white  m-3">
                    SOLD OUT
                </span>
                <span
                    v-if="product.variant"
                    class="rounded bg-black px-2 py-0.5 text-center text-xs font-medium text-white  m-3">
                    VARIANTS AVAILABLE
                </span>
            </div>
        </div>
        <div class="mt-2">
            <div class="text-left">
                <span v-if="product.brand" class="text-sm text-slate-500">{{ product.brand.displayName }}</span>
                <h5 class="tracking-tight text-lg font-semibold leading-tight line-clamp-2 h-12">
                    {{ product.data?.long_description.value }}
                </h5>
                <h1>{{ product.productId }}</h1>
                <!-- <div v-if="product.variant" class="text-sm text-zinc-500">
                    <div>Color: {{ product.variant.data?.Color.value }}</div>
                    <div>Material: {{ product.variant.data?.Material.value }}</div>
                </div> -->
            </div>
            <div class="my-2 flex items-center justify-between">
                <p>
                    <span class="text-lg font-semibold text-slate-900 mr-1 leading-none">{{ $format(product.salesPrice)
                    }}</span>
                    <span
                        v-if="product.salesPrice !== product.listPrice && product.listPrice !== null && product.listPrice !== undefined"
                        class="text-slate-900 line-through">
                        {{ $format(product.listPrice) }}
                    </span>
                </p>
            </div>
        </div>
    </RouterLink>
</template>