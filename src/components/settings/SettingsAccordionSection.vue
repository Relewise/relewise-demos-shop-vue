<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-left transition hover:bg-slate-100"
      @click="$emit('toggle')"
    >
      <div class="flex min-w-0 items-center gap-4">
        <h2 class="text-2xl font-semibold text-slate-900">
          {{ title }}
        </h2>
        <slot name="badge" />
      </div>
      <ChevronDownIcon
        class="h-5 w-5 text-slate-500 transition"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="open"
      class="px-6 py-6"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline';

defineProps<{
    title: string;
    open: boolean;
}>();

defineEmits<{
    toggle: [];
}>();
</script>
