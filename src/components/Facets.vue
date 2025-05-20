<template>
    <template v-for="(facet, index) in facets.items" :key="index">
        <div v-if="shouldRenderFacet(facet)">
            <div>
                <template
                    v-if="facet.$type.includes('CategoryHierarchyFacetResult') && context == FacetContexts.CategoryPage && ((facet as CategoryHierarchyFacetResult).nodes[0].children?.length ?? 0) > 0 && props.additionalParams?.childCategories">
                    <FacetHeadline :facet=facet />
                    <div v-if="((facet as CategoryHierarchyFacetResult).nodes[0].children?.length ?? 0) > 0"
                        class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
                        <ul>
                            <li v-for="(childCategory, index) in props.additionalParams?.childCategories" :key="index">
                                <RouterLink :to="{
                                    name: props.additionalParams?.parentCategoryId ? 'sub-sub-category' : 'sub-category',
                                    params: {
                                        grand: props.additionalParams?.parentCategoryId,
                                        parent: props.additionalParams?.categoryId,
                                        id: childCategory.category.categoryId
                                    }
                                }"
                                    class="text-slate-700 hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer">
                                    {{ childCategory.category.displayName ?? childCategory.category.categoryId }}
                                </RouterLink>
                            </li>
                        </ul>
                    </div>
                </template>

                <template v-if="facet.$type.includes('CategoryFacetResult') && context == FacetContexts.CategoryPage">
                    <div class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
                        <FacetHeadline :facet=facet />
                        <CheckListFacet :facet="facet" class="" @search="applyFacet" />
                    </div>
                </template>

                <template
                    v-if="facet.$type.includes('CategoryHierarchyFacetResult') && context == FacetContexts.SearchOverlay">
                    <div class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
                        <FacetHeadline :facet=facet />
                        <div v-for="(category, selectedCategoryFilterOptionIndex) in selectedCategoryFilterOptions"
                            :key="selectedCategoryFilterOptionIndex">
                            <div v-if="selectedCategoryFilterOptionIndex < categoryFilterThreshold"
                                class="bg-gray-100 flex my-1">
                                <span class="m-1">
                                    {{ category.displayName ?? category.categoryId }}
                                </span>
                                <XMarkIcon class="ml-auto h-6 w-6 text-slate-600 cursor-pointer my-auto mr-2"
                                    @click="applyFacet(facet.field.toLowerCase(), category.categoryId, true)" />
                            </div>
                        </div>
                        <!-- Render category hierarchy options as filters or checklist -->
                        <template v-if="categoryHierarchyOptions">
                            <template
                                v-if="selectedCategoryFilterOptions && selectedCategoryFilterOptions.length < categoryFilterThreshold">
                                <span v-for="(categoryLink, filterOptionIndex) in categoryHierarchyOptions"
                                    :key="filterOptionIndex" class="mb-1 block cursor-pointer"
                                    @click.prevent="applyFacet(facet.field.toLowerCase(), categoryLink.category.categoryId)">
                                    {{ categoryLink.category?.displayName ?? categoryLink.category?.categoryId }}
                                </span>
                            </template>
                            <ul v-else>
                                <li v-for="(option, oIndex) in categoryHierarchyOptions" :key="oIndex"
                                    class="flex pb-1.5">
                                    <label class="flex items-center cursor-pointer">
                                        <input class="accent-brand-500 mr-1 h-4 w-4 cursor-pointer shrink-0"
                                            type="checkbox" :value="option.category.categoryId"
                                            :checked="option.selected"
                                            @click="applyFacet(facet.field.toLowerCase(), option.category.categoryId)">
                                        {{ option.category.displayName ?? option.category.categoryId }} <span
                                            class="">{{
                                                option.hits }}</span>
                                    </label>
                                </li>
                            </ul>
                        </template>
                    </div>
                </template>

                <template
                    v-if="getFacetConfigEntry(facet, context)?.render === 'checklist' && facetHasKeyOrField(facet) && ((facet.field === 'Brand' || facet.key === 'Brand')) && 'available' in facet && Array.isArray(facet.available)">
                    <div class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
                        <FacetHeadline :facet=facet />
                        <CheckListFacet :facet="facet" class="" @search="applyFacet" />
                    </div>
                </template>

                <template
                    v-if="getFacetConfigEntry(facet, context)?.render === 'range' && facetHasKeyOrField(facet) && (isPriceRangeFacetResult(facet) || isDoubleRangeFacetResult(facet))">
                    <div class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
                        <FacetHeadline :facet=facet />
                        <RangeFacet :key="facet.key ?? facet.field" :facet="facet"
                            :value="[
                                filters[getFacetKey(facet)]?.[0] ?? (facet.available?.value?.lowerBoundInclusive ?? 0).toString(),
                                filters[getFacetKey(facet)]?.[1] ?? (facet.available?.value?.upperBoundInclusive ?? 0).toString()]"
                            :min="facet.available?.value?.lowerBoundInclusive"
                            :max="facet.available?.value?.upperBoundInclusive" @update:value="(val: [string | number, string | number]) => {
                                filters[getFacetKey(facet)] = val.map(v => v.toString())
                            }" @update="rangeChange" />
                    </div>
                </template>
                
                <template
                    v-if="getFacetConfigEntry(facet, context)?.render === 'checklist' && facetHasKeyOrField(facet) && facet.key === 'AvailableInChannels'">
                    <div class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
                        <FacetHeadline :facet=facet />
                        <CheckListFacet :facet="facet" class="" @search="applyFacet" />
                    </div>
                </template>
            </div>
        </div>
    </template>
