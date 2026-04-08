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
        />
        <InputText
          v-model="row.value"
          placeholder="Value"
          :aria-label="`${title} value`"
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
        if (rows.value.length > 0 && serializeModelValue(nextValue) === serializeModelValue(toModelValue(rows.value))) {
            return;
        }

        const nextRows = toEditableRows(nextValue, rows.value);
        if (serializeEditableRows(nextRows) !== serializeEditableRows(rows.value)) {
            rows.value = nextRows;
        }
    },
    { immediate: true, deep: true },
);

watch(
    rows,
    () => {
        syncRows();
    },
    { deep: true },
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

function toEditableRows(items: KeyValue[], existingRows: EditableKeyValue[] = []) {
    const populatedRows = items
        .filter((item) => isPopulated(item))
        .map((item, index) => ({
            id: existingRows[index]?.id ?? crypto.randomUUID(),
            key: item.key ?? '',
            value: item.value ?? '',
        }));

    const trailingRow = existingRows[populatedRows.length];
    return [
        ...populatedRows,
        trailingRow && !isPopulated(trailingRow) ? trailingRow : createEmptyRow(),
    ];
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

function isComplete(row: KeyValue | EditableKeyValue | undefined) {
    return Boolean(row?.key?.trim() && row?.value?.trim());
}

function toModelValue(items: KeyValue[]) {
    return items
        .filter((item) => isPopulated(item))
        .map((item) => ({
            key: item.key ?? '',
            value: item.value ?? '',
        }));
}

function syncRows() {
    const nextRows = normalizeEditableRows(rows.value);
    if (serializeEditableRows(nextRows) !== serializeEditableRows(rows.value)) {
        rows.value = nextRows;
        return;
    }

    const emittedValue = toModelValue(rows.value);
    if (serializeModelValue(emittedValue) !== serializeModelValue(props.modelValue)) {
        emit('update:modelValue', emittedValue);
    }
}

function normalizeEditableRows(items: EditableKeyValue[]) {
    const normalizedRows = items.filter((row, index) => isPopulated(row) || index === items.length - 1);

    if (normalizedRows.length === 0) {
        return [createEmptyRow()];
    }

    const lastRow = normalizedRows[normalizedRows.length - 1];
    if (isPopulated(lastRow)) {
        return [...normalizedRows, createEmptyRow()];
    }

    return normalizedRows;
}

function serializeModelValue(items: Array<KeyValue | EditableKeyValue>) {
    return JSON.stringify(items.map((item) => ({
        key: item.key,
        value: item.value ?? '',
    })));
}

function serializeEditableRows(items: EditableKeyValue[]) {
    return JSON.stringify(items.map((item) => ({
        id: item.id,
        key: item.key,
        value: item.value ?? '',
    })));
}
</script>
