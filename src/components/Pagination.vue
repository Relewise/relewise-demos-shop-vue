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
import { toRefs, computed, ref, watch } from 'vue';

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

const totalRef = computed(() => total.value);
const pageSizeRef = computed(() => pageSize.value);

const currentPage = ref(modelValue.value);

watch(modelValue, (val) => {
    if (val !== currentPage.value) currentPage.value = val;
});

const {
    pageCount,
} = useOffsetPagination({
    total: totalRef,
    page: currentPage,
    pageSize: pageSizeRef,
    onPageChange: (p) => selectPage(p.currentPage),
});

const emit = defineEmits(['update:modelValue', 'change']);
function selectPage(page: number) {
    emit('update:modelValue', page);
    emit('change', page);
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