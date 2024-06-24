<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router';
import contextStore from './stores/context.store';
import { Searcher, type CategoryResult, type CategoryHierarchyFacetResult, ProductSearchBuilder, type CategoryHierarchyFacetResultCategoryNode } from '@relewise/client8';
import { ref } from 'vue';
import { computed } from 'vue';
import basketService from './services/basket.service';
import ApiErrors from './components/ApiErrors.vue';
import Header from './layout/Header.vue';
import Footer from './layout/Footer.vue';
import breakpointService from './services/breakpoint.service';

export type NavigationItem = { id: string, category: CategoryResult, children: CategoryHierarchyFacetResultCategoryNode[]; }

const mainCategories = ref<NavigationItem[]>([]);
const footer = ref<NavigationItem[]>([]);
const hasChildCategories = ref(true);
const router = useRouter();
const lineItemsCount = computed(() => basketService.model.value.lineItems.length);
const breakpoint = computed(() => breakpointService.active.value);

init();

async function init() {
    const params = new URLSearchParams(window.location.search);
    let query = undefined;
    if (params.has('share')) {
        query = { share: params.get('share') };
        await router.push({ path: '/app-settings', query: query });
    }

    if (contextStore.isConfigured) {
        const searcher = contextStore.getSearcher();

        getCategories(searcher);
    }
}

async function getCategories(searcher: Searcher) {
    const request = new ProductSearchBuilder(contextStore.defaultSettings)
        .pagination(p => p.setPageSize(0))
        .facets(f => f.addProductCategoryHierarchyFacet('ImmediateParent', null, { displayName: true, paths: true }))
        .build();

    const response = await searcher.searchProducts(request);

    const categoryFacet = response?.facets?.items![0] as CategoryHierarchyFacetResult;
    const navigation: NavigationItem[] = categoryFacet.nodes
        .filter(x => !!x.category.displayName)
        .sort((a, b) => a.category.displayName?.localeCompare(b?.category.displayName ?? '') ?? 0)
        .map(x => ({ id: x.category.categoryId!, category: x.category, children: x.children ?? [] }));

    hasChildCategories.value = navigation.some(x => x.children.length > 0);
    mainCategories.value = navigation;
    footer.value = navigation.slice(0, 4);
}

</script>

<template>
    <ApiErrors/>
    <Header :line-items-count="lineItemsCount"
            :has-child-categories="hasChildCategories"
            :main-categories="mainCategories"/>

    <div id="main-container" class="container px-2 mx-auto pt-3 pb-10 flex-grow relative">
        <RouterView/>
    </div>
    <Footer :has-child-categories="hasChildCategories" :main-categories="mainCategories" :footer="footer"/>

    <div class="fixed px-2 py-0.5 rounded bg-red-600 bottom-0 right-0 z-[10000] text-white text-xs font-mono uppercase">
        {{ breakpoint }}
    </div>
</template>

<style lang="scss">
.scrollable-element {
    &::-webkit-scrollbar {
        height: 4px !important;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.5);
        border-radius: 20px;
        border: transparent;
    }
}

$headerHeight: 104px;

.navigationmodal {
    @apply bg-white overflow-hidden;
    position: fixed;
    z-index: 1000;
    top: $headerHeight; // height of header
    left: 0;
    width: 100%;
    height: calc(100% - $headerHeight);

    .backdrop {
        background: rgba(155, 155, 155, 0.5);
        position: fixed;
        z-index: 1;
        left: 0;
        width: 100%;
        height: calc(100% - $headerHeight);
    }

    .modalcontent {
        z-index: 1002;
    }
}
</style>
