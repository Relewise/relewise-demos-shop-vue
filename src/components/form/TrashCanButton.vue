<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
    :class="sizeClasses"
    v-bind="attrs"
  >
    <TrashIcon
      class="shrink-0"
      :class="iconClasses"
    />
  </button>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline';
import { computed, useAttrs } from 'vue';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<{
    size?: 'extrasmall' | 'small' | 'base';
}>(), {
    size: 'small',
});

const attrs = useAttrs();

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'extrasmall':
            return 'h-8 w-8';
        case 'base':
            return 'h-11 w-11';
        default:
            return 'h-10 w-10';
    }
});

const iconClasses = computed(() => {
    switch (props.size) {
        case 'extrasmall':
            return 'h-4 w-4';
        case 'base':
            return 'h-5.5 w-5.5';
        default:
            return 'h-5 w-5';
    }
});
</script>
