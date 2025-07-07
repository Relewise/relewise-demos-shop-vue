<template>
    <div v-if="pageCount > 1" class="flex items-center gap-2">
        <button v-if="modelValue > 1" class="item" @click="selectPage(modelValue - 1)">
            <ChevronLeftIcon class="h-4 w-4 mr-2"/> Previous
        </button>

        <button v-if="modelValue < pageCount" class="item" @click="selectPage(modelValue + 1)">
            Next <ChevronRightIcon class="h-4 w-4 ml-2"/>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid';
import { useOffsetPagination } from '@vueuse/core';
import { toRefs, ref } from 'vue';

const props = defineProps({
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
    modelValue: { type: Number, required: true },
});

const { pageSize, total, modelValue } = toRefs(props);
const emit = defineEmits(['update:modelValue']);

const pageSizeRef = ref(pageSize.value);
const totalRef = ref(total.value);
const currentPage = ref(modelValue.value);

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
  @apply px-3 h-10 inline-flex items-center rounded cursor-pointer text-white font-semibold bg-slate-900 hover:bg-slate-800 w-48 justify-center;

  &:disabled {
    @apply opacity-50 pointer-events-none;
    &.active {
      @apply bg-brand-200 text-brand-800 pointer-events-none opacity-100;
    }
  }
}
</style>
