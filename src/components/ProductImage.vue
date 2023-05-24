<template>
    <img v-if="!error"
         class="object-cover"
         :src="image"
         alt="product image"
         @error="error=true">
    <PhotoIcon v-else class="h-full w-full text-zinc-300"/>
</template>

<script setup lang="ts">
import type { DataValue, ProductResult } from '@relewise/client';
import { computed, toRefs, type PropType, ref } from 'vue';
import { PhotoIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
});

const { product } = toRefs(props);
const error = ref(false);
const image = computed(() => {

    return mapDataKey(product.value.data ?? {}) ??
        mapDataKey(product.value.variant?.data ?? {}) ??
        '';
});

function mapDataKey(data: Record<string, DataValue>) {
    for (const dataKey of Object.keys(data ?? {})) {

        if (dataKey.toLowerCase().includes('image')) {
            const value = data[dataKey];

            if (value.type === 'String') {
                return value.value;
            } else if (value.type === 'StringList') {
                return value.value.$values[0];
            }
        }
    }

    return null;
}
</script>