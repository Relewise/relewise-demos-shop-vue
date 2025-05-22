<template>
    <div v-if="filterKey">
        <div class="w-full flex items-center justify-between mb-5 gap-2">
            <input 
                v-model="filters[filterKey][0]" 
                type="text" 
                class="small" 
                @keypress.enter="$emit('update')"> - 
            <input
                v-model="filters[filterKey][1]"
                type="text"
                class="small"
                @keypress.enter="$emit('update')">
        </div>
        <div 
            v-if="'available' in facet && facet.available && (facet.available as DecimalRangeAvailableFacetValue).value"
            class="px-1">
            <Slider 
                v-model="filters[filterKey]"
                :tooltips="false"
                :max="(facet.available as DecimalRangeAvailableFacetValue)?.value?.upperBoundInclusive"
                :min="(facet.available as DecimalRangeAvailableFacetValue)?.value?.lowerBoundInclusive"
                @update="$emit('update')"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DecimalRangeAvailableFacetValue, FacetResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import Slider from '@vueform/slider';
import { getFacetConfigEntryForResult } from '@/helpers/facetHelper';

const props = defineProps({
    facet: { type: Object as PropType<FacetResult>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
});

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

populateFilterKeyWithAvailableIfEmpty();

function populateFilterKeyWithAvailableIfEmpty() {
    if (!filterKey) return;
    
    if (filters.value[filterKey]?.length ?? 0 !== 0) return;

    if ('available' in facet.value && facet.value.available) {
        const range = facet.value.available as DecimalRangeAvailableFacetValue;
        
        filters.value[filterKey] = [range.value?.lowerBoundInclusive.toString() ?? '', range.value?.upperBoundInclusive.toString() ?? ''];
    }
}

</script>