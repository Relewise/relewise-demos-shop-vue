<script setup lang="ts">
import { PhotoIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline';
import type { ConversationalSearchProduct } from '@/helpers/conversationalSearchApi';

const props = defineProps<{
    product: ConversationalSearchProduct;
    currency: string;
    language: string;
}>();

const emit = defineEmits<{
    add: [product: ConversationalSearchProduct];
    navigate: [];
}>();

function formatPrice() {
    if (props.product.price === null) {
        return '';
    }

    return new Intl.NumberFormat(props.language, { style: 'currency', currency: props.currency })
        .format(props.product.price);
}
</script>

<template>
  <article class="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white text-slate-900 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
    <RouterLink
      :to="{ name: 'product', params: { id: product.id } }"
      class="flex aspect-square items-center justify-center overflow-hidden bg-slate-50"
      @click="emit('navigate')"
    >
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="h-full w-full object-contain p-3"
      >
      <PhotoIcon
        v-else
        class="h-16 w-16 text-slate-300"
      />
    </RouterLink>
    <div class="flex flex-1 flex-col p-3">
      <RouterLink
        :to="{ name: 'product', params: { id: product.id } }"
        class="text-slate-900"
        @click="emit('navigate')"
      >
        <p
          v-if="product.brand"
          class="truncate text-xs text-slate-500"
        >
          {{ product.brand }}
        </p>
        <h4 class="mt-1 line-clamp-2 text-sm font-semibold leading-5 group-hover:text-brand-600">
          {{ product.name }}
        </h4>
      </RouterLink>
      <p class="mt-auto pt-3 font-semibold">
        {{ formatPrice() }}
      </p>
      <button
        type="button"
        class="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-none hover:bg-brand-700"
        :aria-label="`Add ${product.name} to basket`"
        @click="emit('add', product)"
      >
        <ShoppingBagIcon class="h-4 w-4 stroke-white" />
        Add to basket
      </button>
    </div>
  </article>
</template>
