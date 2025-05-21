<template>
    <ul v-if="(facet.field == 'Category' || facet.field == 'Brand' || facet.field == 'Data') && allOptions.length > 0">
        <li v-for="(option, oIndex) in options" :key="oIndex" class="flex pb-1.5">
            <label v-if="(facet.field == 'Category' || facet.field == 'Brand') && option.value && typeof option.value === 'object' && 'id' in option.value" class="flex items-center cursor-pointer w-full">
                <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
                       type="checkbox"
                       :value="option.value.id"
                       :checked="option.selected"
                       @click="applyFacet(facet.field, option.value.id)">
                {{ option.value?.displayName ?? option.value.id }}
                <span class="flex-grow"></span>
                <span class="">{{ option.hits }}</span>
            </label>

            <label v-if="facet.field == 'Data' && 'key' in facet && typeof facet.key === 'string'" class="flex items-center cursor-pointer w-full">
                <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
                       type="checkbox"
                       :value="option.value"
                       :checked="option.selected"
                       @click="applyFacet(facet.key, option.value)">
                {{ option.value }}
                <span class="flex-grow"></span>
                <span class="">{{ option.hits }}</span>
            </label>
        </li>
        <li v-if="elementsToShow < allOptions.length">
            <button class="bg-slate-900 hover:bg-slate-700 py-1 px-2" @click="elementsToShow = allOptions.length">
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

    const sorted = [...(facet.value as any).available].sort((a, b) => {

        const aText = a.value?.displayName ?? a.value ?? '';
        const bText = b.value?.displayName ?? b.value ?? '';

        return aText.localeCompare(bText);
    });

    return sorted.slice(0, elementsToShow.value);
});

const emit = defineEmits(['search']);

const { facet } = toRefs(props);

function applyFacet(name: string, value: string | null | undefined) {
    emit('search', name, value);
}
</script>