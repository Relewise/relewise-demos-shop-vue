<template>
  <div
    v-if="config?.contexts.includes(context)" 
    class="bg-white mb-6 border-b border-solid border-slate-300 pb-6 flex flex-col gap-1"
  >
    <h4 class="font-semibold text-lg">
      {{ config?.label }}
    </h4>
        
    <CategoryFacet 
      v-if="config?.type === 'Category' && context != 'ContentSearch'"
      :facet="facet"
      :filters="filters"
      @search="$emit('search', $event)"
    />
        
    <CheckListFacet 
      v-if="config?.type === 'Category' && context == 'ContentSearch'"
      :facet="facet"
      :filters="filters"
      @search="$emit('search', $event)"
    />

    <CheckListFacet
      v-if="config?.renderType === 'Checklist'"
      :facet="facet" 
      @search="$emit('search', $event)"
    />
        
    <RangeFacet
      v-else-if="config?.renderType === 'Range' && rangeFacet && rangeFilterKey"
      :facet="rangeFacet"
      :filters="filters"
      :filter-key="rangeFilterKey"
      @search="$emit('search', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FacetResult } from '@relewise/client';
import { computed, type PropType } from 'vue';
import { getFacetSettings, getRangeFacetResult } from '@/helpers/facetHelper';
import type { FacetContext } from '@/facetConfig';
import CategoryFacet from './CategoryFacet.vue';
import CheckListFacet from './ChecklistFacet.vue';
import RangeFacet from './RangeFacet.vue';

const props = defineProps({
    facet: { type: Object as PropType<FacetResult>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    context: { type: String as PropType<FacetContext>, required: true },
});

defineEmits<{
    (e: 'search', payload: { name: string, value: string | null | undefined, clearSubsequentEntries?: boolean, handlefilters?: boolean }): void
}>();

const config = computed(() => getFacetSettings(props.facet, props.context));
const rangeFacet = computed(() => getRangeFacetResult(props.facet));
const rangeFilterKey = computed(() => {
    if (config.value?.type === 'SalesPrice') {
        return 'price';
    }

    return config.value?.dataKey;
});
</script>
