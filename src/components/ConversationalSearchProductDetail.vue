<script setup lang="ts">
import { PhotoIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline';
import type { ConversationalSearchProductDetailActivity, ConversationalSearchProduct } from '@/helpers/conversationalSearchApi';

const props = defineProps<{
    activity: ConversationalSearchProductDetailActivity;
    language: string;
}>();

const emit = defineEmits<{
    add: [product: ConversationalSearchProduct];
    navigate: [];
}>();

function formatPropertyName(key: string) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, value => value.toUpperCase());
}

function formatPrice() {
    if (props.activity.product.price === null) {
        return '';
    }

    return new Intl.NumberFormat(props.language, { style: 'currency', currency: props.activity.currency })
        .format(props.activity.product.price);
}
</script>

<template>
  <article class="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[13rem_1fr]">
    <div class="flex min-h-48 items-center justify-center bg-slate-50">
      <img
        v-if="activity.product.image"
        :src="activity.product.image"
        :alt="activity.product.name"
        class="h-48 w-full object-contain p-4"
      >
      <PhotoIcon
        v-else
        class="h-16 w-16 text-slate-300"
      />
    </div>
    <div class="p-5">
      <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {{ activity.product.brand }}
      </p>
      <h3 class="mt-1 text-lg font-semibold text-slate-900">
        {{ activity.product.name }}
      </h3>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        {{ activity.product.description }}
      </p>
      <dl
        v-if="Object.keys(activity.product.properties ?? {}).length"
        class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
      >
        <template
          v-for="(value, key) in activity.product.properties"
          :key="key"
        >
          <dt class="text-slate-500">
            {{ formatPropertyName(key) }}
          </dt><dd class="font-medium text-slate-700">
            {{ value }}
          </dd>
        </template>
      </dl>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <strong>{{ formatPrice() }}</strong>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-brand-700"
            @click="emit('add', activity.product)"
          >
            <ShoppingBagIcon class="h-4 w-4 stroke-white" />
            Add to basket
          </button>
          <RouterLink
            :to="{ name: 'product', params: { id: activity.product.id } }"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
            @click="emit('navigate')"
          >
            View product
          </RouterLink>
        </div>
      </div>
    </div>
  </article>
</template>
