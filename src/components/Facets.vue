<template>
    <div v-for="(facet, index) in facets.items" :key="index" class="px-3 py-3 bg-white rounded mb-3">
        <div class="font-semibold text-lg mb-2">
            {{ facet.field }}
        </div>

        <ul v-if="(facet.field == 'Category' || facet.field == 'Brand') && 'available' in facet && Array.isArray(facet.available)">
            <li v-for="(option, oIndex) in facet.available.slice(0, 10)" :key="oIndex" class="flex pb-1.5">
                <label v-if="option.value && typeof option.value === 'object' && 'id' in option.value" class="flex items-center cursor-pointer">
                    <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer"
                           type="checkbox"
                           :value="option.value.id"
                           :selected="option.selected"
                           @click="applyFacet(facet.field, option.value.id)">
                    {{ option.value?.displayName ?? option.value.id }} <span class="ml-1 text-zinc-400">({{ option.hits }})</span>
                </label>
            </li>
        </ul>
        <div v-else>
            <div v-if="filters.price.length == 2" class="w-full flex justify-between mb-3">
                {{ $format(filters.price[0]) }} - {{ $format(filters.price[1]) }}
            </div>
            <div v-if="filters.price.length == 2 && 'available' in facet && facet.available && 'value' in facet.available" class="px-1">
                <Slider 
                    v-model="filters.price"
                    :tooltips="false"
                    :max="facet.available?.value?.upperBoundInclusive"
                    :min="facet.available?.value?.lowerBoundInclusive"
                    @update="priceChange"/>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ProductFacetResult } from '@relewise/client';
import { nextTick, toRefs, type PropType } from 'vue';
import Slider from '@vueform/slider';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string[]>>, required: true},
    facets: { type: Object as PropType<ProductFacetResult>, required: true},
    page: {type: Number, required: true },
});

const emit = defineEmits(['search']);

const { filters, page, facets } = toRefs(props);

function applyFacet(name: string, value: string | null | undefined) {
    if (!value) return;
    
    const nameAsProp = name.charAt(0).toLowerCase() + name.slice(1);

    if (filters.value[nameAsProp]) {
        const index = filters.value[nameAsProp].indexOf(value);
        index === -1
            ? filters.value[nameAsProp].push(value)
            : filters.value[nameAsProp].splice(index, 1);
    } else if (value !== null) {
        filters.value[nameAsProp] = [];
        filters.value[nameAsProp].push(value);
    }

    page.value = 1;
    emit('search');
}

function priceChange() {
    nextTick(() => {
        page.value = 1;
        emit('search');
    });
}
</script>

<style src="@vueform/slider/themes/default.css"></style>