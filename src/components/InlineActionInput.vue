<template>
  <div>
    <label class="block text-sm text-slate-700">{{ label }}</label>
    <div class="mt-1 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
      <input
        v-model="internalValue"
        type="text"
        :placeholder="placeholder"
        class="!mt-0 !border-0 !bg-transparent !px-0 !py-0 !text-slate-900 !shadow-none placeholder:!text-slate-400 focus:!ring-0"
        @blur="$emit('blur')"
      >
      <button
        type="button"
        class="shrink-0 !bg-transparent !px-0 !py-0 text-sm font-semibold !text-slate-600 !shadow-none transition hover:!text-slate-900"
        @mousedown.prevent.stop
        @click.prevent.stop="handleAction"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
    actionLabel: string;
    actionPrefix?: string;
    label: string;
    modelValue: string;
    placeholder: string;
}>();

const emit = defineEmits<{
    action: [];
    blur: [];
    'update:modelValue': [value: string];
}>();

const internalValue = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value),
});

function handleAction() {
    if (props.actionPrefix) {
        emit('update:modelValue', `${props.actionPrefix}${generateRandomIdSegment()}`);
    }

    emit('action');
}

function generateRandomIdSegment() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(8));

    return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('');
}
</script>
