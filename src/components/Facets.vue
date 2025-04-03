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
                v-if="facet.$type.includes('ContentDataStringValueFacetResult')"
                :facet="facet"
                class=""
                @search="applyFacet" />
            
            <CheckListFacet
                v-if="((facet.field == 'Category' && !hideCategoryFacet) || (facet.field === 'Brand' && !hideBrandFacet)) && 'available' in facet && Array.isArray(facet.available)"
                :facet="facet" 
                class=""
                @search="applyFacet"/>
            
            <CheckListFacet 
                v-if="(facet.key === 'EF000007__STRING')" 
                :facet="facet"
                class=""
                @search="applyFacet"/>

            <template v-if="isPriceRangeFacetResult(facet) && facet.field === 'SalesPrice'">
                <RangeFacet
                    :facet="facet"
                    :value="[
                            filters[facet.key ?? 'price']?.[0] ?? (facet.available?.value?.lowerBoundInclusive ?? 0).toString(),
                            filters[facet.key ?? 'price']?.[1] ?? (facet.available?.value?.upperBoundInclusive ?? 0).toString()]"
                    :min="facet.available?.value?.lowerBoundInclusive"
                    :max="facet.available?.value?.upperBoundInclusive"
                    @update:value="(val) => filters.price = val"
                    @update="priceChange"
                />
        </template>
            <template v-if="isDoubleRangeFacetResult(facet) && facet.key === 'EF022456_MMT_FLOAT' && (facet.available?.hits ?? 0) > 0">
                <RangeFacet
                    :facet="facet"
                    :value="[
                        filters[facet.key ?? 'price']?.[0] ?? (facet.available?.value?.lowerBoundInclusive ?? 0).toString(),
                        filters[facet.key ?? 'price']?.[1] ?? (facet.available?.value?.upperBoundInclusive ?? 0).toString()]"
                    :min="facet.available?.value?.lowerBoundInclusive"
                    :max="facet.available?.value?.upperBoundInclusive"
                    @update:value="(val) => filters[facet.key ?? 'price'] = val"
                    @update="priceChange"
                    />
            </template>
            <template v-if="isDoubleRangeFacetResult(facet) && facet.key === 'EF023270_CEL_FLOAT_MIN' && (facet.available?.hits ?? 0) > 0">
                <RangeFacet
                    :facet="facet"
                    :value="[
                            filters[facet.key ?? 'price']?.[0] ?? (facet.available?.value?.lowerBoundInclusive ?? 0).toString(),
                            filters[facet.key ?? 'price']?.[1] ?? (facet.available?.value?.upperBoundInclusive ?? 0).toString()]"
                    :min="facet.available?.value?.lowerBoundInclusive"
                    :max="facet.available?.value?.upperBoundInclusive"
                    @update:value="(val) => filters[facet.key ?? 'price'] = val"
                    @update="priceChange"
                    />
            </template>
            <!-- <template v-if="isDoubleRangeFacetResult(facet) && facet.key === 'EF023270_CEL_FLOAT_MAX' && (facet.available?.hits ?? 0) > 0">
                <RangeFacet
                    :facet="facet"
                    :value="[
                        filters[facet.key ?? 'price']?.[0] ?? (facet.available?.value?.lowerBoundInclusive ?? 0).toString(),
                        filters[facet.key ?? 'price']?.[1] ?? (facet.available?.value?.upperBoundInclusive ?? 0).toString()]"
                    :min="facet.available?.value?.lowerBoundInclusive"
                    :max="facet.available?.value?.upperBoundInclusive"
                    @update:value="(val) => filters[facet.key ?? 'price'] = val"
                    @update="priceChange"
                    />
            </template>                          -->
        </div>
    </template>
</template>

<script setup lang="ts">
import type { CategoryHierarchyFacetResultCategoryNode, ProductDataStringValueFacet, ContentDataStringValueFacet, ProductCategoryResult, ProductDataDoubleRangeFacet, ProductFacetResult } from '@relewise/client';
import { nextTick, toRefs, type PropType } from 'vue';
import Slider from '@vueform/slider';
import CheckListFacet from './ChecklistFacet.vue';
import RangeFacet from './RangeFacet.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';
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

    const nameAsProp = name; //name.charAt(0).toLowerCase() + name.slice(1);
 
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

function shouldRenderFacet(facet: any): boolean {
    if(((facet.$type === 'Relewise.Client.DataTypes.Search.Facets.Result.ProductDataDoubleRangeFacetResult, Relewise.Client') && (facet.available?.hits < 1)))
        {
            //Don't render range facets without hits. 
            return false;
        }

return (
    (facet.field === 'Brand' && !props.hideBrandFacet) ||
    ((facet as ProductDataDoubleRangeFacet).key === 'EF022456_MMT_FLOAT') ||
    ((facet as ProductDataDoubleRangeFacet).key === 'EF023270_CEL_FLOAT_MIN') ||
    //((facet as ProductDataDoubleRangeFacet).key === 'EF023270_CEL_FLOAT_MAX') ||
    ((facet as ProductDataStringValueFacet).key === 'EF000007__STRING')||
    (facet.field === 'Data' && 'key' in facet && facet.key === 'Brand') ||
    (facet.field === 'Category' && !props.hideCategoryFacet) || facet.field === 'SalesPrice' || (facet.$type.includes('CategoryHierarchyFacetResult') && props.categoriesForFilterOptions)
  );
}
</script>

<style src="@vueform/slider/themes/default.css"></style>