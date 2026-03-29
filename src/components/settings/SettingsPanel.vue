<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <h2 class="text-2xl font-semibold text-slate-900">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="mt-2 text-sm text-slate-600"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="shrink-0"
      >
        <slot name="actions" />
      </div>
    </div>

    <div :class="contentClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    title: string;
    description?: string;
    contentClass?: string;
}>(), {
    description: '',
    contentClass: 'mt-8',
});
</script>
