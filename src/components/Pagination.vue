<template>
  <div
    v-if="pageCount > 1"
    class="flex items-center gap-2"
  >
    <button
      v-if="modelValue > 1"
      class="item"
      @click="selectPage(modelValue - 1)"
    >
      <ChevronLeftIcon class="h-4 w-4 mr-2" /> Previous
    </button>

    <button
      v-if="modelValue < pageCount"
      class="item"
      @click="selectPage(modelValue + 1)"
    >
      Next <ChevronRightIcon class="h-4 w-4 ml-2" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid';
import { useOffsetPagination } from '@vueuse/core';
import { toRefs, ref, watch } from 'vue';

const props = defineProps({ 
    pageSize: { 
        type: Number, 
        required: true,
    },
    total: { 
        type: Number, 
        required: true,
    },
    modelValue: {
        type: Number, 
        required: true,
    },
});
const { pageSize, total, modelValue } = toRefs(props);
const emit = defineEmits(['update:modelValue']);

const pageSizeRef = ref(pageSize.value);
const totalRef = ref(total.value);
const currentPage = ref(modelValue.value);

// Watch for external prop changes
watch(pageSize, (val) => (pageSizeRef.value = val));
watch(total, (val) => (totalRef.value = val));
watch(modelValue, (val) => {
    if (val !== currentPage.value) currentPage.value = val;
});

const { pageCount } = useOffsetPagination({
    total: totalRef,
    page: currentPage,
    pageSize: pageSizeRef,
});

function selectPage(page: number) {
    currentPage.value = page;
    if (page !== modelValue.value) {
        emit('update:modelValue', page);
    }
}
</script>

<style scoped lang="scss">
.item {
    align-items: center;
    background-color: #0f172a;
    border-radius: 0.25rem;
    color: #fff;
    cursor: pointer;
    display: inline-flex;
    font-weight: 600;
    height: 2.5rem;
    justify-content: center;
    padding-inline: 0.75rem;
    width: 12rem;

    &:hover {
        background-color: #1e293b;
    }

    &:disabled {
        opacity: 0.5;
        pointer-events: none;
    }

    &:disabled.active {
        background-color: #91AAF0;
        color: #16399F;
        opacity: 1;
        pointer-events: none;
    }
}
</style>
