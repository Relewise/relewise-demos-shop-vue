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
            v-if="'available' in facet && facet.available && (facet.available as DecimalRangeAvailableFacetValue).value"
            class="px-1">
            <Slider 
                v-model="sliderModel"
                :tooltips="false"
                :max="(facet.available as DecimalRangeAvailableFacetValue)?.value?.upperBoundInclusive"
                :min="(facet.available as DecimalRangeAvailableFacetValue)?.value?.lowerBoundInclusive"
                @update="$emit('update')"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DecimalRangeAvailableFacetValue, FacetResult } from '@relewise/client';
import { ref, toRefs, watch, type PropType } from 'vue';
import Slider from '@vueform/slider';
import { getFacetConfigEntryForResult } from '@/helpers/facetHelper';

const props = defineProps({
    facet: { type: Object as PropType<FacetResult>, required: true },
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

    console.error('Could not calculate filter key for range facet');
}

watch(facet, () => {
    if (filterKey && filters.value[filterKey] && filterKey && 'available' in facet.value && facet.value.available) {
        const range = facet.value.available as DecimalRangeAvailableFacetValue;

        min.value = Number(filters.value[filterKey][0]) < (range.value?.lowerBoundInclusive ?? 0) ? range.value?.lowerBoundInclusive ?? 0 : Number(filters.value[filterKey][0]);
        max.value = Number(filters.value[filterKey][1]) < (range.value?.upperBoundInclusive ?? 0) ? range.value?.upperBoundInclusive ?? 0 : Number(filters.value[filterKey][1]);

        sliderModel.value = [min.value, max.value];
        return;
    }

    if ('available' in facet.value && facet.value.available) {
        const range = facet.value.available as DecimalRangeAvailableFacetValue;

        min.value = range.value?.lowerBoundInclusive ?? 0;
        max.value = range.value?.upperBoundInclusive ?? 0;
    }

    console.log([min.value, max.value]);

    sliderModel.value = [min.value, max.value];
    
}, { immediate: true, deep: true });

watch(min, (newValue) => {
    if (filterKey && 'available' in facet.value && facet.value.available) {
        const range = facet.value.available as DecimalRangeAvailableFacetValue;

        if (newValue === (range.value?.lowerBoundInclusive ?? 0)) return;

        const updatedValue = newValue < (range.value?.lowerBoundInclusive ?? 0) ? range.value?.lowerBoundInclusive : newValue;

        filters.value[filterKey] = [updatedValue?.toString() ?? '', max.value.toString()];
    }
});

watch(max, (newValue) => {
    if (filterKey && 'available' in facet.value && facet.value.available) {
        const range = facet.value.available as DecimalRangeAvailableFacetValue;

        if (newValue === (range.value?.upperBoundInclusive ?? 0)) return;

        const updatedValue = newValue > (range.value?.upperBoundInclusive ?? 0) ? range.value?.upperBoundInclusive : newValue;

        filters.value[filterKey] = [min.value.toString(), updatedValue?.toString() ?? ''];
    }
});

watch(sliderModel, (newValue) => {
    min.value = newValue[0];
    max.value = newValue[1];
});

</script>