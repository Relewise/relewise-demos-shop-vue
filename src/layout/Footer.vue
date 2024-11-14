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