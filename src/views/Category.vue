<template>
    <div class="category-page">
        <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb"/>
        <div class="flex gap-3">
            <div v-if="result?.facets || (childCategories?.length ?? 0) > 0" class="hidden lg:block w-1/5">
                <div v-if="(childCategories?.length ?? 0) > 0" class="px-3 py-3 bg-white rounded mb-3">
                    <div class="font-semibold text-lg mb-2">
                        Categories
                    </div>
                    <ul>
                        <li v-for="(childCategory, index) in childCategories" :key="index">
                            <RouterLink 
                                :to="{ name: parentCategoryId ? 'sub-sub-category' : 'sub-category', params: { grand: parentCategoryId, parent: categoryId, id: childCategory.category.categoryId } }"
                                class="text-zinc-700 hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer">
                                {{ childCategory.category.displayName ?? childCategory.category.categoryId }} 
                            </RouterLink>
                        </li>    
                    </ul>
                </div>
                
                <Facets v-if="result?.facets"
                        v-model:page="page"
                        :filters="filters"
                        :facets="result.facets"
                        :render-category-facet="!renderCatoryLinks"
                        @search="search"/>
            </div>
            <div class="w-full lg:w-4/5">
                <div v-if="result?.results">
                    <div class="grid grid-cols-2 bg-white rounded p-3 gap-1 items-end lg:flex lg:gap-4">
                        <div>
                            <h1 class="text-xl lg:text-3xl font-semibold">
                                {{ category?.displayName }}
                            </h1>
                            <span v-if="result.hits > 0" class="text-sm lg:text-base whitespace-nowrap">
                                Showing {{ (page * 40) - 39 }} - {{ result?.hits < 40 ? result?.hits : page * 40 }} of
                                {{ result?.hits }} </span>
                        </div>

                        <div class="hidden lg:block lg:flex-grow">
                        </div>
                        <Sorting v-model="filters.sort" @change="search"/>
                    </div>
                    <div v-if="products" class="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3">
                        <ProductTile v-for="(product, pIndex) in products"
                                     :key="pIndex"
                                     :product="product.product"
                                     :is-promotion="product.isPromotion"/>
                    </div>

                    <div class="py-3 flex justify-center">
                        <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="40" @change="search"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div v-if="rightProducts" class="absolute flex flex-col gap-3" style="top:110px; right: -220px">
        <ProductTile v-for="(product, pIndex) in rightProducts.slice(0, 4)"
                     :key="pIndex"
                     :product="product.product"
                     :is-promotion="product.isPromotion"
                     class="w-[200px]"/>
    </div>
</template>

<script lang="ts" setup>
import Pagination from '../components/Pagination.vue';
import ProductTile from '../components/ProductTile.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import Facets from '../components/Facets.vue';
import { ref, type Ref, watch } from 'vue';
import { ProductSearchBuilder, type PriceRangeFacetResult, type ProductSearchResponse, ProductCategorySearchBuilder, type ProductCategorySearchResponse, type CategoryResult, type CategoryHierarchyFacetResult, type CategoryHierarchyFacetResultCategoryNode, type CategoryNameAndIdResult } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { useRoute } from 'vue-router';
import trackingService from '@/services/tracking.service';
import router from '@/router';
import type { ProductWithType } from '@/types';
import breakpointService from '@/services/breakpoint.service';
import Sorting from '../components/Sorting.vue';
import { RouterLink } from 'vue-router';

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
const filters = ref<Record<string, string | string[]>>({ price: [], sort: '' });
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
            .setSelectedCategoryProperties({ displayName: true, paths: true })
            .filters(f => f.addProductCategoryIdFilter('ImmediateParentOrItsParent', [id]))
            .facets(f => f.addProductCategoryHierarchyFacet('Descendants', [], { displayName: true }))
            .build();

        const searcher = contextStore.getSearcher();
        const response: ProductCategorySearchResponse | undefined = await searcher.searchProductCategories(request);
        contextStore.assertApiCall(response);

        if (response?.results) {
            category.value = response.results[0];
            breadcrumb.value = [];
            if (response.facets && response.facets.items) {
                if (grandParentCategoryId.value) {
                    const numse = findCategoryById((response.facets.items[0] as CategoryHierarchyFacetResult).nodes, grandParentCategoryId.value);
                    breadcrumb.value.push({id: numse?.category.categoryId, displayName: numse?.category.displayName});
                }
                if (parentCategoryId.value) {
                    const numse = findCategoryById((response.facets.items[0] as CategoryHierarchyFacetResult).nodes, parentCategoryId.value);
                    breadcrumb.value.push({id: numse?.category.categoryId, displayName: numse?.category.displayName});
                }
                breadcrumb.value.push({ id: category.value.categoryId, displayName: category.value.displayName});

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

    let applySalesPriceFacet = false;
    if (result.value?.facets?.items?.length === 3) {
        const salesPriceFacet = result.value?.facets.items[2] as PriceRangeFacetResult;
        applySalesPriceFacet = salesPriceFacet && filters.value.price.length === 2 && Number(filters.value.price[0]) !== salesPriceFacet.available!.value?.lowerBoundInclusive || Number(filters.value.price[1]) !== salesPriceFacet.available!.value?.upperBoundInclusive;
    }

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
        })
        .facets(f => {
            if (renderCatoryLinks.value) {
                f.addProductCategoryHierarchyFacet('Descendants', [{ breadcrumbPathStartingFromRoot: [{ id: categoryId.value }]}], { displayName: true });
            } else {
                f.addCategoryFacet('ImmediateParent', Array.isArray(filters.value['category']) && filters.value['category'].length > 0 ? filters.value['category'] : null);
            }
            f.addBrandFacet(Array.isArray(filters.value['brand']) && filters.value['brand'].length > 0 ? filters.value['brand'] : null);
            f.addSalesPriceRangeFacet('Product', applySalesPriceFacet ? Number(filters.value.price[0]) : undefined, applySalesPriceFacet ? Number(filters.value.price[1]) : undefined);
        })
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

    const query = { ...router.currentRoute.value.query, ...filters.value };
    if (!applySalesPriceFacet) delete query.price;

    await router.push({ path: route.path, query: query });

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

        if (response.facets.items[2] !== null) {
            const salesPriceFacet = response.facets!.items[2] as PriceRangeFacetResult;
            if (Object.keys(salesPriceFacet.selected ?? {}).length === 0 && 'available' in salesPriceFacet && salesPriceFacet.available && 'value' in salesPriceFacet.available) {
                filters.value.price = [salesPriceFacet.available.value?.lowerBoundInclusive.toString() ?? '', salesPriceFacet.available.value?.upperBoundInclusive.toString() ?? ''];
            }
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

// TODO: this is duplicated
function findCategoryById(
    nodes: CategoryHierarchyFacetResultCategoryNode[],
    id: string,
): CategoryHierarchyFacetResultCategoryNode | null {
    for (const node of nodes) {
        // Check if the current node has the desired category id
        if (node.category.categoryId === id) {
            return node;
        }

        // If the node has children, search recursively
        if (node.children) {
            const result = findCategoryById(node.children, id);
            if (result) {
                return result;
            }
        }
    }

    // Return null if not found in any node
    return null;
}
</script>
