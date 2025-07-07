<template>
    <label class="flex">
        <span class="text-slate-600 mr-2">Sorting by</span>
        <select v-model="internalSelectedOption" class="!outline-0 m-0 shadow-none !border-0 bg-white font-medium !p-0 w-[175px]" @on="$attrs">
            <option value="">
                Relevance
            </option>
            <option value="Popular">
                Popular
            </option>
            <option v-if="type === 'Product'" value="SalesPriceDesc">
                Sales Price desc
            </option>
            <option v-if="type === 'Product'" value="SalesPriceAsc">
                Sales Price asc
            </option>
        </select>
    </label>
</template>

<script lang="ts" setup>
import { computed, toRefs, type PropType } from 'vue';

const props = defineProps({
    modelValue: { type: [String, Array] as PropType<string | string[]>, required: true },
    type: { type: String as PropType<'Content' | 'Product'>, required: true },
});

const { modelValue, type } = toRefs(props);

const emit = defineEmits(['update:modelValue']);

const internalSelectedOption = computed<string | string[]>({
    get: () => modelValue.value,
    set: (v) => emit('update:modelValue', v),
});

</script>