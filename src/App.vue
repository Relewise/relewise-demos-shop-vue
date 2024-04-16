<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import Header from './layout/Header.vue';
import contextStore from './stores/context.store';
import { Searcher, type CategoryResult, type CategoryHierarchyFacetResult, ProductSearchBuilder, type CategoryHierarchyFacetResultCategoryNode } from '@relewise/client';
import { ref } from 'vue';
import { computed } from 'vue';
import basketService from './services/basket.service';
import ApiErrors from './components/ApiErrors.vue';

export type NavigationItem = { id: string, category: CategoryResult, children: CategoryHierarchyFacetResultCategoryNode[]; }

const mainCategories = ref<NavigationItem[]>([]);
const footer = ref<NavigationItem[]>([]);
const hasChildCategories = ref(true);
const router = useRouter();
const lineItemsCount = computed(() => basketService.model.value.lineItems.length);

init();

async function init() {
    const params = new URLSearchParams(window.location.search);
    let query = undefined;
    if (params.has('share')) {
        query = { share: params.get('share') };
        await router.push({ path: '/app-settings', query: query });
    }

    if (contextStore.isConfigured()) {
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
    <ApiErrors />
    <Header
        :line-items-count="lineItemsCount"
        :has-child-categories="hasChildCategories"
        :main-categories="mainCategories" />

    <div id="main-container" class="container px-4 mx-auto pt-3 pb-10 flex-grow">
        <RouterView />
    </div>

    <footer class="bg-white">
        <div class="container px-6 py-12 mx-auto">
            <template v-if="hasChildCategories">
                <div v-if="footer"
                    class="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    <div v-for="category in footer" :key="category.id">
                        <h3 class="text-lg font-medium text-zinc-800">
                            {{ category.category.displayName }}
                        </h3>

                        <div v-for="child in category.children" :key="child.category.categoryId ?? ''"
                            class="flex flex-col items-start mt-2 space-y-4">
                            <RouterLink :to="{ name: 'category', params: { id: child.category.categoryId } }"
                                class="text-zinc-700 transition-colors duration-200 hover:underline hover:text-brand-500">
                                {{ child.category.displayName }}
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else-if="mainCategories.length > 0">
                <h3 class="font-medium text-zinc-800 text-xl mb-2">
                    Categories
                </h3>
                <div class="grid grid-cols-2 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    <div v-for="cat in mainCategories" :key="cat.id ?? ''"
                        class="flex flex-col items-start mt-2 space-y-4">
                        <RouterLink :to="{ name: 'category', params: { id: cat.id } }"
                            class="text-zinc-700 transition-colors duration-200 hover:underline hover:text-brand-500">
                            {{ cat.category.displayName }}
                        </RouterLink>
                    </div>
                </div>
            </template>


            <hr v-if="hasChildCategories || mainCategories.length > 0" class="my-6 border-zinc-200 md:my-5">

            <div class="flex flex-col items-center justify-between sm:flex-row">
                <a href="https://relewise.com/contact-us/">
                    <img src="/logo.svg" class="h-14">
                </a>

                <p class="mt-4 text-sm text-zinc-500 sm:mt-0 text-zinc-300">
                    © Copyright {{ new Date().getFullYear() }}
                </p>
            </div>
        </div>
    </footer>
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