</template>

<script setup lang="ts">
import { type CategoryHierarchyFacetResultCategoryNode, type ProductCategoryResult, type ProductFacetResult } from '@relewise/client';
import { computed, nextTick, toRefs, type PropType } from 'vue';
import CheckListFacet from './facets/ChecklistFacet.vue';
import RangeFacet from './facets/RangeFacet.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';
import { getFacetDefinition, getFacetKeysForContext, FacetContexts, type FacetContext } from '@/config/FacetConfigSmarter';
import type { CategoryHierarchyFacetResult, DoubleNullableProductDataRangeFacetResult, PriceRangeFacetResult } from '@relewise/client';
import FacetHeadline from './FacetHeadline.vue'

function isDoubleRangeFacetResult(facet: unknown): facet is DoubleNullableProductDataRangeFacetResult {
    return (
        !!facet &&
        typeof facet === 'object' &&
        '$type' in facet &&
        (facet as any).$type?.includes('ProductDataDoubleRangeFacetResult')
    );
}

function isPriceRangeFacetResult(facet: unknown): facet is PriceRangeFacetResult {
    return (
        !!facet &&
        typeof facet === 'object' &&
        '$type' in facet &&
        (facet as any).$type?.includes('PriceRangeFacetResult')
    );
}

function facetHasKeyOrField(facet: unknown): facet is { key?: string; field?: string } {
    return !!facet && typeof facet === 'object' && ('key' in facet || 'field' in facet);
}

function getFacetKey(facet: { key?: string; field?: string }): string {
    return facet.key ?? facet.field ?? '';
}

function getFacetConfigEntry(facet: unknown, context: FacetContext) {
    if (facetHasKeyOrField(facet)) {
        return getFacetDefinition(getFacetKey(facet), context);
    }
    return undefined;
}

const props = defineProps({
    context: { type: String as PropType<FacetContext>, required: true },
    additionalParams: { type: Object as PropType<Record<string, any>>, required: false },
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

    const nameAsProp = name;//.toLowerCase();
    const existing = filters.value[nameAsProp];
    if (existing && Array.isArray(existing)) {
        const index = existing.indexOf(value);
        index === -1
            ? existing.push(value)
            : (clearSubsequentEntries ? existing.splice(index) : existing.splice(index, 1));
    } else if (value !== null) {
        filters.value[nameAsProp] = [value];
    }

    page.value = 1;
    emit('search');
}

function rangeChange() {
    nextTick(() => {
        page.value = 1;

        emit('search');
    });
}

const allowedFacetKeys = computed(() => getFacetKeysForContext(props.context));

function shouldRenderFacet(facet: any): boolean {
    const key = facet.key ?? facet.field;
    const config = getFacetConfigEntry(facet, props.context);
    return !!config && allowedFacetKeys.value.includes(key);
}
</script>

<style src="@vueform/slider/themes/default.css"></style>