<template>
    <ul v-if="(facet.field == 'Category' || facet.field == 'Brand') && allOptions.length > 0">
        <li v-for="(option, oIndex) in options" :key="oIndex" class="flex pb-1.5">
            <label v-if="option.value && typeof option.value === 'object' && 'id' in option.value" class="flex items-center cursor-pointer">
                <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer"
                       type="checkbox"
                       :value="option.value.id"
                       :checked="option.selected"
                       @click="applyFacet(facet.field, option.value.id)">
                {{ option.value?.displayName ?? option.value.id }} <span class="ml-1 text-zinc-400">({{ option.hits }})</span>
            </label>
        </li>
        <li v-if="elementsToShow < allOptions.length">
            <button class="bg-zinc-500 py-1 px-2" @click="elementsToShow = allOptions.length">
                Show all
            </button>
        </li>
    </ul>
</template>

<script setup lang="ts">
import type { FacetResult } from '@relewise/client';
import { computed, ref } from 'vue';
import { toRefs, type PropType } from 'vue';

const props = defineProps({
    facet: { type: Object as PropType<FacetResult>, required: true},
});

const elementsToShow = ref(10);

const allOptions = computed(() => {
    if (!('available' in facet.value)) return [];

    return (facet.value as any).available; // Vite does not recognize the "in" operator used above
});

const options = computed(() => {
    if (!('available' in facet.value)) return [];

    const sorted = [...(facet.value as any).available].sort((a, b) => a.value?.displayName?.localeCompare(b.value?.displayName ?? '') ?? 0);
    return sorted.slice(0, elementsToShow.value);
});

const emit = defineEmits(['search']);

const { facet } = toRefs(props);

function applyFacet(name: string, value: string | null | undefined) {
    emit('search', name, value);
}
</script>