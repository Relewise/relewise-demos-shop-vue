<template>
  <div>
    <label class="block text-sm">{{ label }}</label>
    <div class="mt-1 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-100 px-4 py-2.5 shadow-sm focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200">
      <input
        v-model="internalValue"
        type="text"
        :placeholder="placeholder"
        class="!mt-0 !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
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
