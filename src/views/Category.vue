<template>
    <div class="category-page container mx-auto p-2 xl:p-0 relative">
        <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb"/>

        <h1 class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block">
            {{ category?.displayName }}
        </h1>

        <div class="flex gap-10">
            <div v-if="result?.facets || (childCategories?.length ?? 0) > 0" class="hidden lg:block w-1/5">
                <div v-if="(childCategories?.length ?? 0) > 0" class="mb-6 border-b border-solid border-slate-300 pb-6">
                    <div class="font-semibold text-lg mb-1">
                        Categories
                    </div>
                    <ul>
                        <li v-for="(childCategory, index) in childCategories" :key="index">
                            <RouterLink 
                                :to="{ name: parentCategoryId ? 'sub-sub-category' : 'sub-category', params: { grand: parentCategoryId, parent: categoryId, id: childCategory.category.categoryId } }"
                                class="text-slate-700 hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer">
                                {{ childCategory.category.displayName ?? childCategory.category.categoryId }} 
                            </RouterLink>
                        </li>    
                    </ul>
                </div>
                
                <Facets v-if="result?.facets"
                        :filters="filters"
                        :facets="result.facets"
                        :context="'Category'"
                        @search="search"/>
            </div>
            <div class="w-full lg:w-4/5">
                <div v-if="result?.results">
                    <div class="grid grid-cols-1 xl:grid-cols-2 bg-white rounded gap-1 lg:flex lg:gap-4 items-start">
                        <div>
                            <span v-if="result.hits > 0" class="text-sm lg:text-base whitespace-nowrap">
                                Showing {{ (page * 40) - 39 }} - {{ result?.hits < 40 ? result?.hits : page * 40 }} of
                                {{ result?.hits }} products </span>
                        </div>

                        <div class="hidden lg:block lg:flex-grow">
                        </div>
                        <Sorting v-model="filters.sort" type="Product" @change="search"/>
                    </div>
                    <div v-if="products" class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3">
                        <ProductTile v-for="(product, pIndex) in products"
                                     :key="pIndex"
                                     :product="product.product"
                                     :is-promotion="product.isPromotion"/>
                    </div>

                    <div class="py-3 flex justify-center mt-10">
                        <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="40" @change="search"/>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="rightProducts" class="absolute h-[95%] top-[110px] -right-56 flex flex-col gap-2">
            <ProductTile
                v-for="(product, pIndex) in rightProducts.slice(0, 4)"
                :key="pIndex"
                :product="product.product"
                :is-promotion="product.isPromotion"
                class="w-[200px]"/>
        </div>
    </div>
</template>


<script lang="ts" setup>
import Pagination from '../components/Pagination.vue';
import ProductTile from '../components/ProductTile.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import Facets from '../components/Facets.vue';
import { ref, type Ref, watch } from 'vue';
import { ProductSearchBuilder, type ProductSearchResponse, ProductCategorySearchBuilder, type ProductCategorySearchResponse, type CategoryResult, type CategoryHierarchyFacetResult, type CategoryHierarchyFacetResultCategoryNode, type CategoryNameAndIdResult } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { useRoute } from 'vue-router';
import trackingService from '@/services/tracking.service';
import router from '@/router';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';
import Sorting from '../components/Sorting.vue';
import { RouterLink } from 'vue-router';
import { findCategoryById } from '@/helpers/categoryHelper';
import { addRelevanceModifiers } from '@/helpers/relevanceModifierHelper';
import { getFacets } from '@/helpers/facetHelper';

const products = ref<ProductWithType[] | null>(null);
const rightProducts = ref<ProductWithType[] | null>(null);
const route = useRoute();
const category = ref<CategoryResult | undefined>(undefined);
const childCategories = ref<CategoryHierarchyFacetResultCategoryNode[] | undefined>(undefined);
const result: Ref<ProductSearchResponse | undefined> = ref<ProductSearchResponse | undefined>(undefined);
const categoryId = ref<string>('');
const parentCategoryId = ref<string | undefined>();
const grandParentCategoryId = ref<string | undefined>();
const page = ref<number>(1);
const filters = ref<Record<string, string | string[]>>({ sort: '' });
const renderCatoryLinks = ref<boolean | undefined>(false);
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();

