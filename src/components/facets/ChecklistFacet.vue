<template>
    <div v-bind="$attrs">
      <ul>
        <li v-for="(option, oIndex) in options" :key="oIndex" class="flex pb-1.5">
          <label class="flex items-center cursor-pointer w-full">
            <input
              class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
              type="checkbox"
              :value="getValueId(option.value)"
              :checked="option.selected"
              @click="applyFacet(getFacetIdentifier(facet), getValueId(option.value))"
            />
            {{ getValueLabel(option.value) }}
            <span class="flex-grow"></span>
            <span>{{ option.hits }}</span>
          </label>
        </li>
  
        <li v-if="elementsToShow < allOptions.length">
          <button
            class="bg-slate-900 hover:bg-slate-700 py-1 px-2"
            @click="elementsToShow = allOptions.length"
          >
            Show all
          </button>
        </li>
      </ul>
    </div>
  </template>

<script setup lang="ts">
import type { FacetResult } from '@relewise/client';
import { computed, ref } from 'vue';
import { toRefs, type PropType } from 'vue';

const props = defineProps({
    facet: { type: Object as PropType<FacetResult>, required: true },
});

const elementsToShow = ref(10);

const allOptions = computed(() => {
    if (!('available' in facet.value)) return [];
    
    return (facet.value as any).available; // Vite does not recognize the "in" operator used above
});

const options = computed(() => {
    if (!('available' in facet.value)) return [];

    const sorted = [...(facet.value as any).available].sort((a, b) => {
        const extractText = (entry: any) => {
            if (typeof entry.value === 'object' && entry.value !== null && 'displayName' in entry.value) {
                return entry.value.displayName || '';
            }
            return String(entry.value ?? '');
        };

        const aText = extractText(a);
        const bText = extractText(b);
        return aText.localeCompare(bText, undefined, { sensitivity: 'base' });
    });

    return sorted.slice(0, elementsToShow.value);
});

const emit = defineEmits(['search']);

const { facet } = toRefs(props);

function applyFacet(name: string, value: string | null | undefined) {
    emit('search', name, value);
}

function getValueLabel(value: any): string {
    if (typeof value === 'object' && value !== null) {
        return value.displayName ?? value.id ?? '';
    }
    return String(value ?? '');
}

function getValueId(value: any): string {
    if (typeof value === 'object' && value !== null) {
        return value.id ?? '';
    }
    return String(value ?? '');
}

function getFacetIdentifier(facet: any): string {
    if ('dataSelectionStrategy' in facet && typeof facet.key === 'string') {
        return facet.key;
    }
    return facet.field ?? '';
}

</script>