<template>
  <div>
    <label class="text-sm block mt-6">{{ label }}</label>

    <div
      v-if="internalItems.length > 0"
      class="mt-3 space-y-2"
    >
      <div
        v-for="item in internalItems"
        :key="item"
        class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span class="truncate text-sm font-medium text-slate-900">{{ item }}</span>
          <span
            v-if="singleItem === item"
            class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
          >
            Active
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="singleItem !== item"
            type="button"
            class="outline !px-3"
            @click="setActiveItem(item)"
          >
            Use
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            :title="`Remove ${item}`"
            @click="removeItem(item)"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <p
      v-else
      class="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500"
    >
      No {{ label.toLowerCase() }} added yet.
    </p>

    <div class="mt-3 flex gap-2">
      <input
        v-model="newItem"
        type="text"
        :placeholder="newItemPlaceholder"
        @keydown.enter.prevent="addItem"
      >
      <button
        class="outline"
        @click="addItem"
      >
        Add
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { TrashIcon } from '@heroicons/vue/24/outline';
import { computed, ref, toRefs, type PropType } from 'vue';

const props = defineProps({
    label: { type: String, required: true },
    items: { type: Array as PropType<string[]>, default: () => [] },
    singleItem: { type: String, default: '' },
    newItemPlaceholder: { type: String, required: true },
});

const { singleItem, items } = toRefs(props);
const newItem = ref('');

const emit = defineEmits(['update:singleItem', 'update:items']);

const internalItems = computed({
    get: () => normalizeItems(items.value ?? []),
    set: (value: string[]) => emit('update:items', normalizeItems(value)),
});

function addItem() {
    const trimmedValue = newItem.value.trim();
    if (!trimmedValue) {
        return;
    }

    if (internalItems.value.includes(trimmedValue)) {
        newItem.value = '';
        return;
    }

    internalItems.value = [...internalItems.value, trimmedValue];
    if (!singleItem.value) {
        emit('update:singleItem', trimmedValue);
    }
    newItem.value = '';
}

function removeItem(item: string) {
    const nextItems = internalItems.value.filter((existingItem) => existingItem !== item);
    internalItems.value = nextItems;

    if (singleItem.value === item) {
        emit('update:singleItem', nextItems[0] ?? '');
    }
}

function setActiveItem(item: string) {
    emit('update:singleItem', item);
}

function normalizeItems(items: string[]) {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
</script>
