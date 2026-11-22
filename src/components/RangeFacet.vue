<template>
  <div v-if="filterKey">
    <div class="w-full flex items-center justify-between mb-5 gap-2">
      <input 
        :value="min"
        type="text" 
        class="small"
        @input="updateBound('min', $event)"
      > - 
      <input
        :value="max"
        type="text"
        class="small"
        @input="updateBound('max', $event)"
      >
    </div>
    <div 
      v-if="facet.available?.value"
      class="px-1"
    >
      <Slider 
        :model-value="sliderModel"
        :tooltips="false"
        :max="facet.available?.value.upperBoundInclusive"
        :min="facet.available?.value.lowerBoundInclusive"
        @update:model-value="updateSlider"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PriceRangeFacetResult, ProductDataDoubleRangeFacetResult } from '@relewise/client';
import { computed, ref, toRefs, watch, type PropType } from 'vue';
import Slider from '@vueform/slider';
import { getFacetSettings } from '@/helpers/facetHelper';

const props = defineProps({
    facet: { type: Object as PropType<PriceRangeFacetResult | ProductDataDoubleRangeFacetResult>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
});

const min = ref<number | string>(0);
const max = ref<number | string>(0);

const sliderModel = ref<number[]>([0, 0]);

const { facet, filters } = toRefs(props);

const emit = defineEmits(['search']);

const filterKey = calculateFilterKey();
const availableMin = computed(() => facet.value.available?.value?.lowerBoundInclusive ?? 0);
const availableMax = computed(() => facet.value.available?.value?.upperBoundInclusive ?? 0);
const selectedRange = computed(() => filterKey ? filters.value[filterKey] : undefined);

function calculateFilterKey() {
    const config = getFacetSettings(facet.value);

    if (config?.type === 'SalesPrice')
        return 'price';

    if (config?.dataKey) {
        return config.dataKey;
    }
}

// Reset the controls as soon as the selection clears, even before new facet data arrives.
// Only input handlers submit changes, so restoring the controls does not issue another search.
watch([facet, () => !selectedRange.value], () => {
    const range = selectedRange.value;
    min.value = range ? Math.max(availableMin.value, Number(range[0])) : availableMin.value;
    max.value = range ? Math.min(availableMax.value, Number(range[1])) : availableMax.value;
    sliderModel.value = [min.value, max.value];
}, { immediate: true, deep: true });

function applyRange() {
    if (!filterKey) return;

    const lower = Math.max(availableMin.value, Number(min.value));
    const upper = Math.min(availableMax.value, Number(max.value));
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) return;

    if (lower === availableMin.value && upper === availableMax.value) {
        delete filters.value[filterKey];
    } else {
        filters.value[filterKey] = [String(lower), String(upper)];
    }

    emit('search', { name: facet.value.field, value: null });
}

function updateBound(name: 'min' | 'max', event: Event) {
    const bound = name === 'min' ? min : max;
    bound.value = (event.target as HTMLInputElement).value;
    applyRange();
}

function updateSlider(value: number[]) {
    sliderModel.value = value;
    min.value = value[0] ?? 0;
    max.value = value[1] ?? 0;
    applyRange();
}

</script>
