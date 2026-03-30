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
