<template>
    <div v-if="pageCount > 1" class="flex items-center gap-2">
        <button :disabled="isFirstPage" class="item" @click="selectPage(currentPage - 1)">
            <ChevronLeftIcon class="h-5 w-3"/>
        </button>
        <button
            v-for="item in range"
            :key="item"
            :disabled="currentPage === item || typeof item !== 'number'"
            class="item"
            :class="{'active': modelValue == item}"
            @click="selectPage(Number(item))">
            {{ item }}
        </button>
        
        <button :disabled="isLastPage" class="item" @click="selectPage(currentPage + 1)">
            <ChevronRightIcon class="h-5 w-3"/>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import { useOffsetPagination } from '@vueuse/core';
import { toRefs, computed } from 'vue';
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
const {
    currentPage,
    pageCount,
    isFirstPage,
    isLastPage,
} = useOffsetPagination({
    total: total,
    page: modelValue,
    pageSize,
    onPageChange: (p) => selectPage(p.currentPage),
});
const getRange = (start: number, end: number) => {
    return Array(end - start + 1)
        .fill('')
        .map((v, i) => i + start);
};
// Logic borrowed from https://gist.github.com/kottenator/9d936eb3e4e3c3e02598
const range = computed(() => {
    let delta: number;
    if (pageCount.value <= 7) {
    // delta === 7: [1 2 3 4 5 6 7]
        delta = 7;
    } else {
    // delta === 2: [1 ... 4 5 6 ... 10]
    // delta === 4: [1 2 3 4 5 ... 10]
        delta = currentPage.value > 4 && currentPage.value < pageCount.value - 3 ? 2 : 4;
    }
    const range = {
        start: Math.round(currentPage.value - delta / 2),
        end: Math.round(currentPage.value + delta / 2),
    };
    if (range.start - 1 === 1 || range.end + 1 === pageCount.value) {
        range.start += 1;
        range.end += 1;
    }
    let pages: (string|number)[] = currentPage.value > delta
        ? getRange(Math.min(range.start, pageCount.value - delta), Math.min(range.end, pageCount.value))
        : getRange(1, Math.min(pageCount.value, delta + 1));
    const withDots = (value: number, pair: (string|number)[]) => (pages.length + 1 !== pageCount.value ? pair : [value]);
    if (pages[0] !== 1) {
        pages = withDots(1, [1, '...']).concat(pages);
    }
    if (Number(pages[pages.length - 1]) < pageCount.value) {
        pages = pages.concat(withDots(pageCount.value, ['...', pageCount.value]));
    }
    return pages;
});
const emit = defineEmits(['update:modelValue', 'change']);
function selectPage(page: number) {
    emit('update:modelValue', page);
    emit('change', page);
}
</script>

<style scoped lang="scss">
.item {
    @apply px-3 h-10 inline-flex items-center rounded cursor-pointer text-slate-800 font-semibold bg-white hover:bg-slate-200;

    &:disabled {
        @apply opacity-50 pointer-events-none;
        &.active {
            @apply bg-brand-200 text-brand-800 pointer-events-none opacity-100;
        }        
    }
}
</style>