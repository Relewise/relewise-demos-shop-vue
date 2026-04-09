<template>
  <div>
    <label class="block text-sm text-slate-700">{{ label }}</label>

    <div class="mt-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-for="item in normalizedItems"
          :key="item"
          class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
        >
          <span>{{ item }}</span>
          <button
            type="button"
            class="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm !bg-transparent !px-0 !py-0 !text-slate-400 !shadow-none transition hover:!bg-slate-200 hover:!text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
            :title="`Remove ${item}`"
            :aria-label="`Remove ${item}`"
            :disabled="normalizedItems.length <= minItems"
            @click="removeItem(item)"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              class="h-3 w-3"
              aria-hidden="true"
            >
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </span>

        <input
          v-model="newItem"
          type="text"
          :placeholder="placeholder"
          class="h-7 min-w-[7rem] flex-1 !border-0 !bg-transparent !px-0 !py-0 text-sm text-slate-900 !shadow-none placeholder:text-slate-400 focus:!ring-0"
          @keydown.enter.prevent="addItem"
          @keydown.backspace="handleBackspace"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
    items: string[];
    label: string;
    minItems?: number;
    placeholder: string;
    uppercase?: boolean;
}>(), {
    minItems: 1,
    uppercase: false,
});

const emit = defineEmits<{
    'update:items': [value: string[]];
}>();

const newItem = ref('');

const normalizedItems = computed(() => {
    return normalizeItems(props.items ?? []);
});

function addItem() {
    const value = normalizeValue(newItem.value);
    if (!value || normalizedItems.value.some((item) => isSameValue(item, value))) {
        newItem.value = '';
        return;
    }

    emit('update:items', [...normalizedItems.value, value]);
    newItem.value = '';
}

function removeItem(item: string) {
    if (normalizedItems.value.length <= props.minItems) {
        return;
    }

    emit('update:items', normalizedItems.value.filter((existingItem) => existingItem !== item));
}

function handleBackspace(event: KeyboardEvent) {
    if (newItem.value || normalizedItems.value.length <= props.minItems) {
        return;
    }

    event.preventDefault();
    emit('update:items', normalizedItems.value.slice(0, -1));
}

function normalizeItems(items: string[]) {
    const normalized: string[] = [];

    for (const item of items) {
        const value = normalizeValue(item);
        if (!value || normalized.some((existingItem) => isSameValue(existingItem, value))) {
            continue;
        }

        normalized.push(value);
    }

    return normalized;
}

function normalizeValue(value: string) {
    const trimmedValue = value.trim();
    return props.uppercase ? trimmedValue.toUpperCase() : trimmedValue;
}

function isSameValue(left: string, right: string) {
    return left.toLowerCase() === right.toLowerCase();
}
</script>
