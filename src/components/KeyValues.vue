<template>
  <label class="text-sm block mt-6">{{ title }}</label>
  <div class="flex flex-col gap-4">
    <div
      v-for="(value, index) in internalValue"
      :key="index"
      class="flex gap-4"
    >
      <input
        v-model="value.key"
        type="text"
        placeholder="Key"
      >
      <input
        v-model="value.value"
        type="text"
        placeholder="Value"
      >
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        title="Remove row"
        @click="remove(index)"
      >
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>
    <div>
      <button
        class="outline"
        @click="addKeyValue"
      >
        Add new
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline';
import { toRefs } from 'vue';
import { computed, type PropType } from 'vue';

export type KeyValue = {
    key: string;
    value: string | null;
}

const props = defineProps({
    modelValue: { type: Object as PropType<KeyValue[]>, required: true },
    title: { type: String, required: true },
});
const { modelValue } = toRefs(props);
const emit = defineEmits(['update:modelValue']);

const internalValue = computed({
    get: () => {
        return modelValue.value;
    },
    set: (v) => {
        emit('update:modelValue', v);
    },
});

function addKeyValue() {
    internalValue.value.push({ key: '', value: '' });
}

function remove(index: number) {
    internalValue.value.splice(index, 1);
}
</script>
