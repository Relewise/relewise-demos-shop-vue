<script setup lang="ts">
import type { NavigationItem } from '@/App.vue';
import { Bars3Icon, XMarkIcon, Cog6ToothIcon, UserIcon } from '@heroicons/vue/24/outline';
import { toRefs } from '@vueuse/core';
import { ref, type PropType } from 'vue';

const menuOpen = ref<boolean>(false);

function toggleMenu() {
    menuOpen.value = !menuOpen.value;
}

const props = defineProps({
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true},
});

const { mainCategories } = toRefs(props);

</script>

<template>
    <div class="lg:hidden mr-2" @click="toggleMenu">
        <Bars3Icon class="h-8 w-8"/>
    </div>
    <Teleport to="#modal">
        <div v-if="menuOpen" class="pb-4 px-4 mx-auto top-0 left-0 w-full h-full z-10 fixed overflow-scroll bg-white z-[1000]">
            <div class="flex w-full">
                <RouterLink to="/personalisation"
                            class="text-zinc-600 inline-flex items-center whitespace-nowrap py-2 flex-grow"
                            @click="toggleMenu">
                    <UserIcon class="w-5 h-5 mr-1"/> Personalisation
                </RouterLink>
                <RouterLink to="/app-settings"
                            class="text-zinc-600 inline-flex items-center whitespace-nowrap py-2 flex-grow"
                            @click="toggleMenu">
                    <Cog6ToothIcon class="w-5 h-5 mr-1"/> Configure Demo
                </RouterLink>
                <div class="lg:hidden m-2 flex justify-end">
                    <XMarkIcon class="h-8 w-8" @click="toggleMenu"/>
                </div>
            </div>
            <ul>
                <li v-for="category in mainCategories" :key="category.id ?? ''">
                    <div>
                        <RouterLink :to="{ name: 'category', params: { id: category.id } }" @click="toggleMenu">
                            {{ category.category.displayName ?? category.category.categoryId }}
                        </RouterLink>
                        <li v-for="child in category.children" :key="child.category.categoryId ?? ''" class="relative pl-5">
                            <RouterLink :to="{ name: 'category', params: { id: child.category.categoryId } }" @click="toggleMenu">
                                {{ child.category.displayName ?? child.category.categoryId }}
                            </RouterLink>
                        </li>
                    </div>
                </li>
            </ul>
        </div>
    </Teleport>
</template>