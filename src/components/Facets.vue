<template>
    <template v-for="(facet, index) in facets.items" :key="index">
        <div v-if="shouldRenderFacet(facet)" class="bg-white mb-6 border-b border-solid border-slate-300 pb-6">
            <h4 class="font-semibold text-lg mb-1">
                {{ ('key' in facet && typeof facet.key === 'string' ? facet.key : facet.field).split(/(?=[A-Z])/).join(' ') }}
            </h4>
            <template v-if="facet.$type.includes('CategoryHierarchyFacetResult')">
               <div v-for="(category, selectedCategoryFilterOptionIndex) in selectedCategoryFilterOptions" :key="selectedCategoryFilterOptionIndex">
                    <div v-if="selectedCategoryFilterOptionIndex < categoryFilterThreshold" class="bg-gray-100 flex my-1">
                        <span class="m-1">
                            {{ category.displayName ?? category.categoryId }}
                        </span>
                        <XMarkIcon class="ml-auto h-6 w-6 text-slate-600 cursor-pointer my-auto mr-2"
                                   @click="applyFacet(facet.field.toLowerCase(), category.categoryId, true)"/>
                    </div>
                </div>
               
                <template v-if="categoryHierarchyOptions">
                    <template v-if="selectedCategoryFilterOptions && selectedCategoryFilterOptions.length < categoryFilterThreshold">
                        <span v-for="(categoryLink, filterOptionIndex) in categoryHierarchyOptions"
                              :key="filterOptionIndex"
                              class="mb-1 block cursor-pointer"
                              @click.prevent="applyFacet(facet.field.toLowerCase(), categoryLink.category.categoryId)">
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
                                       @click="applyFacet(facet.field.toLowerCase(), option.category.categoryId)">
                                {{ option.category.displayName ?? option.category.categoryId }} <span class="">{{ option.hits }}</span>
                            </label>
                        </li>
                    </ul>
                </template>
            </template>
            
            <template v-if="getFacetConfigEntry(facet)?.render === 'checklist' && facetHasKeyOrField(facet)">
            <CheckListFacet v-if="((facet.field === 'Brand' && !hideBrandFacet)) && 'available' in facet && Array.isArray(facet.available)"
                :facet="facet" 
                class=""
                @search="applyFacet"/> 
            </template>

            <template v-if="getFacetConfigEntry(facet)?.render === 'range' && facetHasKeyOrField(facet) && (isPriceRangeFacetResult(facet) || isDoubleRangeFacetResult(facet))">
                <RangeFacet
                    :key="facet.key ?? facet.field"
                    :facet="facet"
                    :value="[
                    filters[getFacetKey(facet)]?.[0] ?? (facet.available?.value?.lowerBoundInclusive ?? 0).toString(),
                    filters[getFacetKey(facet)]?.[1] ?? (facet.available?.value?.upperBoundInclusive ?? 0).toString()]"
                    :min="facet.available?.value?.lowerBoundInclusive"
                    :max="facet.available?.value?.upperBoundInclusive"
                    @update:value="(val: [string | number, string | number]) => {
                        filters[getFacetKey(facet)] = val.map(v => v.toString())
                    }"
                    @update="rangeChange"
                />
            </template>

            <template v-if="getFacetConfigEntry(facet)?.render === 'checklist' && facetHasKeyOrField(facet)">
                <CheckListFacet
                    v-if="facet.key === 'AvailableInChannels'"
                    :facet="facet" 
                    class=""
                    @search="applyFacet"/> 
            </template>
        </div>
    </template>
</template>

<script setup lang="ts">
import { type CategoryHierarchyFacetResultCategoryNode, type ProductDataStringValueFacet, type ContentDataStringValueFacet, type ProductCategoryResult, type ProductDataDoubleRangeFacet, type ProductFacetResult, type ProductDataDoubleValueFacetResult, type ProductDataStringValueFacetResult, ContentsRecommendationCollectionBuilder } from '@relewise/client';
import { nextTick, toRefs, type PropType } from 'vue';
import CheckListFacet from './facets/ChecklistFacet.vue';
import RangeFacet from './facets/RangeFacet.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';
import { facetConfig, getFacetConfigEntry, getFacetKey, facetHasKeyOrField } from '@/config/FacetConfig';
import type { DoubleNullableProductDataRangeFacetResult, PriceRangeFacetResult } from '@relewise/client';

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

function isProductDataStringValueFacetResult(facet: unknown): facet is ProductDataStringValueFacetResult {
    return (
    !!facet &&
    typeof facet === 'object' &&
    '$type' in facet &&
    (facet as any).$type?.includes('ProductDataStringValueFacetResult')
  );
}
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

    const nameAsProp = name;//.toLowerCase();
    const existing = filters.value[nameAsProp];
    if (existing && Array.isArray(existing)) {
        const index = existing.indexOf(value);
        index === -1
            ? existing.push(value)
            : (clearSubsequentEntries ? existing.splice(index) : existing.splice(index, 1));
    } else if (value !== null) {
        filters.value[nameAsProp] = [value];
        // filters.value[nameAsProp] = [];
        // const t = filters.value[nameAsProp];
        // Array.isArray(t) && t.push(value);
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

function shouldRenderFacet(facet: any): boolean {
    if(((facet.$type === 'Relewise.Client.DataTypes.Search.Facets.Result.ProductDataDoubleRangeFacetResult, Relewise.Client') && (facet.available?.hits < 1)))
        {
            return false;
        }
    if((facet.$type === 'Relewise.Client.DataTypes.Search.Facets.Result.ProductDataStringValueFacetResult, Relewise.Client') && 'available' in facet && Array.isArray(facet.available) && facet.available.length < 1)
        {
            return false;
        }

return (
    (facet.field === 'Brand' && !props.hideBrandFacet) ||
    (facet as ProductDataStringValueFacet).key?.includes('StockLevel') ||
    (facet.field === 'Category' && !props.hideCategoryFacet) || facet.field === 'SalesPrice' || (facet.$type.includes('CategoryHierarchyFacetResult') && props.categoriesForFilterOptions) ||
    (facet.key === 'AvailableInChannels')
  );
}
</script>

<style src="@vueform/slider/themes/default.css"></style>