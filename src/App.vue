<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import SearchOverlay from './components/SearchOverlay.vue';
import { ShoppingBagIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';
import contextStore from './stores/context.store';
import { ProductCategorySearchBuilder, Searcher, type CategoryResult } from '@relewise/client';
import { ref } from 'vue';
import { computed } from 'vue';
import basketService from './services/basket.service';
import { watch } from 'vue';
import { onClickOutside } from '@vueuse/core';

type NavigationItem = { id: string, category: CategoryResult, children: CategoryResult[]; }

const mainCategories = ref<NavigationItem[]>([]);
const footer = ref<NavigationItem[]>([]);
const open = ref<string | null>(null);
const router = useRouter();
const lineItemsCount = computed(() => basketService.model.value.lineItems.length);
const navigationmodal = ref(null);

onClickOutside(navigationmodal, () => open.value = null);

if (contextStore.isConfigured()) {
    const searcher = contextStore.getSearcher();

    getCategories(searcher);
}
else {
    const params = new URLSearchParams(window.location.search);
    let query = undefined;
    if (params.has('share')) {
        query = { share: params.get('share') };
    }
    router.push({ path: '/app-settings', query: query });
}

async function getCategories(searcher: Searcher) {
    const request = new ProductCategorySearchBuilder(contextStore.defaultSettings)
        .setSelectedCategoryProperties({ displayName: true })
        .filters(f => f.addProductCategoryLevelFilter(1))
        .build();

    const categories = (await searcher.searchProductCategories(request))?.results ?? [];
    const navigation: NavigationItem[] = categories
        .filter(x => x.displayName)
        .sort((a, b) => a.displayName?.localeCompare(b?.displayName ?? '') ?? 0)
        .map(x => ({ id: x.categoryId!, category: x, children: [] }));

    const subCategoriesRequest = new ProductCategorySearchBuilder(contextStore.defaultSettings)
        .setSelectedCategoryProperties({ displayName: true, paths: true })
        .filters(f => f.addProductCategoryHasParentFilter(categories.filter(x => !!x.categoryId).map(x => x.categoryId!)))
        .pagination(p => p.setPageSize(10_000))
        .build();

    let subCategories = (await searcher.searchProductCategories(subCategoriesRequest))?.results ?? [];
    subCategories = subCategories.filter(x => x.displayName).sort((a, b) => a.displayName?.localeCompare(b?.displayName ?? '') ?? 0);
    subCategories.forEach(x => {
        const parentId = x.paths![0].pathFromRoot![0].id!;
        const parent = navigation.filter(x => x.id === parentId)[0];
        parent && parent.children.push(x);
    });

    mainCategories.value = navigation;
    footer.value = navigation.splice(0,4);
}

watch(open, () => {
    if (open.value) {
        window.document.body.classList.add('overflow-hidden');
    } else {
        window.document.body.classList.remove('overflow-hidden');
    }
});
</script>

<template>
    <header class="bg-white">
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
                    <ul class="flex overflow-y-auto scrollable-element">
                        <li v-for="category in mainCategories" :key="category.id ?? ''" class="inline-flex relative">
                            <span
                                class="font-semibold uppercase pr-6 py-3 leading-none text-lg text-zinc-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                                @click="open = category.id">
                                {{ category.category.displayName ?? category.category.categoryId }}
                            </span>

                            <Teleport v-if="open == category.id" to="#navigationmodal">
                                <div ref="navigationmodal" class="navigationmodal" @click="open = null">
                                    <div class="bg-white overflow-x-auto">
                                        <div class="container mx-auto">
                                            <ul v-if="category.children.length > 0"
                                                class="text-base z-10 list-none grid grid-cols-2 mb-3 -mx-2">
                                                <li v-for="child in category.children"
                                                    :key="child.categoryId ?? ''"
                                                    class="text-sm block">
                                                    <RouterLink :to="{ name: 'category', params: { id: child.categoryId } }"
                                                                class="text-gray-700 block px-2 py-2 rounded cursor-pointer hover:bg-gray-100 text-gray-700">
                                                        {{ child.displayName }}
                                                    </RouterLink>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </Teleport>
                        </li>
                    </ul>
                    <li class="flex-grow"></li>
                    <li>
                        <RouterLink to="/app-settings"
                                    class="text-zinc-600 inline-flex items-center whitespace-nowrap hover:text-black">
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
            <div v-if="footer" class="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                <div v-for="category in footer.splice(0, 4)" :key="category.id">
                    <h3 class="text-lg font-medium text-zinc-800">
                        {{ category.category.displayName }}
                    </h3>

                    <div v-for="child in category.children" :key="child.categoryId ?? ''" class="flex flex-col items-start mt-2 space-y-4">
                        <RouterLink :to="{ name: 'category', params: { id: child.categoryId } }" class="text-zinc-700 transition-colors duration-200 hover:underline hover:text-brand-500">
                            {{ child.displayName }}
                        </RouterLink>
                    </div>
                </div>
            </div>
        
            <hr class="my-6 border-zinc-200 md:my-5">
        
            <div class="flex flex-col items-center justify-between sm:flex-row">
                <a href="https://relewise.com/contact-us/">
                    <img src="https://relewise.com/wp-content/uploads/2022/09/hdr_logo.png" class="h-14">
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
    background: rgba(155, 155, 155, 0.5);
    position: fixed;
    z-index: 1000;
    top: $headerHeight; // height of header
    left: 0;
    width: 100%;
    height: calc(100% - $headerHeight);
}</style>
