<template>
  <div class="flex flex-wrap mb-4 mt-4 gap-2">
    <template
      v-for="variant in selectableArticles"
      :key="variant.variantId ?? ''"
    >
      <RouterLink :to="{ name: 'variant', params: { id: product.productId, variant: variant.variantId } }">
        <div
          :class="[
            selectedVariantId === variant.variantId ? 'underline--yellow' : ''
          ]"
        >
          <div class="pb-2">
            <span class="block text-sm">{{ variant.displayName ?? variant.variantId }}</span>
            <Image
              :entity="variant"
              class="!h-[50px] xl:!h-[100px] !w-auto"
            />
          </div>
        </div>
      </RouterLink>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { ProductResult } from '@relewise/client';
import Image from '../components/Image.vue';
import contextStore from '@/stores/context.store';
import { eligibleArticle, languageMarkets } from '@/helpers/variantOwnedData';
import { computed, toRefs, type PropType } from 'vue';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
    selectedVariantId: { type: String, required: false },
});

const { product, selectedVariantId } = toRefs(props);
const selectableArticles = computed(() => {
    const variants = product.value.allVariants ?? product.value.filteredVariants ?? [];
    if (!contextStore.context.value.variantOwnedData) return variants;
    return variants.filter(variant => eligibleArticle(variant, languageMarkets[contextStore.language.value] ?? '', contextStore.user.value.classifications?.channel));
});

</script>
