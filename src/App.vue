<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import SearchOverlay from './components/SearchOverlay.vue';
import { ShoppingBagIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';
import contextStore from './stores/context.store';
import { ProductCategorySearchBuilder, Searcher, type CategoryResult } from '@relewise/client';
import { ref } from 'vue';
import { computed } from 'vue';
import basketService from './services/basket.service';

const mainCategories = ref<CategoryResult[]>([]);
const router = useRouter();
const lineItemsCount = computed(() => basketService.model.value.lineItems.length);

try {
    if (router.currentRoute.value.path !== '/app-settings') {
        const searcher = contextStore.getSearcher();

        getCategories(searcher);
    }
}
catch (_) {
    router.push({ path: '/app-settings' });
}

async function getCategories(searcher: Searcher) {
    const request = new ProductCategorySearchBuilder(contextStore.defaultSettings)
        .setSelectedCategoryProperties({ displayName: true })
        .filters(f => f.addProductCategoryLevelFilter(1))
        .build();

    const categories = (await searcher.searchProductCategories(request))?.results ?? [];
    mainCategories.value = categories.sort((a, b) => a.displayName?.localeCompare(b?.displayName ?? '') ?? 0);
}
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
                    <ul class="flex overflow-auto scrollable-element">
                        <li v-for="category in mainCategories" :key="category.categoryId ?? ''" class="inline-flex">
                            <RouterLink :to="{ name: 'category', params: { id: category.categoryId } }"
                                        class="font-semibold uppercase pr-6 py-3 leading-none text-lg text-zinc-700 whitespace-nowrap hover:opacity-80 transitions ease-in-out delay-150">
                                {{ category.displayName }}
                            </RouterLink>
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

    <div class="bg-white">
        <div class="container mx-auto py-5 px-3 ">
            © Copyright Relewise {{ new Date().getFullYear() }}
        </div>
    </div>
</template>

<style scoped lang="scss">
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
}</style>
