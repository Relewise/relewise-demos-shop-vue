<template>
    <div class="flex py-2 gap-2">
        <template v-for="(el, index) in nav" :key="el.name">
            <RouterLink 
                :to="el.route"
                class="text-zinc-700 whitespace-nowrap hover:text-brand-500 cursor-pointer flex items-center">
                <template v-if="el.name === 'Home'">
                    <HomeIcon class="h-5 w-5"/>
                </template> 
                <template v-else>
                    {{ el.name }}
                </template>
            </RouterLink>
            <span v-if="index !== nav.length - 1">/</span>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { CategoryNameAndIdResult, ProductResult } from '@relewise/client';
import { computed, toRefs, type PropType } from 'vue';
import { HomeIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';
import type { RouteLocationAsRelativeGeneric } from 'vue-router';

const props = defineProps({
    breadcrumb: { type: Object as PropType<CategoryNameAndIdResult[]>, required: true },
    product: { type: Object as PropType<ProductResult | undefined>, required: false },
});

const { breadcrumb } = toRefs(props);

const nav = computed(() => {
    const path: { name: string | null | undefined, route: RouteLocationAsRelativeGeneric }[] = [
        { name: 'Home', route: { name: 'home' } },
    ];

    for (const [i, category] of breadcrumb.value.slice(0, contextStore.context.value.allowThirdLevelCategories ? 3 : 2).entries()) {
        path.push({
            name: category.displayName ?? category.id ?? '',
            route: generateRoute(i) ?? { name: 'home' },
        });
    }

    if (props.product) {
        path.push({
            name: props.product.displayName ?? props.product.productId,
            route: { name: 'product', params: { id: props.product.productId } },
        });
    }

    return path;
});

const generateRoute = (index: number): RouteLocationAsRelativeGeneric | undefined => {
    switch (index) {
    case 0: return {
        name: 'category',
        params: { id: breadcrumb.value[index].id },
    };
    case 1: return {
        name: 'sub-category',
        params: {
            parent: breadcrumb.value[0].id,
            id: breadcrumb.value[index].id,
        },
    };
    case 2: return {
        name: 'sub-sub-category',
        params: {
            grand: breadcrumb.value[0].id,
            parent: breadcrumb.value[1].id,
            id: breadcrumb.value[index].id,
        },
    };
    }
};
</script>
