<template>
  <div>
    <label
      v-if="label"
      class="block text-sm text-slate-700"
      :for="id"
    >
      {{ label }}
    </label>

    <input
      :id="id"
      ref="inputField"
      :value="modelValue"
      :type="type"
      :name="name"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="label ? 'mt-1' : ''"
      v-bind="attrs"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >

    <p
      v-if="help"
      class="mt-2 text-sm text-slate-600"
    >
      {{ help }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, useAttrs } from 'vue';

defineOptions({
    inheritAttrs: false,
});

withDefaults(defineProps<{
    modelValue: string | number | null | undefined;
    label?: string;
    help?: string;
    id?: string;
    name?: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
}>(), {
    label: '',
    help: '',
    id: '',
    name: '',
    placeholder: '',
    type: 'text',
    disabled: false,
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const inputField = ref<HTMLInputElement | null>(null);
const attrs = useAttrs();

defineExpose({
    inputField,
});
</script>
