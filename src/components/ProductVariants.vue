<template>
  <div class="my-4 space-y-4">
    <fieldset
      v-for="group in selection.groups"
      :key="group.key"
    >
      <legend class="mb-2 font-semibold text-slate-900">
        {{ dimensionLabel(group.key) }}
      </legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in group.options"
          :key="option.value"
          type="button"
          class="rounded-md border px-3 py-1.5 text-sm shadow-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:line-through"
          :class="option.value === group.selectedValue ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-900 enabled:hover:border-brand-600'"
          :aria-pressed="option.value === group.selectedValue"
          :disabled="!option.variantId"
          @click="selectVariant(option.variantId)"
        >
          {{ option.value }}
        </button>
      </div>
    </fieldset>

    <div
      v-if="linkedVariants.length"
      class="space-y-2"
    >
      <p
        v-if="selection.groups.length"
        class="text-sm font-semibold text-slate-900"
      >
        {{ selection.matchingVariants.length ? 'Choose a variant' : 'Other variants' }}
      </p>
      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-for="variant in linkedVariants"
          :key="variant.variantId"
          :to="variantRoute(variant.variantId)"
          :aria-label="variant.displayName || variant.variantId"
          :aria-current="selectedVariantId === variant.variantId ? 'true' : undefined"
          :class="selectedVariantId === variant.variantId ? 'underline--yellow' : ''"
        >
          <Image
            :entity="variant"
            class="mb-2 !h-[50px] !w-auto xl:!h-[100px]"
          />
          <span v-if="dimensionKeys.length">{{ variant.displayName || variant.variantId }}</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getVariantSelection } from '@/helpers/variantSelection';
import type { VariantResult } from '@relewise/client';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Image from './Image.vue';

const props = defineProps<{
    productId: string;
    variants: VariantResult[];
    dimensionKeys: string[];
    selectedVariantId?: string;
    language: string;
}>();

const router = useRouter();
const selection = computed(() => getVariantSelection(props.variants, props.dimensionKeys, props.selectedVariantId, props.language));
const linkedVariants = computed(() => [...selection.value.matchingVariants, ...selection.value.otherVariants]);

function variantRoute(variantId: string) {
    return { name: 'variant', params: { id: props.productId, variant: variantId } };
}

function selectVariant(variantId: string | undefined) {
    // The route drives the selected variant's details and preserves the selection for reload and back navigation.
    if (variantId && variantId !== props.selectedVariantId) void router.push(variantRoute(variantId));
}

function dimensionLabel(key: string) {
    // Format the heading for display while retaining the exact key for data lookups.
    const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}
</script>
