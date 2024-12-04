<template>
    <template v-for="(facet, index) in facets.items" :key="index">
        <div v-if="(facet.field === 'Brand' && !hideBrandFacet) || (facet.field == 'Category' && !hideCategoryFacet) || facet.field === 'SalesPrice' || (facet.$type.includes('CategoryHierarchyFacetResult') && categoriesForFilterOptions)" class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
            <h4 class="font-semibold text-lg mb-1">
                {{ facet.field.split(/(?=[A-Z])/).join(' ') }}
            </h4>
            <template v-if="facet.$type.includes('CategoryHierarchyFacetResult')">
                <div v-for="(category, selectedCategoryFilterOptionIndex) in selectedCategoryFilterOptions" :key="selectedCategoryFilterOptionIndex">
                    <div v-if="selectedCategoryFilterOptionIndex < categoryFilterThreshold" class="bg-gray-100 flex my-1">
                        <span class="m-1">
                            {{ category.displayName ?? category.categoryId }}
                        </span>
                        <XMarkIcon class="ml-auto h-6 w-6 text-slate-600 cursor-pointer my-auto mr-2"
                                   @click="applyFacet(facet.field, category.categoryId, true)"/>
                    </div>
                </div>

                <!-- Render category hierarchy options as filters or checklist -->
                <template v-if="categoryHierarchyOptions">
                    <template v-if="selectedCategoryFilterOptions && selectedCategoryFilterOptions.length < categoryFilterThreshold">
                        <span v-for="(categoryLink, filterOptionIndex) in categoryHierarchyOptions"
                              :key="filterOptionIndex"
                              class="mb-1 block cursor-pointer"
                              @click.prevent="applyFacet(facet.field, categoryLink.category.categoryId)">
                            {{ categoryLink.category?.displayName ?? categoryLink.category?.categoryId }}
                        </span>
                    </template>
                    <ul v-else>
                        <li v-for="(option, oIndex) in categoryHierarchyOptions" :key="oIndex" class="flex pb-1.5">
                            <label class="flex items-center cursor-pointer">
                                <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
                                       type="checkbox"
                                       :value="option.category.categoryId"
                                       :checked="option.selected"
                                       @click="applyFacet(facet.field, option.category.categoryId)">
                                {{ option.category.displayName ?? option.category.categoryId }} <span class="">{{ option.hits }}</span>
                            </label>
                        </li>
                    </ul>
                </template>
            </template>

            <CheckListFacet
                v-if="((facet.field == 'Category' && !hideCategoryFacet) || (facet.field === 'Brand' && !hideBrandFacet)) && 'available' in facet && Array.isArray(facet.available)"
                :facet="facet" 
                class=""
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
    hideCategoryFacet: { type: Boolean, default: true },
    hideBrandFacet: { type: Boolean, default: false },
});

const emit = defineEmits(['search']);
const { filters, page, facets, categoriesForFilterOptions: categoryHierarchyOptions } = toRefs(props);
const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;

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