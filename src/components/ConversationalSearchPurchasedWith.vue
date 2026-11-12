<script setup lang="ts">
import type { ConversationalSearchProduct } from '@/helpers/conversationalSearchApi';
import ConversationalSearchProductTile from '@/components/ConversationalSearchProductTile.vue';

defineProps<{
    products: ConversationalSearchProduct[];
    currency: string;
    language: string;
}>();

const emit = defineEmits<{
    add: [product: ConversationalSearchProduct];
    navigate: [];
}>();
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header class="border-b border-slate-100 px-4 py-3 sm:px-5">
      <h3 class="font-semibold text-slate-900">
        Frequently purchased with this product
      </h3>
      <p class="mt-1 text-xs text-slate-500">
        You might also be interested in these products.
      </p>
    </header>
    <div class="grid grid-cols-2 gap-2 p-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 sm:p-5">
      <ConversationalSearchProductTile
        v-for="product in products"
        :key="product.id"
        :product="product"
        :currency="currency"
        :language="language"
        @add="emit('add', $event)"
        @navigate="emit('navigate')"
      />
    </div>
  </article>
</template>
