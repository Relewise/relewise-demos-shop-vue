<template>
    <div v-for="(category, selectedCategoryFilterOptionIndex) in selected" :key="selectedCategoryFilterOptionIndex">
        <div v-if="selectedCategoryFilterOptionIndex < categoryFilterThreshold" class="bg-gray-100 flex my-1">
            <span class="m-1">
                {{ category.displayName ?? category.categoryId }}
            </span>
            <XMarkIcon class="ml-auto h-6 w-6 text-slate-600 cursor-pointer my-auto mr-2"
                       @click="applyFacet('category', category.categoryId, true)"/>
        </div>
    </div>

    <!-- Render category hierarchy options as filters or checklist -->
    <template v-if="options">
        <template v-if="selected && selected.length < categoryFilterThreshold">
            <span v-for="(categoryLink, filterOptionIndex) in options"
                  :key="filterOptionIndex"
                  class="block cursor-pointer hover:!text-brand-500"
                  @click.prevent="applyFacet('category', categoryLink.category.categoryId)">
                {{ categoryLink.category?.displayName ?? categoryLink.category?.categoryId }}
            </span>
        </template>
        <ul v-else>
            <li v-for="(option, oIndex) in options" :key="oIndex" class="flex pb-1.5">
                <label class="flex items-center cursor-pointer w-full">
                    <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
                           type="checkbox"
                           :value="option.category.categoryId"
                           :checked="option.selected"
                           @click="applyFacet('category', option.category.categoryId)">
                    {{ option.category.displayName ?? option.category.categoryId }}
                    <span class="flex-grow"></span>
                    <span>{{ option.hits }}</span>
                </label>
            </li>
        </ul>
    </template>
</template>

<script setup lang="ts">
import { findCategoryById } from '@/helpers/categoryHelper';
import contextStore from '@/stores/context.store';
import type { CategoryHierarchyFacetResult, CategoryHierarchyFacetResultCategoryNode, FacetResult, ProductCategoryResult } from '@relewise/client';
import { ref, toRefs, watch, type PropType } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
    facet: { type: Object as PropType<FacetResult>, required: true},
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
});

const emit = defineEmits(['search']);

const { facet, filters } = toRefs(props);

const selected = ref<ProductCategoryResult[]>([]);
const options = ref<CategoryHierarchyFacetResultCategoryNode[] | undefined>(undefined);

const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

watch(facet, () => {
    const selectedCategoryFilterIds = filters.value['category'];

    const categoryHeirarchyFacetResult = (facet.value as CategoryHierarchyFacetResult);
            
    // Populate categories for rendering with display names
    selected.value = [];
    if (Array.isArray(selectedCategoryFilterIds)) {
        selectedCategoryFilterIds.forEach(selectedId => {
            const categoryNode = findCategoryById(categoryHeirarchyFacetResult.nodes, selectedId);
            if (categoryNode) selected.value.push(categoryNode.category);
        });
    }

    // If no categories are selected, show root categories as options
    if (selected.value.length === 0) {
        options.value = categoryHeirarchyFacetResult.nodes;
    } else {
        // Determine the category to use as the root for filter options
        const rootCategoryId = selected.value[
            Math.min(selected.value.length, categoryFilterThreshold) - 1
        ]?.categoryId;

        if (rootCategoryId) {
            const rootCategoryNode = findCategoryById(categoryHeirarchyFacetResult.nodes, rootCategoryId);
            options.value = rootCategoryNode?.children ?? undefined;
        }
    }
    
}, { immediate: true, deep: true });


function applyFacet(name: string, value: string | null | undefined, clearSubsequentEntries: boolean = false, handlefilters: boolean = true) {
    emit('search', { name, value, clearSubsequentEntries, handlefilters });
}
</script>