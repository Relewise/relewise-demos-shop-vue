<script setup lang="ts">
import { ChevronDownIcon, HeartIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline';
import { ref, type PropType, onBeforeUnmount } from 'vue';
import SearchOverlay from '../components/SearchOverlay.vue';
import type { NavigationItem } from '@/App.vue';
import SideMenu from '@/components/SideMenu.vue';
import Popover from '@/components/Popover.vue';
import ContextSwitcher from '@/components/ContextSwitcher.vue';
import contextStore from '@/stores/context.store';
import { displayUser } from '@/helpers/userHelper';

defineProps({
    lineItemsCount: { type: Number, required: true },
    hasChildCategories: { type: Boolean, required: true },
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true },
});

const open = ref<string | null>(null);
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

const handleMouseOver = (categoryId: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.classList.add('overflow-hidden');

        if (!document.body.style.marginRight) {
            document.body.style.marginRight = `${scrollbarWidth}px`;
        }

        open.value = categoryId;
    }, 250);
};

const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);

    const searchParams = new URLSearchParams(window.location.search);
    const isSearchOverlayOpen = searchParams.get('open') === '1' ? true : false;

    if (!isSearchOverlayOpen) {
        document.body.classList.remove('overflow-hidden');
        document.body.style.marginRight = ''; // Reset margin
    }

    open.value = null;
};

onBeforeUnmount(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
});
</script>

<template>
    <header class="border-b border-solid border-slate-100 bg-white" @mouseleave="handleMouseLeave">
        <div class="container mx-auto px-2 xl:p-0">
            <div class="grid xl:flex gap-2 xl:gap-8 py-2" @mouseover="handleMouseLeave">
                <div class="flex items-center">
                    <div class="xl:hidden">
                        <SideMenu :main-categories="mainCategories" />
                    </div>
                    <RouterLink to="/"
                        class="font-semibold text-2xl uppercase text-black leading-normal block hover:opacity-70 transitions ease-in-out delay-150">
                        <img src="/demoshopwise.png" style="height: 40px;">
                    </RouterLink>
                </div>
                <div class="ml-0 flex gap-2 flex-grow">
                    <div class="xl:items-center flex-grow">
                        <SearchOverlay />
                    </div>
                    <div class="flex items-center gap-6">
                        <Popover placement="bottom-end">
                            <div
                                class="flex items-center gap-4 leading-none rounded-lg bg-slate-100 px-4 py-2 cursor-pointer hover:bg-slate-200 text-slate-800 hidden xl:flex">
                                <div>
                                    <div class="font-medium text-sm">
                                        {{ contextStore.context.value.displayName }}
                                    </div>
                                    <div v-if="contextStore.context.value.users && contextStore.context.value.selectedUserIndex !== undefined"
                                        class="text-xs">
                                        User: {{
                                            displayUser(contextStore.context.value.users[contextStore.context.value.selectedUserIndex])
                                        }}
                                    </div>
                                    <div v-else class="text-xs">
                                        User: Unknown
                                    </div>
                                </div>
                                <ChevronDownIcon class="h-4" />
                            </div>
                            <template #content>
                                <div class="w-96">
                                    <ContextSwitcher />
                                </div>
                            </template>
                        </Popover>
                        <RouterLink to="/favorites" class="relative flex flex-col items-center text-slate-600">
                            <HeartIcon class="h-8 w-8" />
                            <span class="text-[9px] mt-1 font-bold">FAVORITES</span>
                            <span v-if="lineItemsCount > 0"
                                class="absolute top-0 right-0 leading-none inline-flex items-center justify-center h-5 w-5 pb-0.5 bg-brand-700 rounded-full text-white font-bold text-[11px]">
                                {{ lineItemsCount }}
                            </span>
                        </RouterLink>
                        <RouterLink to="/cart" class="relative flex flex-col items-center text-slate-600">
                            <ShoppingBagIcon class="h-8 w-8" />
                            <span class="text-[9px] mt-1 font-bold">CART</span>
                            <span v-if="lineItemsCount > 0"
                                class="absolute top-0 right-0 leading-none inline-flex items-center justify-center h-5 w-5 pb-0.5 bg-brand-700 rounded-full text-white font-bold text-[11px]">
                                {{ lineItemsCount }}
                            </span>
                        </RouterLink>
                    </div>
                </div>
            </div>
            <nav class="hidden xl:block">
                <ul class="flex w-full gap-2">
                    <ul v-if="hasChildCategories" class="flex overflow-y-auto scrollable-element">
                        <li v-for="category in mainCategories" :key="category.id ?? ''"
                            class="inline-flex relative pr-5">
                            <RouterLink :to="{ name: 'category', params: { id: category.id } }"
                                class="flex items-center font-semibold uppercase py-3 leading-none text-md text-slate-700 hover:text-brand-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                                @mouseover="handleMouseOver(category.id)">
                                {{ category.category.displayName ?? category.category.categoryId }}
                                <ChevronDownIcon class="ml-2 mt-1 inline-block h-3 text-slade-500" />
                            </RouterLink>
                            <div v-if="open === category.id" to="#navigationmodal">
                                <div class="navigationmodal"
                                    @mouseover="handleMouseOver(category.id)">
                                    <div class="bg-white overflow-x-auto modalcontent pb-10">
                                        <div class="container mx-auto">
                                            <h4 class="my-4 text-xl -mx-1">
                                                <RouterLink :to="{ name: 'category', params: { id: category.id } }"
                                                    class="text-slate-900 hover:underline" @click="handleMouseLeave">
                                                    {{ category.category.displayName ?? category.category.categoryId }}
                                                </RouterLink>
                                            </h4>
                                            <ul v-if="category.children.length > 0"
                                                class="text-base z-10 list-none grid grid-cols-2 mb-3 -mx-1">
                                                <li v-for="child in category.children"
                                                    :key="child.category.categoryId ?? ''" class="text-sm block">
                                                    <RouterLink
                                                        :to="{ name: 'sub-category', params: { parent: category.id, id: child.category.categoryId } }"
                                                        class="block py-2 rounded cursor-pointer hover:underline text-gray-700"
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
                        <li class="inline-flex relative pr-5" v-if="contextStore.context.value.shoppertainmentEnabled">
                            <RouterLink to="/feed"
                                class="flex items-center font-semibold uppercase py-3 leading-none text-md text-slate-700 hover:text-brand-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer">
                                Shoppertainment
                            </RouterLink>
                        </li>
                    </ul>
                    <ul v-else-if="mainCategories.length > 0">
                        <div class="font-semibold uppercase py-3 leading-none text-lg text-slate-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                            @mouseover="handleMouseOver('1')">
                            Categories
                        </div>
                        <div v-if="open === '1'" to="#navigationmodal">
                            <div class="navigationmodal">
                                <div class="bg-white overflow-x-auto mb-5 modalcontent">
                                    <div class="container mx-auto">
                                        <ul class="text-base z-10 max-h-96 list-none grid grid-cols-4 mb-3">
                                            <li v-for="category in mainCategories" :key="category.id ?? ''"
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
