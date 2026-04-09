<template>
  <div class="flex py-2 gap-2 mt-2 items-center">
    <template
      v-for="(el, index) in nav"
      :key="el.name"
    >
      <component
        :is="index === nav.length - 1 ? 'span' : 'RouterLink'" 
        :to="el.route"
        :class="index === nav.length - 1 ? 'text-slate-500' : 'text-slate-700 whitespace-nowrap hover:underline cursor-pointer flex items-center'"
      >
        <template v-if="el.name === 'Home'">
          <HomeIcon class="h-[18px] w-[18px]" />
        </template> 
        <template v-else>
          {{ el.name }}
        </template>
      </component>
      <span v-if="index !== nav.length - 1"><ChevronRightIcon class="h-[10px] w-[10px] mt-0.5" /></span>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CategoryNameAndIdResult, ProductResult } from '@relewise/client';
import { computed, type PropType } from 'vue';
import { ChevronRightIcon, HomeIcon } from '@heroicons/vue/24/outline';
import contextStore from '@/stores/context.store';
import type { RouteLocationAsRelativeGeneric } from 'vue-router';

type BreadcrumbItem = {
    name: string;
    route: RouteLocationAsRelativeGeneric;
};

const props = defineProps({
    breadcrumb: { type: Object as PropType<CategoryNameAndIdResult[]>, required: false, default: undefined },
    product: { type: Object as PropType<ProductResult | undefined>, required: false },
    items: { type: Array as PropType<BreadcrumbItem[]>, required: false, default: undefined },
});

const nav = computed(() => {
    const path: BreadcrumbItem[] = [
        { name: 'Home', route: { name: 'home' } },
    ];

    if (props.items?.length) {
        path.push(...props.items);
        return path;
    }

    if (!props.breadcrumb?.length) {
        return path;
    }

    const categories = props.breadcrumb.slice(0, contextStore.context.value.allowThirdLevelCategories ? 3 : 2);
    for (const [i, category] of categories.entries()) {
        path.push({
            name: category.displayName ?? category.id ?? '',
            route: generateRoute(categories, i) ?? { name: 'home' },
        });
    }

    if (props.product) {
        path.push({
            name: props.product.displayName ?? props.product.productId ?? '',
            route: { name: 'product', params: { id: props.product.productId } },
        });
    }

    return path;
});

const generateRoute = (categories: CategoryNameAndIdResult[], index: number): RouteLocationAsRelativeGeneric | undefined => {
    switch (index) {
    case 0: return {
        name: 'category',
        params: { id: categories[index]?.id },
    };
    case 1: return {
        name: 'sub-category',
        params: {
            parent: categories[0]?.id,
            id: categories[index]?.id,
        },
    };
    case 2: return {
        name: 'sub-sub-category',
        params: {
            grand: categories[0]?.id,
            parent: categories[1]?.id,
            id: categories[index]?.id,
        },
    };
    }
};
</script>
