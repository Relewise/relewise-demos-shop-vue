<script setup lang="ts">
import type { ProductCategoryResult } from '@relewise/client';
import type { PropType } from 'vue';
import Image from '@/components/Image.vue';

defineProps({
    categories: { type: Array as PropType<ProductCategoryResult[]>, required: true },
});
</script>

<template>
  <div class="flex flex-row flex-wrap gap-4 md:gap-8">
    <RouterLink
      v-for="(category, index) in categories"
      :key="category.categoryId ?? ''"
      :to="`/category/${category.categoryId}`"
      class="popular-category-tile flex w-32 md:w-36 shrink-0 flex-col items-center text-center text-stone-900 hover:text-brand-800"
    >
      <div
        class="overflow-hidden rounded-full h-[88px] w-[88px] md:h-[100px] md:w-[100px]"
        :class="`brand${(index % 6) + 1}`"
      >
        <Image :entity="category" />
      </div>
      <h4 class="popular-category-title mt-2 font-bold">
        {{ category.displayName }}
      </h4>
    </RouterLink>
  </div>
</template>

<style scoped>
.popular-category-title {
    min-height: 2.75rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.375rem;
}
</style>
