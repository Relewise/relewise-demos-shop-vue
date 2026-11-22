<template>
  <button
    v-if="hasSelectedFilters"
    type="button"
    class="outline mb-4 focus-visible:outline-2 focus-visible:outline-offset-2"
    @click="resetFilters"
  >
    Reset filters
  </button>
  <div
    v-if="facets?.items?.length"
    class="hidden lg:block"
  >
    <Facet
      v-for="(facet, index) in facets.items"
      :key="index"
      :facet="facet"
      :filters="filters"
      :context="context"
      @search="applyFacet"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProductFacetResult } from '@relewise/client';
import { computed, toRefs, type PropType } from 'vue';
import { getFacetFilterKeys, type FacetContext } from '@/facetConfig';
import Facet from './Facet.vue';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    facets: { type: Object as PropType<ProductFacetResult | null> },
    context: { type: String as PropType<FacetContext>, required: true },
});

const emit = defineEmits(['search', 'reset']);

const { filters, facets } = toRefs(props);
const facetFilterKeys = computed(() => getFacetFilterKeys(props.context));

// URL selections are still available when the response has no facet counts.
const hasSelectedFilters = computed(() => facetFilterKeys.value.some(key => {
    const value = filters.value[key];
    return Array.isArray(value) ? value.some(Boolean) : Boolean(value);
}));

function resetFilters() {
    for (const key of facetFilterKeys.value) {
        delete filters.value[key];
    }

    emit('reset');
}

function applyFacet(payload: { name: string; value: string | null | undefined; clearSubsequentEntries?: boolean, handlefilters?: boolean }) {
    const { name, value, clearSubsequentEntries = false, handlefilters = false } = payload;

    if (handlefilters) {
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
    }

    emit('search');
}
</script>

<style src="@vueform/slider/themes/default.css"></style>
