<template>
  <div class="container mx-auto p-2 xl:p-0">
    <Breadcrumb :items="[{ name: 'My Agreed Orders', route: { name: 'agreed-orders' } }]" />
    <div class="grid grid-cols-1 gap-1 items-center lg:flex lg:gap-4">
      <div>
        <h1 class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block">
          My Agreed Orders
        </h1>
        <span
          v-if="results && results.hits > 0"
          class="ml-4 text-sm lg:text-base whitespace-nowrap"
        >
          Showing {{ firstVisibleProduct }}–{{ lastVisibleProduct }} of {{ results.hits }} products
        </span>
      </div>
      <div class="hidden lg:block lg:flex-grow" />
      <Sorting
        v-model="filters.sort"
        type="Product"
        @change="applyFilters"
      />
    </div>

    <div
      v-if="!hasAgreementAccess"
      class="mt-6"
    >
      <p class="text-lg font-semibold">
        No agreed orders available
      </p>
      <p>The current customer does not have access to any agreed orders.</p>
    </div>

    <template v-else-if="results">
      <div class="flex gap-10">
        <aside
          v-if="results.facets"
          class="hidden lg:block w-1/5"
        >
          <Facets
            :filters="filters"
            :facets="results.facets"
            context="AgreedOrders"
            @search="applyFilters"
          />
        </aside>

        <div class="w-full lg:w-4/5">
          <div
            v-if="results.hits === 0"
            class="mt-6"
          >
            <p class="text-lg font-semibold">
              No agreed-order products available
            </p>
            <p>No purchasable products currently match this customer's agreed orders.</p>
          </div>

          <template v-else>
            <div class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3">
              <ProductTile
                v-for="product in results.results"
                :key="`${product.productId}-${product.variant?.variantId ?? ''}`"
                :product="product"
              />
            </div>

            <div class="py-3 flex justify-center mt-10">
              <Pagination
                v-model="page"
                :total="results.hits"
                :page-size="PAGE_SIZE"
              />
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ProductSearchBuilder, type ProductSearchResponse } from '@relewise/client';
import Breadcrumb from '@/components/Breadcrumb.vue';
import Facets from '@/components/Facets.vue';
import Pagination from '@/components/Pagination.vue';
import ProductTile from '@/components/ProductTile.vue';
import Sorting from '@/components/Sorting.vue';
import {
    addAgreedOrderFilter,
    addScopedPriceEligibilityFilter,
    hasAgreedOrderAccess,
    removeEmptyBestPriceFacetSelection,
    sortByBestPrice,
} from '@/helpers/bestPriceSearch';
import { getFacets } from '@/helpers/facetHelper';
import { applyVariantRequestSettings } from '@/helpers/productSearchRequest';
import { addRelevanceModifiers } from '@/helpers/relevanceModifierHelper';
import router from '@/router';
import contextStore from '@/stores/context.store';

const PAGE_SIZE = 40;
const results = ref<ProductSearchResponse>();
const page = ref(1);
const filters = ref<Record<string, string | string[]>>({ sort: '' });
const hasAgreementAccess = ref(false);
const firstVisibleProduct = computed(() => ((page.value - 1) * PAGE_SIZE) + 1);
const lastVisibleProduct = computed(() => Math.min(page.value * PAGE_SIZE, results.value?.hits ?? 0));

loadFiltersFromUrl();
onMounted(search);
watch(page, search);

async function search() {
    const pricingContext = contextStore.createSearchPricingContext();
    hasAgreementAccess.value = hasAgreedOrderAccess(pricingContext);
    if (!hasAgreementAccess.value) {
        results.value = undefined;
        return;
    }

    const selectedCategories = filters.value.category;
    const categoryFilterThreshold = contextStore.context.value.allowThirdLevelCategories ? 3 : 2;
    const request = removeEmptyBestPriceFacetSelection(applyVariantRequestSettings(new ProductSearchBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .pagination(builder => builder.setPage(page.value).setPageSize(PAGE_SIZE))
        .filters(builder => {
            if (Array.isArray(selectedCategories)) {
                selectedCategories.slice(0, categoryFilterThreshold).forEach(categoryId => {
                    builder.addProductCategoryIdFilter('Ancestor', categoryId);
                });
            }

            const selectedBrands = filters.value.Brand;
            if (Array.isArray(selectedBrands) && selectedBrands.length > 0) {
                builder.addBrandIdFilter(selectedBrands);
            }

            contextStore.userClassificationBasedFilters(builder);
            addScopedPriceEligibilityFilter(builder, pricingContext);
            addAgreedOrderFilter(builder, { agreedOrder: 'true' }, pricingContext);
        })
        .facets(builder => getFacets('AgreedOrders', builder, filters.value, pricingContext))
        .relevanceModifiers(builder => addRelevanceModifiers(builder))
        .sorting(builder => {
            if (filters.value.sort === 'Popular') {
                builder.sortByProductPopularity();
            } else if (filters.value.sort === 'SalesPriceDesc') {
                sortByBestPrice(builder, 'Descending', pricingContext);
            } else if (filters.value.sort === 'SalesPriceAsc') {
                sortByBestPrice(builder, 'Ascending', pricingContext);
            }
        }), contextStore.context.value)
        .build());

    await persistFiltersInUrl();

    results.value = await contextStore.getSearcher().searchProducts(request);
}

async function applyFilters() {
    if (page.value !== 1) {
        page.value = 1;
        return;
    }

    await search();
}

function loadFiltersFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.forEach((value, key) => {
        if (key === 'page') {
            const parsedPage = Number(value);
            page.value = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
            return;
        }

        if (key === 'sort') {
            filters.value.sort = value;
            return;
        }

        const existing = filters.value[key];
        if (Array.isArray(existing)) {
            if (!existing.includes(value)) existing.push(value);
        } else {
            filters.value[key] = [value];
        }
    });
}

async function persistFiltersInUrl() {
    const query = {
        ...filters.value,
        ...(page.value > 1 ? { page: page.value.toString() } : {}),
    };
    await router.replace({ path: '/agreed-orders', query });
}
</script>
