<template>
  <section
    ref="rootElement"
    class="sticky top-3 z-30 rounded-2xl border p-6 transition-all duration-200"
    :class="pinned
      ? 'border-slate-300 bg-white/95 shadow-xl ring-1 ring-slate-200 backdrop-blur'
      : 'border-slate-200 bg-white shadow-sm'"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <slot name="content" />
      </div>
      <div class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <ul
      v-if="errors.length > 0"
      class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <li
        v-for="error in errors"
        :key="error"
      >
        {{ error }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const rootElement = defineModel<HTMLElement | null>('element');

defineProps<{
    pinned: boolean;
    errors: string[];
}>();
</script>
