<template>
    <div class="flex py-2">
        <RouterLink 
            to="/" 
            class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer flex items-center">
            <HomeIcon class="h-5 w-5"/>
        </RouterLink>
        <div 
            v-for="(category, index) in breadcrumb.slice(0, contextStore.context.value.allowThirdLevelCategories ? 3 : 2)" 
            :key="index" 
            class="flex items-center">
            <span class="mx-2">/</span>
            <RouterLink v-if="index === 0"
                        :to="{ name: 'category', params: { id: category.id } }"
                        class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer">
                {{ category.displayName ?? category.id }}
            </RouterLink>
            <RouterLink v-if="index === 1"
                        :to="{ name: 'sub-category', params: { parent: breadcrumb[0].id, id: category.id } }"
                        class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer">
                {{ category.displayName ?? category.id }}
            </RouterLink>

            <RouterLink v-if="index === 2"
                        :to="{ name: 'sub-sub-category', params: { grand: breadcrumb[0].id, parent: breadcrumb[1].id, id: category.id } }"
                        class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer">
                {{ category.displayName ?? category.id }} 
            </RouterLink>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { CategoryNameAndIdResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import { HomeIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';

const props = defineProps({
    breadcrumb: { type: Object as PropType<CategoryNameAndIdResult[]>, required: true },
});

const { breadcrumb } = toRefs(props);
</script>
