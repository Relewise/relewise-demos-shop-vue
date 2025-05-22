<template>
    <div v-if="filterKey">
        <div class="w-full flex items-center justify-between mb-5 gap-2">
            <input 
                v-model="min" 
                type="text" 
                class="small" 
                @keypress.enter="$emit('update')"> - 
            <input
                v-model="max"
                type="text"
                class="small"
                @keypress.enter="$emit('update')">
        </div>
        <div 
            v-if="facet.available?.value"
            class="px-1">
            <Slider 
                v-model="sliderModel"
                :tooltips="false"
                :max="facet.available?.value.upperBoundInclusive"
                :min="facet.available?.value.lowerBoundInclusive"
                @update="$emit('update')"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PriceRangeFacetResult, ProductDataDoubleRangeFacetResult } from '@relewise/client';
import { ref, toRefs, watch, type PropType } from 'vue';
import Slider from '@vueform/slider';
import { getFacetConfigEntryForResult } from '@/helpers/facetHelper';

const props = defineProps({
    facet: { type: Object as PropType<PriceRangeFacetResult | ProductDataDoubleRangeFacetResult>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
});

const min = ref(0);
const max = ref(0);

const sliderModel = ref<number[]>([0, 0]);

const { facet, filters } = toRefs(props);

defineEmits(['update']);

const config = getFacetConfigEntryForResult(facet.value);

const filterKey = calculateFilterKey();

function calculateFilterKey() {
    if (config?.type === 'SalesPrice')
        return 'price';

    if (config?.dataKey) {
        return config.dataKey.charAt(0).toLowerCase() + config.dataKey.slice(1);
    }
}

watch(facet, () => {
    if (filterKey && filters.value[filterKey]) {

        min.value = Number(filters.value[filterKey][0]) < (facet.value.available?.value?.lowerBoundInclusive ?? 0) 
            ? facet.value.available?.value?.lowerBoundInclusive ?? 0 
            : Number(filters.value[filterKey][0]);

        max.value = Number(filters.value[filterKey][1]) > (facet.value.available?.value?.upperBoundInclusive ?? 0) 
            ? facet.value.available?.value?.upperBoundInclusive ?? 0 
            : Number(filters.value[filterKey][1]);

        sliderModel.value = [min.value, max.value];
        return;
    }

    min.value = facet.value.available?.value?.lowerBoundInclusive ?? 0;
    max.value = facet.value.available?.value?.upperBoundInclusive ?? 0;

    sliderModel.value = [min.value, max.value];
    
}, { immediate: true, deep: true });

watch(min, (newValue) => {
    if (!filterKey) 
        return;
    
    if (newValue === (facet.value.available?.value?.lowerBoundInclusive ?? 0)) return;

    const updatedValue = newValue < (facet.value.available?.value?.lowerBoundInclusive ?? 0) 
        ? facet.value.available?.value?.lowerBoundInclusive 
        : newValue;

    filters.value[filterKey] = [updatedValue?.toString() ?? '', max.value.toString()];
});

watch(max, (newValue) => {
    if (!filterKey) 
        return;

    if (newValue === (facet.value.available?.value?.upperBoundInclusive ?? 0)) return;

    const updatedValue = newValue > (facet.value.available?.value?.upperBoundInclusive ?? 0) 
        ? facet.value.available?.value?.upperBoundInclusive 
        : newValue;

    filters.value[filterKey] = [min.value.toString(), updatedValue?.toString() ?? ''];
});

watch(sliderModel, (newValue) => {
    min.value = newValue[0];
    max.value = newValue[1];
});

</script>