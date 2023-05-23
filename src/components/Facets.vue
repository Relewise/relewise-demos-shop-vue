<template>
    <div v-for="(facet, index) in facets.items" :key="index" class="px-3 py-3 bg-white rounded mb-3">
        <div class="font-semibold text-lg mb-2">
            {{ facet.field.split(/(?=[A-Z])/).join(' ') }}
        </div>

        <CheckListFacet
            v-if="(facet.field == 'Category' || facet.field == 'Brand') && 'available' in facet && Array.isArray(facet.available)"
            :facet="facet" 
            @search="applyFacet"/>
        <div v-else>
            <div class="w-full flex items-center justify-between mb-5 gap-2">
                <input v-model="filters.price[0]" type="text" class="small" @keypress.enter="priceChange"> - <input
                    v-model="filters.price[1]"
                    type="text"
                    class="small"
                    @keypress.enter="priceChange">
            </div>
            <div v-if="'available' in facet && facet.available && 'value' in facet.available"
                 class="px-1">
                <Slider v-model="filters.price"
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
import CheckListFacet from './ChecklistFacet.vue';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string[]>>, required: true },
    facets: { type: Object as PropType<ProductFacetResult>, required: true },
    page: { type: Number, required: true },
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