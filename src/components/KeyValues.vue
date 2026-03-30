<template>
  <div>
    <label class="block text-sm text-slate-700">{{ title }}</label>
    <div class="mt-3 flex flex-col gap-3">
      <div
        v-for="(row, index) in rows"
        :key="row.id"
        class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <InputText
          v-model="row.key"
          placeholder="Key"
          :aria-label="`${title} key`"
          @input="handleRowInput"
        />
        <InputText
          v-model="row.value"
          placeholder="Value"
          :aria-label="`${title} value`"
          @input="handleRowInput"
        />
        <TrashCanButton
          class="self-start"
          title="Remove row"
          aria-label="Remove row"
          :disabled="!canRemoveRow(index)"
          @click="remove(index)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputText from '@/components/form/InputText.vue';
import TrashCanButton from '@/components/form/TrashCanButton.vue';
import { ref, type PropType, watch } from 'vue';

export type KeyValue = {
    key: string;
    value: string | null;
}

type EditableKeyValue = KeyValue & {
    id: string;
}

const props = defineProps({
    modelValue: { type: Object as PropType<KeyValue[]>, required: true },
    title: { type: String, required: true },
});
const emit = defineEmits(['update:modelValue']);
const rows = ref<EditableKeyValue[]>([]);

watch(
    () => props.modelValue,
    (nextValue) => {
        const nextRows = toEditableRows(nextValue);
        if (serializeModelValue(nextRows) !== serializeModelValue(rows.value)) {
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

function createEmptyRow(): EditableKeyValue {
    return {
        id: crypto.randomUUID(),
        key: '',
        value: '',
    };
}

function toEditableRows(items: KeyValue[]) {
    const populatedRows = items
        .filter((item) => isPopulated(item))
        .map((item) => ({
            id: crypto.randomUUID(),
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

function isPopulated(row: KeyValue | EditableKeyValue | undefined) {
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
    if (serializeModelValue(emittedValue) !== serializeModelValue(props.modelValue)) {
        emit('update:modelValue', emittedValue);
    }
}

function serializeModelValue(items: Array<KeyValue | EditableKeyValue>) {
    return JSON.stringify(items.map((item) => ({
        key: item.key,
        value: item.value ?? '',
    })));
}
</script>
