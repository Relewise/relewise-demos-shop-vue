<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import SearchOverlay from './components/SearchOverlay.vue';
import { ShoppingBagIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';
import contextStore from './stores/context.store';
import { Searcher, type CategoryResult, type CategoryHierarchyFacetResult, ProductSearchBuilder, type CategoryHierarchyFacetResultCategoryNode } from '@relewise/client';
import { ref } from 'vue';
import { computed } from 'vue';
import basketService from './services/basket.service';
import { watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import ApiErrors from './components/ApiErrors.vue';

type NavigationItem = { id: string, category: CategoryResult, children: CategoryHierarchyFacetResultCategoryNode[]; }

const mainCategories = ref<NavigationItem[]>([]);
const footer = ref<NavigationItem[]>([]);
const open = ref<string | null>(null);
const hasChildCategories = ref(true);
const router = useRouter();
const lineItemsCount = computed(() => basketService.model.value.lineItems.length);
const navigationmodal = ref(null);

onClickOutside(navigationmodal, () => open.value = null);
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

watch(open, () => {
    if (open.value) {
        window.document.body.classList.add('overflow-hidden');
        window.document.body.classList.add('pr-[17px]');
    } else {
        window.document.body.classList.remove('overflow-hidden');
        window.document.body.classList.remove('pr-[17px]');
    }
});
</script>

<template>
    <ApiErrors/>
    <header class="bg-white shadow-sm">
        <div class="container mx-auto">
            <div class="flex gap-10 py-2">
                <div class="flex items-center">
                    <RouterLink to="/"
                                class="font-semibold text-2xl uppercase text-black leading-normal block hover:opacity-70 transitions ease-in-out delay-150">
                        Relewise <span class="text-white bg-zinc-900 rounded-sm px-1">demo</span> shop
                    </RouterLink>
                </div>

                <div class="flex items-center flex-grow">
                    <SearchOverlay/>
                </div>

                <div class="flex items-center">
                    <RouterLink to="/cart" class="relative rounded-full bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200">
                        <ShoppingBagIcon class="h-8 w-8"/>
                        <span v-if="lineItemsCount > 0"
                              class="absolute top-0 right-0 leading-none inline-flex items-center justify-center -mr-1 h-4 w-4 pb-0.5 bg-brand-500 rounded-full text-white text-[11px]">
                            {{ lineItemsCount }}
                        </span>
                    </RouterLink>
                </div>
            </div>

            <nav class="hidden lg:block">
                <ul class="flex w-full gap-2">
                    <ul v-if="hasChildCategories" class="flex overflow-y-auto scrollable-element">
                        <li v-for="category in mainCategories" :key="category.id ?? ''" class="inline-flex relative pr-5">
                            <RouterLink :to="{ name: 'category', params: { id: category.id } }"
                                        class="font-semibold uppercase py-3 leading-none text-lg text-zinc-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                                        @mouseover="category.children.length > 0 ? open = category.id : open = null">
                                {{ category.category.displayName ?? category.category.categoryId }}
                            </RouterLink>

                            <Teleport v-if="open == category.id" to="#navigationmodal">
                                <div ref="navigationmodal" class="navigationmodal">
                                    <div class="bg-white overflow-x-auto  modalcontent">
                                        <div class="container mx-auto">
                                            <ul v-if="category.children.length > 0"
                                                class="text-base z-10 list-none grid grid-cols-2 mb-3 -mx-2">
                                                <li v-for="child in category.children"
                                                    :key="child.category.categoryId ?? ''"
                                                    class="text-sm block">
                                                    <RouterLink
                                                        :to="{ name: 'sub-category', params: { parent: category.id, id: child.category.categoryId } }"
                                                        class="text-gray-700 block px-2 py-2 rounded cursor-pointer hover:bg-gray-100 text-gray-700">
                                                        {{ child.category.displayName }}
                                                    </RouterLink>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="backdrop" @click="open = null" @mouseenter="open = null"></div>
                                </div>
                            </Teleport>
                        </li>
                    </ul>
                    <ul v-else-if="mainCategories.length > 0">
                        <div class="font-semibold uppercase py-3 leading-none text-lg text-zinc-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                             @mouseover="open = '1'">
                            Categories
                        </div>
                        <Teleport v-if="open == '1'" to="#navigationmodal">
                            <div ref="navigationmodal" class="navigationmodal">
                                <div class="bg-white overflow-x-auto mb-5 modalcontent">
                                    <div class="container mx-auto">
                                        <ul class="text-base z-10 max-h-96 list-none grid grid-cols-4 mb-3">
                                            <li v-for="category in mainCategories"
                                                :key="category.id ?? ''"
                                                class="text-sm block">
                                                <RouterLink :to="{ name: 'category', params: { id: category.id } }"
                                                            class="text-gray-700 block px-2 py-1 rounded cursor-pointer hover:bg-gray-100 text-gray-700"
                                                            @click="open = null">
                                                    {{ category.category.displayName }}
                                                </RouterLink>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="backdrop" @click="open = null" @mouseenter="open = null"></div>
                            </div>
                        </Teleport>
                    </ul>
                    <li class="flex-grow"></li>
                    <li class="inline-flex items-center">
                        <RouterLink to="/app-settings"
                                    class="text-zinc-600 inline-flex items-center whitespace-nowrap py-2 hover:text-black">
                            <Cog6ToothIcon class="w-5 h-5 mr-1"/> Configure Demo
                        </RouterLink>
                    </li>
                </ul>
            </nav>
        </div>
    </header>

    <div id="main-container" class="container mx-auto pt-3 pb-10 flex-grow">
        <RouterView/>
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

                        <div v-for="child in category.children"
                             :key="child.category.categoryId ?? ''"
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
                    <div v-for="cat in mainCategories" :key="cat.id ?? ''" class="flex flex-col items-start mt-2 space-y-4">
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
