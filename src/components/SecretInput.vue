<template>
  <div class="mt-1 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-100 px-4 py-2.5 shadow-sm focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200">
    <input
      :value="modelValue"
      type="text"
      class="lp-ignore-field !mt-0 !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
      :class="isVisible ? '' : 'masked-secret'"
      :name="name"
      :placeholder="placeholder"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      data-form-type="other"
      data-lpignore="true"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <button
      type="button"
      class="shrink-0 !bg-transparent !px-0 !py-0 text-sm font-semibold !text-slate-600 !shadow-none transition hover:!text-slate-900"
      :aria-label="isVisible ? hideLabel : showLabel"
      @click="isVisible = !isVisible"
    >
      {{ isVisible ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    modelValue: string;
    name?: string;
    placeholder?: string;
    revealOnChangeKey?: string | number | null;
    showLabel?: string;
    hideLabel?: string;
}>(), {
    name: '',
    placeholder: '',
    revealOnChangeKey: null,
    showLabel: 'Show value',
    hideLabel: 'Hide value',
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const isVisible = ref(false);

watch(
    () => props.revealOnChangeKey,
    () => {
        isVisible.value = false;
    },
);
</script>

<style scoped>
.masked-secret {
    -webkit-text-security: disc;
    text-security: disc;
}
</style>
