<template>
    <div class="flex flex-wrap mb-4 mt-4 gap-2">
        <template v-for="variant in product.allVariants" :key="variant.variantId ?? ''">
            <RouterLink :to="{ name: 'variant', params: { id: product.productId, variant: variant.variantId } }">
                <div :class="[
                    selectedVariantId === variant.variantId ? 'underline--yellow' : ''
                ]">
                    <div class="pb-2">
                        <Image :entity="variant" class="!h-[50px] xl:!h-[100px] !w-auto" />
                    </div>
                </div>
            </RouterLink>
        </template>
    </div>
</template>

<script lang="ts" setup>
import type { ProductResult } from '@relewise/client';
import Image from '../components/Image.vue';
import { toRefs, type PropType } from 'vue';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
    selectedVariantId: { type: String, required: false },
});

const { product, selectedVariantId } = toRefs(props);

</script>