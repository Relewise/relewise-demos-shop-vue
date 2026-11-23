<template>
  <div class="image-container">
    <ImageWithFallback
      :src="image"
      :fallback="placeholder"
      :alt="'displayName' in entity ? entity.displayName ?? '' : ''"
      image-class="object-cover w-full"
      placeholder-class="h-full w-full text-slate-300"
    />
  </div>
</template>

<script setup lang="ts">
import ImageWithFallback from '@/components/ImageWithFallback.vue';
import type { CategoryResult, ContentResult, ProductResult, VariantResult } from '@relewise/client';
import { findImage, findTermMatchedVariantImage } from '@/helpers/imageHelper';
import contextStore from '@/stores/context.store';
import { computed } from 'vue';

const props = defineProps<{
    entity: ProductResult | ContentResult | CategoryResult | VariantResult;
}>();

const image = computed(() => {
    const { entity } = props;
    if ('variantResolution' in entity) {
        const variantResolutionImage = findTermMatchedVariantImage(entity);
        if (variantResolutionImage) {
            return variantResolutionImage;
        }
    }

    return findImage(entity);
});

const placeholder = computed(() => {
    const dataset = contextStore.context.value;
    if ('categoryId' in props.entity) {
        return dataset.categoryPlaceholderImageUrl;
    }
    if ('productId' in props.entity || 'variantId' in props.entity) {
        return dataset.productPlaceholderImageUrl;
    }
    return undefined;
});
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
