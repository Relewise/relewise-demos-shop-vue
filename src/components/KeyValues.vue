<template>
  <div>
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
          @input="handleRowInput"
        >
        <input
          v-model="row.value"
          type="text"
          placeholder="Value"
          @input="handleRowInput"
        >
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center self-start rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Remove row"
          :disabled="!canRemoveRow(index)"
          @click="remove(index)"
        >
          <TrashIcon
            class="shrink-0"
            style="width: 1.25rem; height: 1.25rem;"
          />
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
        const nextRows = toEditableRows(nextValue);
        if (serializeRows(nextRows) !== serializeRows(rows.value)) {
            rows.value = nextRows;
        }
    },
    { immediate: true, deep: true },
);

function reconcileRows() {
    for (let index = rows.value.length - 2; index >= 0; index -= 1) {
        if (!isPopulated(rows.value[index])) {
            rows.value.splice(index, 1);
        }
    }

    if (rows.value.length === 0) {
        rows.value.push(createEmptyRow());
        return;
    }

    const lastRow = rows.value[rows.value.length - 1];
    if (isPopulated(lastRow)) {
        rows.value.push(createEmptyRow());
    }
}

function createEmptyRow(): KeyValue {
    return {
        key: '',
        value: '',
    };
}

function toEditableRows(items: KeyValue[]) {
    const populatedRows = items
        .filter((item) => isPopulated(item))
        .map((item) => ({
            key: item.key ?? '',
            value: item.value ?? '',
        }));

    return [...populatedRows, createEmptyRow()];
}

function remove(index: number) {
    rows.value.splice(index, 1);
    if (rows.value.length === 0) {
        rows.value.push(createEmptyRow());
    }

    syncRows();
}

function canRemoveRow(index: number) {
    return isPopulated(rows.value[index]);
}

function isPopulated(row: KeyValue | undefined) {
    return Boolean(row?.key?.trim() || row?.value?.trim());
}

function toModelValue(items: KeyValue[]) {
    return items
        .filter((item) => isPopulated(item))
        .map((item) => ({
            key: item.key,
            value: item.value ?? '',
        }));
}

function handleRowInput() {
    syncRows();
}

function syncRows() {
    reconcileRows();

    const emittedValue = toModelValue(rows.value);
    if (serializeRows(emittedValue) !== serializeRows(props.modelValue)) {
        emit('update:modelValue', emittedValue);
    }
}

function serializeRows(items: KeyValue[]) {
    return JSON.stringify(items);
}
</script>
