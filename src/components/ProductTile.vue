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
                class="relative rounded flex flex-col overflow-hidden py-3 bg-white text-slate-900 hover:!text-brand-500 transition duration-200">
        <div class="relative mx-3 flex h-max-[275px] overflow-hidden justify-center">
            <ProductImage :product="product"/>
            <div class="absolute top-0 left-0 flex gap-1">
                <Popover v-if="isPromotion" placement="bottom-start" class="rounded bg-brand-200 px-2 py-0.5 text-center text-xs font-medium text-white flex items-center gap-1">
                    <span @click="(e) => e.preventDefault()">SPONSORED</span>
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
                    class="rounded bg-black px-2 py-0.5 text-center text-xs font-medium text-white">
                    ON SALE
                </span>
                <span
                    v-if="product.data && product.data.SoldOut && product.data.SoldOut.value === true"
                    class="rounded bg-black px-2 py-0.5 text-center text-xs font-medium text-white">
                    SOLD OUT
                </span>
            </div>
        </div>
        <div class="mt-3 px-3">
            <div class="text-left">
                <span v-if="product.brand" class="text-sm text-slate-500">{{ product.brand.displayName }}</span>
                <h5 class="tracking-tight font-semibold leading-tight overflow-hidden text-ellipsis h-10">
                    {{ product.displayName }}
                </h5>
            </div>
            <div class="mt-2 flex items-center justify-between">
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