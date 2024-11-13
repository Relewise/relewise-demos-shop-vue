<template>
    <img v-if="!error"
         class="object-cover"
         :src="image"
         alt="product image"
         @error="error=true">
    <PhotoIcon v-else class="h-full w-full text-slate-300"/>
</template>

<script setup lang="ts">
import { PhotoIcon } from '@heroicons/vue/24/outline';
import type { ProductResult } from '@relewise/client';
import { ref, toRefs, type PropType } from 'vue';
import { findImage } from '@/helpers/imageHelper';
import { computed } from 'vue';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
});

const image = computed(() => {
    return findImage(product.value);
});

const { product } = toRefs(props);
const error = ref(false);
</script>