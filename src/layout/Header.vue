<script setup lang="ts">
import { Cog6ToothIcon, ShoppingBagIcon, UserIcon } from '@heroicons/vue/24/outline';
import { onClickOutside } from '@vueuse/core';
import { ref, type PropType } from 'vue';
import SearchOverlay from '../components/SearchOverlay.vue';
import type { NavigationItem } from '@/App.vue';
import SideMenu from '@/components/SideMenu.vue';

defineProps({
    lineItemsCount: { type: Number, required: true},
    hasChildCategories: { type: Boolean, required: true},
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true},
});

const navigationmodal = ref(null);
onClickOutside(navigationmodal, () => open.value = null);

const open = ref<string | null>(null);

</script>

<template>
    <header class="bg-white shadow-sm">
        <div class="container mx-auto px-2">
            <div class="grid xl:flex gap-2 py-2">
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
            </div>
            <nav class="hidden xl:block">
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
                                                        class="block px-2 py-2 rounded cursor-pointer hover:bg-gray-100 text-gray-700">
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
                                                            class="block px-2 py-1 rounded cursor-pointer hover:bg-gray-100 text-gray-700"
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
                    <li class="inline-flex items-center gap-2">
                        <RouterLink to="/personalisation"
                                    class="text-zinc-600 inline-flex items-center whitespace-nowrap py-2 hover:text-black">
                            <UserIcon class="w-5 h-5 mr-1"/> Personalisation
                        </RouterLink>
                        <RouterLink to="/app-settings"
                                    class="text-zinc-600 inline-flex items-center whitespace-nowrap py-2 hover:text-black">
                            <Cog6ToothIcon class="w-5 h-5 mr-1"/> Configure Demo
                        </RouterLink>
                    </li>
                </ul>
            </nav>
        </div>
    </header>
</template>