async function init() {
    const id = route.params.id;
    parentCategoryId.value = Array.isArray(route.params.parent) 
        ? route.params.parent[0] 
        : route.params.parent;

    grandParentCategoryId.value = Array.isArray(route.params.grand) ? 
        route.params.grand[0]
        : route.params.grand;

    // We never want to go any deeper than a third level category
    renderCatoryLinks.value = !grandParentCategoryId.value && (!parentCategoryId.value || contextStore.context.value.allowThirdLevelCategories); 

    if (id && !Array.isArray(id) && id !== categoryId.value) {
        trackingService.trackProductCategoryView(id);

        const facets = new URLSearchParams(window.location.search);
        facets.forEach((value, key) => {
            if (key === 'sort') { filters.value.sort = value; return; }
            const existing = filters.value[key];
            existing && Array.isArray(existing) ? existing.push(value) : filters.value[key] = [value];
        });

        const request = new ProductCategorySearchBuilder(contextStore.defaultSettings)
            .setSelectedCategoryProperties({ displayName: true })
            .filters(f => {
                f.addProductCategoryIdFilter('ImmediateParentOrItsParent', [id]);
            })
            .facets(f => f.addProductCategoryHierarchyFacet('Descendants', [], { displayName: true }))
            .build();

        const searcher = contextStore.getSearcher();
        const response: ProductCategorySearchResponse | undefined = await searcher.searchProductCategories(request);
        contextStore.assertApiCall(response);

        if (response?.results) {
            category.value = response.results[0];

            if (response.facets && response.facets.items) {

                // Resetting the breadcrumb
                breadcrumb.value = [];

                const categoryHeirachy = (response.facets.items[0] as CategoryHierarchyFacetResult).nodes;

                if (grandParentCategoryId.value) {
                    const categoryFound = findCategoryById(categoryHeirachy, grandParentCategoryId.value);
                    breadcrumb.value.push({
                        id: categoryFound?.category.categoryId,
                        displayName: categoryFound?.category.displayName,
                    });
                }
                
                if (parentCategoryId.value) {
                    const categoryFound = findCategoryById(categoryHeirachy, parentCategoryId.value);
                    breadcrumb.value.push({
                        id: categoryFound?.category.categoryId,
                        displayName: categoryFound?.category.displayName,
                    });
                }

                breadcrumb.value.push({
                    id: category.value.categoryId,
                    displayName: category.value.displayName,
                });

            }
        }

        categoryId.value = id;
        search();
    }
}

init();

watch(route, () => {
    if (route.query.open !== '1')
        init();
});

watch(breakpointService.active, () => {
    if (route.query.open !== '1')
        search();
});

async function search() {
    const variationName = breakpointService.active.value.toUpperCase();
    scrollTo({ top: 0 });

    const request = new ProductSearchBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setExplodedVariants(1)
        .setRetailMedia({
            location: {
                key: 'PRODUCT_LISTING_PAGE',
                placements: [{ key: 'TOP' }, { key: 'RIGHT' }],
                variation: { key: variationName },
            },
        })
        .filters(f => {
            f.addProductCategoryIdFilter('Ancestor', [categoryId.value]);
            contextStore.userClassificationBasedFilters(f);
        })
        .facets(f => {
            if (renderCatoryLinks.value) {
                f.addProductCategoryHierarchyFacet('Descendants', [{ breadcrumbPathStartingFromRoot: [{ id: categoryId.value }]}], { displayName: true });
            } else {
                f.addCategoryFacet('ImmediateParent', Array.isArray(filters.value['category']) && filters.value['category'].length > 0 ? filters.value['category'] : null);
            }
            getFacets('Category', f, filters.value);
        })
        .relevanceModifiers(r => addRelevanceModifiers(r))
        .pagination(p => p.setPageSize(40).setPage(page.value))
        .sorting(s => {
            if (filters.value.sort === 'Popular') {
                s.sortByProductPopularity();
            }
            else if (filters.value.sort === 'SalesPriceDesc') {
                s.sortByProductAttribute('SalesPrice', 'Descending');
            }
            else if (filters.value.sort === 'SalesPriceAsc') {
                s.sortByProductAttribute('SalesPrice', 'Ascending');
            }
        })
        .build();

    const query = { ...filters.value };
    await router.push({ path: route.path, query: query, replace: true });

    const searcher = contextStore.getSearcher();
    const response: ProductSearchResponse | undefined = await searcher.searchProducts(request);
    contextStore.assertApiCall(response);

    if (response && response.facets && response.facets.items) {
        if (renderCatoryLinks.value && response.facets.items[0] !== null) {
            const categoryHeirarchyFacetResult = (response.facets.items[0] as CategoryHierarchyFacetResult);
            var root: CategoryHierarchyFacetResultCategoryNode | null = categoryHeirarchyFacetResult.nodes[0];
            while (root.category.categoryId !== categoryId.value) {
                if (!root.children) {
                    root = null;
                    break;
                } 

                root = root.children[0];
            }
            if (root != null) {
                childCategories.value = root.children ?? undefined;
            }
        } else {
            childCategories.value = undefined;
        }
    }

    products.value = response?.results?.map(x => ({ isPromotion: false, product: x })) ?? [];
    rightProducts.value = [];
    if (response?.retailMedia?.placements) {
        const placement = response.retailMedia.placements.TOP;
        if (placement) {

            if (placement?.results) {
                products.value = placement.results
                    .map(x => ({ isPromotion: true, product: x.promotedProduct?.result! }))
                    .concat(products.value ?? []);
            }
        }

        const rightPlacement = response.retailMedia.placements.RIGHT;
        if (rightPlacement && breakpointService.active.value === 'largeDesktop') {

            if (rightPlacement?.results) {
                rightProducts.value = rightPlacement.results
                    .map(x => ({ isPromotion: true, product: x.promotedProduct?.result! }));
            }
        }
    }

    result.value = response;
}
</script>
