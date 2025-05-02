<template>
    <div class="image-container">
        <img v-if="!error"
             class="object-cover"
             :src="image"
             alt="product image"
             @error="error = true">
        <PhotoIcon v-else class="h-full w-full text-slate-300"/>
    </div>
</template>

<script setup lang="ts">
import { PhotoIcon } from '@heroicons/vue/24/outline';
import type { ContentResult, ProductResult } from '@relewise/client';
import { ref, toRefs, type PropType } from 'vue';
import { findImage } from '@/helpers/imageHelper';
import { computed } from 'vue';

const props = defineProps({
    entity: { type: Object as PropType<ProductResult | ContentResult>, required: true },
});

const image = computed(() => {
    return findImage(product.value);
});

const { entity: product } = toRefs(props);
const error = ref(false);
</script>
<style lang="css" scoped>
.image-container {
    display: flex;
    overflow: hidden;
    position: relative;
    justify-content: center;
    width: 100%;
}

.image-container:after {
    background-image: radial-gradient(ellipse, #bcb6b300, hsla(20, 6%, 72%, .125) 70%);
    bottom: 0;
    content: "";
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
}
</style>