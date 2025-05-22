<template>
    <template v-for="(facet, index) in facets.items" :key="index">
        <div v-if="getFacetConfigEntryForResult(facet)?.contexts.includes(context)" 
             class="bg-white mb-6 border-b border-solid border-slate-300 pb-6 flex flex-col gap-1">
            <h4 class="font-semibold text-lg">
                {{ getFacetConfigEntryForResult(facet)?.label }}
            </h4>
            
            <CategoryFacet 
                v-if="getFacetConfigEntryForResult(facet)?.type === 'Category'"
                :facet="facet"
                :filters="filters"
                @search="applyFacet"/>
            
            <CheckListFacet
                v-if="getFacetConfigEntryForResult(facet)?.renderType === 'Checklist' &&
                    ((facet.field == 'Category' && !hideCategoryFacet) || (facet.field === 'Brand' && !hideBrandFacet) || facet.field === 'Data')
                    && 'available' in facet && Array.isArray(facet.available)"
                :facet="facet" 
                @search="applyFacet"/>
            
            <RangeFacet
                v-else-if="getFacetConfigEntryForResult(facet)?.renderType === 'Range'"
                :facet="facet"
                :filters="filters"
                @update="rangeChange"/>
        </div>
    </template>
</template>

<script setup lang="ts">
import type { ProductFacetResult } from '@relewise/client';
import { nextTick, toRefs, type PropType } from 'vue';
import CheckListFacet from './ChecklistFacet.vue';
import { getFacetConfigEntryForResult } from '@/helpers/facetHelper';
import RangeFacet from './RangeFacet.vue';
import CategoryFacet from './CategoryFacet.vue';
import type { FacetContext } from '@/facetConfig';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    facets: { type: Object as PropType<ProductFacetResult>, required: true },
    hideCategoryFacet: { type: Boolean, default: true },
    hideBrandFacet: { type: Boolean, default: false },
    context: { type: Object as PropType<FacetContext>, required: true },
});

const emit = defineEmits(['search']);

const { filters, facets } = toRefs(props);

function applyFacet(name: string, value: string | null | undefined, clearSubsequentEntries: boolean = false) {
    if (!value) return;

    const nameAsProp = name.charAt(0).toLowerCase() + name.slice(1);
 
    const existing = filters.value[nameAsProp];
    if (existing && Array.isArray(existing)) {
        const index = existing.indexOf(value);
        index === -1
            ? existing.push(value)
            : (clearSubsequentEntries ? existing.splice(index) : existing.splice(index, 1));
    } else if (value !== null) {
        filters.value[nameAsProp] = [];
        const t = filters.value[nameAsProp];
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