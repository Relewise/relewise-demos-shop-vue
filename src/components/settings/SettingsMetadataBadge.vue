<template>
  <span
    class="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
    :class="variant === 'identifier' ? 'font-mono text-slate-700' : ''"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    variant?: 'default' | 'identifier';
}>(), {
    variant: 'default',
});
</script>
