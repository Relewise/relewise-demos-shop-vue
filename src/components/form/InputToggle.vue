<template>
  <label class="flex items-start justify-between gap-4">
    <span class="min-w-0">
      <span
        v-if="label"
        class="block font-semibold text-slate-900"
      >
        {{ label }}
      </span>
      <span
        v-if="help"
        class="mt-1 block text-sm text-slate-600"
      >
        {{ help }}
      </span>
      <slot />
    </span>

    <span class="relative inline-flex shrink-0 items-center">
      <input
        :checked="modelValue"
        :disabled="disabled"
        type="checkbox"
        class="peer sr-only"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      >
      <span class="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-slate-900 peer-disabled:opacity-50" />
      <span class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 peer-disabled:opacity-50" />
    </span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    modelValue: boolean | undefined;
    label?: string;
    help?: string;
    disabled?: boolean;
}>(), {
    label: '',
    help: '',
    disabled: false,
});

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();
</script>
