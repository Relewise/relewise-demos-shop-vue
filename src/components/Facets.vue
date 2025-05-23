<template>
    <template v-for="(facet, index) in facets.items" :key="index">
        <Facet
            :facet="facet"
            :filters="filters"
            :context="context"
            @search="applyFacet"
            @update="rangeChange"/>
    </template>
</template>

<script setup lang="ts">
import type { ProductFacetResult } from '@relewise/client';
import { nextTick, toRefs, type PropType } from 'vue';
import type { FacetContext } from '@/facetConfig';
import Facet from './Facet.vue';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    facets: { type: Object as PropType<ProductFacetResult>, required: true },
    context: { type: Object as PropType<FacetContext>, required: true },
});

const emit = defineEmits(['search']);

const { filters, facets } = toRefs(props);

function applyFacet(payload: { name: string; value: string | null | undefined; clearSubsequentEntries?: boolean }) {
    const { name, value, clearSubsequentEntries = false } = payload;
    
    if (!value) return;

    const existing = filters.value[name];
    if (existing && Array.isArray(existing)) {
        const index = existing.indexOf(value);
        index === -1
            ? existing.push(value)
            : (clearSubsequentEntries ? existing.splice(index) : existing.splice(index, 1));
    } else if (value !== null) {
        filters.value[name] = [];
        const t = filters.value[name];
        Array.isArray(t) && t.push(value);
    }

    emit('search');
}

function rangeChange() {
    nextTick(() => {
        emit('search');
    });
}
</script>

<style src="@vueform/slider/themes/default.css"></style>