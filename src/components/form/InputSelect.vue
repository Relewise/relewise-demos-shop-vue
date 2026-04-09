<template>
  <div>
    <label
      v-if="label"
      class="block text-sm text-slate-700"
      :for="id"
    >
      {{ label }}
    </label>

    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      :class="label ? 'mt-1' : ''"
      v-bind="attrs"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>

    <p
      v-if="help"
      class="mt-2 text-sm text-slate-600"
    >
      {{ help }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({
  inheritAttrs: false,
});

withDefaults(defineProps<{
  modelValue: string | number | null | undefined;
  label?: string;
  help?: string;
  id?: string;
  disabled?: boolean;
}>(), {
  label: '',
  help: '',
  id: '',
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();
</script>

<style lang="css" scoped>
select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23374151' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 5px center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}
</style>
