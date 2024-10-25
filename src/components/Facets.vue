<template>
    <template v-for="(facet, index) in facets.items" :key="index">
        <div class="px-3 py-3 bg-white rounded mb-3">
            <div class="font-semibold text-lg mb-2">
                {{ facet.field.split(/(?=[A-Z])/).join(' ') }}
            </div>

            <template v-if="facet.field === 'Category'">
                <div v-for="(category, selectedCategoryFilterOptionIndex) in selectedCategoryFilterOptions" :key="selectedCategoryFilterOptionIndex" class="bg-gray-100 flex my-1">
                    <span class="m-1">
                        {{ category.displayName ?? category.categoryId }}
                    </span>
                    <XMarkIcon class="ml-auto h-6 w-6 text-zinc-600 cursor-pointer my-auto mr-2"
                               @click="() => {
                                   applyFacet('category', category.categoryId, true);
                               }"/>
                </div>
                <template v-if="categoriesForFilterOptions && (selectedCategoryFilterOptions && selectedCategoryFilterOptions.length < (contextStore.context.value.allowThirdLevelCategories ? 3 : 2))">
                    <span v-for="(categoryLink, filterOptionIndex) in categoriesForFilterOptions"
                          :key="filterOptionIndex"
                          class="mb-1 block cursor-pointer"
                          @click.prevent="applyFacet('category', categoryLink.category.categoryId)">
                        {{ categoryLink.category?.displayName ?? categoryLink.category?.categoryId }}
                    </span>
                </template>
                <ul v-else>
                    <li v-for="(option, oIndex) in categoriesForFilterOptions" :key="oIndex" class="flex pb-1.5">
                        <label class="flex items-center cursor-pointer">
                            <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
                                   type="checkbox"
                                   :value="option.category.categoryId"
                                   :checked="option.selected"
                                   @click="applyFacet(facet.field, option.category.categoryId)">
                            {{ option.category.displayName ?? option.category.categoryId }} <span class="ml-1 text-zinc-400">({{ option.hits }})</span>
                        </label>
                    </li>
                </ul>
            </template>

            <CheckListFacet
                v-if=" ((facet.field == 'Category' && renderCategoryFacet) || facet.field == 'Brand') && ('available' in facet && Array.isArray(facet.available) ||'nodes' in facet && Array.isArray(facet.nodes))"
                :facet="facet" 
                @search="applyFacet"/>

            <div v-else-if="facet.field === 'SalesPrice'">
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
</template>

<script setup lang="ts">
import type { CategoryHierarchyFacetResultCategoryNode, ProductCategoryResult, ProductFacetResult } from '@relewise/client';
import { nextTick, toRefs, type PropType } from 'vue';
import Slider from '@vueform/slider';
import CheckListFacet from './ChecklistFacet.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';

const props = defineProps({
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    categoriesForFilterOptions: { type: Object as PropType<CategoryHierarchyFacetResultCategoryNode[] | undefined>, required: false },
    selectedCategoryFilterOptions: { type: Object as PropType<ProductCategoryResult[]>, required: false },
    facets: { type: Object as PropType<ProductFacetResult>, required: true },
    page: { type: Number, required: true },
    renderCategoryFacet: { type: Boolean, required: true },
});

const emit = defineEmits(['search']);
const { filters, page, facets, categoriesForFilterOptions } = toRefs(props);

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