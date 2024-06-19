<template>
    <select v-model="internalSelectedOption" class="text-sm lg:text-base w-full lg:w-1/6">
        <option value="Relevance">
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
import { computed, toRefs } from 'vue';

const props = defineProps({
    modelValue: { type: String, required: true },
});

const { modelValue } = toRefs(props);

const emit = defineEmits(['update:modelValue']);

const internalSelectedOption = computed<string>({
    get: () => modelValue.value,
    set: (v) => emit('update:modelValue', v),
});

</script>