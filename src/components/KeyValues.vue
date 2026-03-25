<template>
  <div class="mt-6">
    <label class="block text-sm">{{ title }}</label>
    <div class="mt-3 flex flex-col gap-3">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <input
          v-model="row.key"
          type="text"
          placeholder="Key"
        >
        <input
          v-model="row.value"
          type="text"
          placeholder="Value"
        >
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center self-start rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Remove row"
          :disabled="!canRemoveRow(index)"
          @click="remove(index)"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline';
import { ref, type PropType, watch } from 'vue';

export type KeyValue = {
    key: string;
    value: string | null;
}

const props = defineProps({
    modelValue: { type: Object as PropType<KeyValue[]>, required: true },
    title: { type: String, required: true },
});
const emit = defineEmits(['update:modelValue']);
const rows = ref<KeyValue[]>([]);

watch(
    () => props.modelValue,
    (nextValue) => {
        const nextRows = ensureTrailingEmpty(nextValue);
        if (serializeRows(nextRows) !== serializeRows(rows.value)) {
            rows.value = nextRows;
        }
    },
    { immediate: true, deep: true },
);

watch(
    rows,
    (nextRows) => {
        const normalizedRows = ensureTrailingEmpty(nextRows);
        if (serializeRows(normalizedRows) !== serializeRows(nextRows)) {
            rows.value = normalizedRows;
            return;
        }

        const emittedValue = toModelValue(normalizedRows);
        if (serializeRows(emittedValue) !== serializeRows(props.modelValue)) {
            emit('update:modelValue', emittedValue);
        }
    },
    { deep: true },
);

function remove(index: number) {
    rows.value.splice(index, 1);
}

function canRemoveRow(index: number) {
    const populatedRows = rows.value.filter((row) => isPopulated(row));
    return isPopulated(rows.value[index]) && populatedRows.length > 0;
}

function isPopulated(row: KeyValue | undefined) {
    return Boolean(row?.key?.trim() || row?.value?.trim());
}

function ensureTrailingEmpty(items: KeyValue[]) {
    const populatedRows = items
        .filter((item) => isPopulated(item))
        .map((item) => ({
            key: item.key ?? '',
            value: item.value ?? '',
        }));

    return [...populatedRows, { key: '', value: '' }];
}

function toModelValue(items: KeyValue[]) {
    return items
        .filter((item) => isPopulated(item))
        .map((item) => ({
            key: item.key,
            value: item.value ?? '',
        }));
}

function serializeRows(items: KeyValue[]) {
    return JSON.stringify(items);
}
</script>
