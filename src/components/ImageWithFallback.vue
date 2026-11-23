<template>
  <img
    v-if="source"
    :key="source"
    :src="source"
    :alt="alt"
    :class="imageClass"
    @error="markSourceFailed"
  >
  <PhotoIcon
    v-else
    :class="placeholderClass"
  />
</template>

<script setup lang="ts">
import { PhotoIcon } from '@heroicons/vue/24/outline';
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    src?: string | null;
    fallback?: string;
    alt: string;
    imageClass?: string;
    placeholderClass?: string;
}>(), {
    src: '',
    fallback: '',
    imageClass: '',
    placeholderClass: '',
});

const failedSources = ref<string[]>([]);
const source = computed(() => [props.src?.trim(), props.fallback.trim()]
    .find(url => url && !failedSources.value.includes(url)));

// A reused card must try the new product's image and fallback even after a previous load failed.
watch([() => props.src, () => props.fallback], () => {
    failedSources.value = [];
});

function markSourceFailed(event: Event) {
    const failedSource = (event.currentTarget as HTMLImageElement).getAttribute('src');
    if (failedSource && failedSource === source.value) {
        failedSources.value = [...failedSources.value, failedSource];
    }
}
</script>
