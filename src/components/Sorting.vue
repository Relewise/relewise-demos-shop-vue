<template>
    <select v-model="internalSelectedOption" class="text-sm lg:text-base w-full lg:w-1/6" @on="$attrs">
        <option value="">
            Relevance
        </option>
        <option value="Popular">
            Popular
        </option>
        <option value="SalesPriceDesc">
            Sales Price desc
        </option>
        <option value="SalesPriceAsc">
            Sales Price asc
        </option>
    </select>
</template>

<script lang="ts" setup>
import { computed, toRefs, type PropType } from 'vue';

const props = defineProps({
    modelValue: { type: Object as PropType<string | string[]>, required: true },
});

const { modelValue } = toRefs(props);

const emit = defineEmits(['update:modelValue']);

const internalSelectedOption = computed<string | string[]>({
    get: () => modelValue.value,
    set: (v) => emit('update:modelValue', v),
});

</script>