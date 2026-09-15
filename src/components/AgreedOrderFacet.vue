<template>
  <label class="flex items-center cursor-pointer w-full">
    <input
      class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
      type="checkbox"
      value="true"
      :checked="selected"
      @click="applyFacet"
    >
    Has agreed order
    <span class="flex-grow" />
    <span>{{ hits }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    hits: { type: Number, required: true },
});

const emit = defineEmits<{
    (e: 'search', payload: { name: string; value: string; handlefilters: boolean }): void
}>();

const selected = computed(() => {
    const value = props.filters.agreedOrder;
    return value === 'true' || (Array.isArray(value) && value.includes('true'));
});

function applyFacet() {
    emit('search', { name: 'agreedOrder', value: 'true', handlefilters: true });
}
</script>
