<script setup lang="ts">
import type { NavigationItem } from '@/App.vue';
import type { PropType } from 'vue';

defineProps({
    hasChildCategories: { type: Boolean, required: true },
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true },
    footer: { type: Object as PropType<NavigationItem[]>, required: true },
});
</script>

<template>
    <footer class="!text-brand-500" style="background-color: #FFC1D7;">
        <div class="waves"></div>
        <!-- <svg class="media-content-bg__top--desktop"
             width="100%"
             height="88"
             viewBox="0 0 100% 88"
             fill="none"
             xmlns="http://www.w3.org/2000/svg">
            <path d="M1519 0.000923157L1519 13.3879C1481 13.3879 1481 55.0008 1443 55.0008C1405 55.0008 1405 13.3879 1367 13.3879C1329 13.3879 1329 55.0008 1291 55.0008C1253 55.0008 1253 13.3879 1215 13.388C1177.01 13.388 1177 55.0009 1139 55.0009C1101 55.0009 1101 13.388 1063 13.388C1025 13.388 1025 55.0009 987 55.0009L987 0.000969666L1519 0.000923157Z" fill="white"/>
            <path d="M455 0.000530243L455 13.3875C417 13.3875 417 55.0004 379 55.0004C341 55.0004 341 13.3875 303 13.3875C265 13.3875 265 55.0004 227 55.0004C189 55.0005 189 13.3875 151 13.3876C113.01 13.3876 113 55.0005 75 55.0005C37 55.0005 37 13.3876 -1 13.3876C-39 13.3876 -39 55.0005 -77 55.0005L-77 0.000576752L455 0.000530243Z" fill="white"/>
            <path d="M455.001 0.000538605L455 13.3875C493 13.3875 493 55.0004 530.999 55.0005C568.998 55.0005 569.001 13.3876 607 13.3876C644.999 13.3876 644.999 55.0005 682.998 55.0005C720.998 55.0005 721 13.3876 758.997 13.3876C796.993 13.3876 796.999 55.0005 834.998 55.0005C872.997 55.0005 873 13.3876 910.999 13.3876C948.999 13.3876 949.001 55.0005 987 55.0005L987 0.000591278L455.001 0.000538605Z" fill="white"/>
        </svg> -->
        
        <div class="container px-6 py-12 mx-auto">
            <template v-if="hasChildCategories">
                <div v-if="footer"
                     class="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    <div v-for="category in footer" :key="category.id">
                        <h3 class="text-lg font-medium">
                            {{ category.category.displayName }}
                        </h3>

                        <div v-for="child in category.children"
                             :key="child.category.categoryId ?? ''"
                             class="flex flex-col items-start mt-2 space-y-4">
                            <RouterLink :to="{ name: 'category', params: { id: child.category.categoryId } }"
                                        class="text-brand-500 transition-colors duration-200 hover:underline hover:text-brand-500">
                                {{ child.category.displayName }}
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else-if="mainCategories.length > 0">
                <h3 class="font-medium text-xl mb-2">
                    Categories
                </h3>
                <div class="grid grid-cols-2 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    <div v-for="cat in mainCategories"
                         :key="cat.id ?? ''"
                         class="flex flex-col items-start mt-2 space-y-4">
                        <RouterLink :to="{ name: 'category', params: { id: cat.id } }"
                                    class="text-brand-500 transition-colors duration-200 hover:underline hover:text-brand-500">
                            {{ cat.category.displayName }}
                        </RouterLink>
                    </div>
                </div>
            </template>


            <hr v-if="hasChildCategories || mainCategories.length > 0" class="my-6 border-brand-500 md:my-5">

            <div class="flex flex-col items-center justify-between sm:flex-row">
                <a href="https://relewise.com/contact-us/">
                    <img src="/logo.svg" class="h-14">
                </a>

                <p class="mt-4 text-sm text-slate-500 sm:mt-0 text-brand-500">
                    © Copyright {{ new Date().getFullYear() }}
                </p>
            </div>
        </div>
    </footer>
</template>