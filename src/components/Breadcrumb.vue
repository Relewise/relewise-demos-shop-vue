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
            <RouterLink
                :to="generateRoute(index) ?? '/'"
                class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer">
                {{ category.displayName ?? category.id }}
            </RouterLink>
        </div>
        <div v-if="product">
            <span class="mx-2">/</span>
            <RouterLink
                :to="{ name: 'product', params: { id: product.productId } }"
                class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer">
                {{ product.displayName ?? product.productId }}
            </RouterLink>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { CategoryNameAndIdResult, ProductResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import { HomeIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';
import type { RouteLocationAsRelativeGeneric } from 'vue-router';

const props = defineProps({
    breadcrumb: { type: Object as PropType<CategoryNameAndIdResult[]>, required: true },
    product: { type: Object as PropType<ProductResult | undefined>, required: false },
});

const { breadcrumb } = toRefs(props);

const generateRoute = (index: number): RouteLocationAsRelativeGeneric | undefined   => {
    switch(index) {
    case 0: return { 
        name: 'category',
        params: { id: breadcrumb.value[index].id }, 
    };
    case 1: return {
        name: 'sub-category',
        params: { 
            parent: breadcrumb.value[0].id,
            id: breadcrumb.value[index].id }, 
    };
    case 2: return { 
        name: 'sub-sub-category', 
        params: { 
            grand: breadcrumb.value[0].id,
            parent: breadcrumb.value[1].id,
            id: breadcrumb.value[index].id },
    };
    }
};
</script>
