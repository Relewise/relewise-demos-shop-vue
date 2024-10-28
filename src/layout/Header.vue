<script setup lang="ts">
import { AdjustmentsHorizontalIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline';
import { onClickOutside } from '@vueuse/core';
import { ref, type PropType, onBeforeUnmount } from 'vue';
import SearchOverlay from '../components/SearchOverlay.vue';
import type { NavigationItem } from '@/App.vue';
import SideMenu from '@/components/SideMenu.vue';
import Popover from '@/components/Popover.vue';
import ContextSwitcher from '@/components/ContextSwitcher.vue';

defineProps({
    lineItemsCount: { type: Number, required: true},
    hasChildCategories: { type: Boolean, required: true},
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true},
});

const navigationmodal = ref<HTMLElement | null>(null);
onClickOutside(navigationmodal, () => open.value = null);

const open = ref<string | null>(null);
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

const handleMouseOver = (categoryId: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout); 
    hoverTimeout = setTimeout(() => {
        document.body.classList.add('overflow-hidden', 'mr-4');
        open.value = categoryId;
    }, 250);
};

const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);

    const searchParams = new URLSearchParams(window.location.search);
    const isSearchOverlayOpen = searchParams.get('open') === '1' ? true : false;
    
    if (!isSearchOverlayOpen) {
        document.body.classList.remove('overflow-hidden');
        document.body.classList.remove('mr-4');    
    }
    
    open.value = null;
};

onBeforeUnmount(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout); 
});
</script>

<template>
    <header class="bg-white shadow-sm" @mouseleave="handleMouseLeave">
        <div class="container mx-auto px-2">
            <div class="grid xl:flex gap-2 py-2" @mouseover="handleMouseLeave">
                <div class="flex items-center">
                    <div class="xl:hidden">
                        <SideMenu :main-categories="mainCategories"/>
                    </div>
                    <RouterLink to="/"
                                class="font-semibold text-2xl uppercase text-black leading-normal block hover:opacity-70 transitions ease-in-out delay-150">
                        Relewise <span class="text-white bg-zinc-900 rounded-sm px-1">demo</span> shop
                    </RouterLink>
                </div>
                <div class="ml-0 flex gap-2 flex-grow">
                    <div class="xl:items-center flex-grow">
                        <SearchOverlay/>
                    </div>
                    <div class="flex items-center gap-4">
                        <RouterLink to="/cart" class="relative rounded-full bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200">
                            <ShoppingBagIcon class="h-8 w-8"/>
                            <span v-if="lineItemsCount > 0"
                                  class="absolute top-0 right-0 leading-none inline-flex items-center justify-center -mr-1 h-4 w-4 pb-0.5 bg-brand-500 rounded-full text-white text-[11px]">
                                {{ lineItemsCount }}
                            </span>
                        </RouterLink>
                        <Popover placement="bottom-end">
                            <div class="relative rounded-full bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200 cursor-pointer">
                                <AdjustmentsHorizontalIcon class="h-8 w-8"/>
                            </div>
                            <template #content>
                                <div class="w-96">
                                    <ContextSwitcher/>
                                </div>
                            </template>
                        </Popover>
                    </div>
                </div>
            </div>
            <nav class="hidden xl:block">
                <ul class="flex w-full gap-2">
                    <ul v-if="hasChildCategories" class="flex overflow-y-auto scrollable-element">
                        <li v-for="category in mainCategories" :key="category.id ?? ''" class="inline-flex relative pr-5">
                            <RouterLink 
                                :to="{ name: 'category', params: { id: category.id } }"
                                class="font-semibold uppercase py-3 leading-none text-lg text-zinc-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                                @mouseover="handleMouseOver(category.id)">
                                {{ category.category.displayName ?? category.category.categoryId }}
                            </RouterLink>
                            <div v-if="open === category.id" to="#navigationmodal">
                                <div ref="navigationmodal" class="navigationmodal" @mouseover="handleMouseOver(category.id)">
                                    <div class="bg-white overflow-x-auto modalcontent">
                                        <div class="container mx-auto">
                                            <ul v-if="category.children.length > 0"
                                                class="text-base z-10 list-none grid grid-cols-2 mb-3 -mx-2">
                                                <li v-for="child in category.children"
                                                    :key="child.category.categoryId ?? ''"
                                                    class="text-sm block">
                                                    <RouterLink
                                                        :to="{ name: 'sub-category', params: { parent: category.id, id: child.category.categoryId } }"
                                                        class="block px-2 py-2 rounded cursor-pointer hover:bg-gray-100 text-gray-700"
                                                        @click="handleMouseLeave">
                                                        {{ child.category.displayName }}
                                                    </RouterLink>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="backdrop" @mouseenter="handleMouseLeave"></div>
                                </div>
                            </div>
                        </li>
                    </ul>
                    <ul v-else-if="mainCategories.length > 0">
                        <div class="font-semibold uppercase py-3 leading-none text-lg text-zinc-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                             @mouseover="handleMouseOver('1')">
                            Categories
                        </div>
                        <div v-if="open === '1'" to="#navigationmodal">
                            <div ref="navigationmodal" class="navigationmodal">
                                <div class="bg-white overflow-x-auto mb-5 modalcontent">
                                    <div class="container mx-auto">
                                        <ul class="text-base z-10 max-h-96 list-none grid grid-cols-4 mb-3">
                                            <li v-for="category in mainCategories"
                                                :key="category.id ?? ''"
                                                class="text-sm block">
                                                <RouterLink :to="{ name: 'category', params: { id: category.id } }"
                                                            class="block px-2 py-1 rounded cursor-pointer hover:bg-gray-100 text-gray-700"
                                                            @click="() => {
                                                                open = null;
                                                                handleMouseLeave();
                                                            }">
                                                    {{ category.category.displayName }}
                                                </RouterLink>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="backdrop" @mouseenter="handleMouseLeave"></div>
                            </div>
                        </div>
                    </ul>
                    <li class="flex-grow"></li>
                </ul>
            </nav>
        </div>
    </header>
</template>
