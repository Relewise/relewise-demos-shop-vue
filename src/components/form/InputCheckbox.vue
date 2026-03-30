<template>
  <label class="flex items-start gap-3">
    <input
      :checked="modelValue"
      :disabled="disabled"
      type="checkbox"
      class="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 accent-brand-500"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >

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
