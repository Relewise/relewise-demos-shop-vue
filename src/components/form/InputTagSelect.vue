<template>
  <div class="relative">
    <label
      v-if="label"
      class="block text-sm text-slate-700"
    >
      {{ label }}
    </label>

    <div class="mt-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 shadow-xs transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-for="item in selectedItems"
          :key="item"
          class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
        >
          <span>{{ item }}</span>
          <button
            type="button"
            class="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm !bg-transparent !px-0 !py-0 !text-slate-400 !shadow-none transition hover:!bg-slate-200 hover:!text-slate-600"
            :title="`Remove ${item}`"
            :aria-label="`Remove ${item}`"
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
          ref="inputRef"
          v-model="query"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          class="h-7 min-w-[7rem] flex-1 !border-0 !bg-transparent !px-0 !py-0 text-sm text-slate-900 !shadow-none placeholder:text-slate-400 focus:!ring-0 disabled:cursor-not-allowed disabled:text-slate-400"
          @focus="isFocused = true"
          @blur="handleBlur"
          @keydown.enter.prevent="selectFirstFilteredOption"
          @keydown.backspace="handleBackspace"
          @keydown.esc.prevent="closeDropdown"
        >
      </div>
    </div>

    <div
      v-if="showDropdown"
      class="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-md border border-slate-300 bg-white py-2 shadow-xl"
    >
      <button
        v-for="option in filteredOptions"
        :key="option"
        type="button"
        class="flex w-full items-center justify-between bg-transparent px-4 py-2 text-left text-sm text-slate-700 shadow-none outline-hidden transition hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 focus:text-slate-900 focus:outline-hidden focus-visible:outline-hidden active:bg-slate-100"
        @mousedown.prevent="addItem(option)"
      >
        <span class="truncate">{{ option }}</span>
      </button>
    </div>

    <p
      v-if="help"
      class="mt-2 text-sm text-slate-600"
    >
      {{ help }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
    modelValue: string[];
    options: string[];
    label?: string;
    help?: string;
    placeholder?: string;
    disabled?: boolean;
}>(), {
    label: '',
    help: '',
    placeholder: '',
    disabled: false,
});

const emit = defineEmits<{
    'update:modelValue': [value: string[]];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);
const query = ref('');

const normalizedOptions = computed(() => normalizeValues(props.options ?? []));
const selectedItems = computed(() => normalizeValues(props.modelValue ?? []));
const filteredOptions = computed(() => {
    const normalizedQuery = query.value.trim().toLowerCase();

    return normalizedOptions.value.filter((option) => {
        if (selectedItems.value.includes(option)) {
            return false;
        }

        if (!normalizedQuery) {
            return true;
        }

        return option.toLowerCase().includes(normalizedQuery);
    });
});
const showDropdown = computed(() => isFocused.value && !props.disabled && filteredOptions.value.length > 0);

function addItem(option: string) {
    const normalizedOption = normalizedOptions.value.find((value) => value.toLowerCase() === option.toLowerCase());
    if (!normalizedOption || selectedItems.value.includes(normalizedOption)) {
        query.value = '';
        return;
    }

    emit('update:modelValue', [...selectedItems.value, normalizedOption]);
    query.value = '';
    inputRef.value?.focus();
}

function removeItem(option: string) {
    emit('update:modelValue', selectedItems.value.filter((value) => value !== option));
}

function selectFirstFilteredOption() {
    if (filteredOptions.value.length === 0) {
        return;
    }

    addItem(filteredOptions.value[0]);
}

function handleBackspace(event: KeyboardEvent) {
    if (query.value || selectedItems.value.length === 0) {
        return;
    }

    event.preventDefault();
    emit('update:modelValue', selectedItems.value.slice(0, -1));
}

function handleBlur() {
    window.setTimeout(() => {
        isFocused.value = false;
        query.value = '';
    }, 100);
}

function closeDropdown() {
    isFocused.value = false;
    query.value = '';
}

function normalizeValues(values: string[]) {
    const normalizedValues: string[] = [];

    for (const value of values) {
        const normalizedValue = value.trim();
        if (!normalizedValue || normalizedValues.some((existingValue) => existingValue.toLowerCase() === normalizedValue.toLowerCase())) {
            continue;
        }

        normalizedValues.push(normalizedValue);
    }

    return normalizedValues;
}
</script>
