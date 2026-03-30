<template>
  <Teleport to="#modal">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      @click.self="cancelAction"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div class="space-y-3">
          <h3 class="text-3xl text-slate-900">
            {{ title }}
          </h3>
          <p
            v-if="description"
            class="text-sm text-slate-600"
          >
            {{ description }}
          </p>
          <slot name="content" />
        </div>

        <div
          v-if="$slots.footer"
          class="mt-6"
        >
          <slot name="footer" />
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            class="!bg-white !text-slate-700 hover:!bg-slate-50"
            @click="cancelAction"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            :class="confirmTone === 'primary' ? '!bg-brand-500 hover:!bg-brand-600' : '!bg-red-600 hover:!bg-red-700'"
            @click="confirmAction"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

const props = withDefaults(defineProps<{
    modelValue: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmTone?: 'danger' | 'primary';
}>(), {
    description: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmTone: 'danger',
});

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirm: [];
    cancel: [];
}>();

function close() {
    emit('update:modelValue', false);
}

function cancelAction() {
    emit('cancel');
    close();
}

function confirmAction() {
    emit('confirm');
    close();
}

function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.modelValue) {
        cancelAction();
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEscape);
});
</script>
