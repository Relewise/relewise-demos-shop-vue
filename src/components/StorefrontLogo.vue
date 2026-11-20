<template>
  <img
    :key="source"
    :src="source"
    :alt="logoUrl && !failed ? 'Storefront logo' : fallbackAlt"
    :class="imageClass"
    referrerpolicy="no-referrer"
    @error="failed = true"
  >
  <slot
    v-if="logoUrl && failed"
    name="error"
  />
</template>

<script setup lang="ts">
import { defaultShopLogo } from '@/helpers/datasetBranding';
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    logoUrl?: string;
    fallbackSrc?: string;
    fallbackAlt?: string;
    imageClass: string;
}>(), {
    fallbackSrc: defaultShopLogo,
    fallbackAlt: 'Demo Shop',
});

const failed = ref(false);
const source = computed(() => failed.value ? props.fallbackSrc : (props.logoUrl ?? props.fallbackSrc));

// Retry when a different logo is selected, even if the previous image failed.
watch(() => props.logoUrl, () => { failed.value = false; });
</script>
