<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AdjustmentsHorizontalIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import {
    filterValue,
    type ConversationalSearchProduct,
    type ConversationalSearchShoppingAction,
    type ConversationalSearchShoppingActivity,
} from '@/helpers/conversationalSearchApi';
import ConversationalSearchProductTile from '@/components/ConversationalSearchProductTile.vue';

const props = defineProps<{
    activity: ConversationalSearchShoppingActivity;
    currency: string;
    language: string;
    loading: boolean;
    filtersVisible: boolean;
}>();

const emit = defineEmits<{
    add: [product: ConversationalSearchProduct];
    navigate: [];
    refine: [action: ConversationalSearchShoppingAction];
    'update:filtersVisible': [visible: boolean];
}>();

const carouselPosition = ref(0);
const activeProducts = computed(() => props.activity.result?.products.length
    ? props.activity.result.products
    : props.activity.result?.recommendations ?? []);
const visibleProducts = computed(() => activeProducts.value.slice(carouselPosition.value, carouselPosition.value + 4));

watch(() => activeProducts.value.length, length => {
    carouselPosition.value = Math.min(carouselPosition.value, Math.max(0, length - 4));
});

function moveCarousel(amount: number) {
    const maximum = Math.max(0, activeProducts.value.length - 4);
    carouselPosition.value = Math.min(maximum, Math.max(0, carouselPosition.value + amount));
}

function facetLabel(key: string, value: string) {
    return props.activity.result?.facets.find(facet => facet.key === key)?.labels?.[value] ?? value;
}

function formatFacetName(key: string, displayName?: string | null) {
    if (displayName) {
        return displayName;
    }

    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, value => value.toUpperCase());
}

function title() {
    const resultCount = props.activity.result?.products.length ?? 0;
    const term = props.activity.searchTerm.trim();
    return term ? `${resultCount} results for “${term}”` : `${resultCount} products for you`;
}
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
      <div>
        <h3 class="font-semibold text-slate-900">
          {{ title() }}
        </h3>
        <p
          v-if="activity.status === 'searching'"
          class="text-xs text-brand-600"
        >
          Updating results…
        </p>
      </div>
      <button
        v-if="activity.result?.facets.length"
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-none hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
        @click="emit('update:filtersVisible', !filtersVisible)"
      >
        <AdjustmentsHorizontalIcon class="h-4 w-4" /> Filters
        <ChevronDownIcon
          class="h-3 w-3"
          :class="filtersVisible ? 'rotate-180' : ''"
        />
      </button>
    </div>

    <div
      v-if="filtersVisible"
      class="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 p-4 sm:p-5"
    >
      <div
        v-for="facet in activity.result?.facets"
        :key="facet.key"
      >
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ formatFacetName(facet.key, facet.displayName) }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="value in facet.values"
            :key="value"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs transition"
            :class="filterValue(activity.filters, facet.key) === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'"
            :disabled="loading"
            @click="emit('refine', { kind: 'facet', key: facet.key, value: filterValue(activity.filters, facet.key) === value ? null : value })"
          >
            {{ facetLabel(facet.key, value) }}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="w-fit rounded-none bg-transparent p-0 text-xs font-semibold text-brand-600 shadow-none hover:text-brand-700"
        :disabled="loading"
        @click="emit('refine', { kind: 'clear' })"
      >
        Clear all filters
      </button>
    </div>

    <div
      v-if="visibleProducts.length"
      class="relative p-4 sm:p-5"
    >
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
        <ConversationalSearchProductTile
          v-for="product in visibleProducts"
          :key="product.id"
          :product="product"
          :currency="activity.result?.currency ?? currency"
          :language="language"
          @add="emit('add', $event)"
          @navigate="emit('navigate')"
        />
      </div>
      <button
        v-if="carouselPosition > 0"
        type="button"
        class="absolute left-1 top-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow"
        aria-label="Show previous products"
        @click="moveCarousel(-4)"
      >
        <ChevronLeftIcon class="h-5 w-5" />
      </button>
      <button
        v-if="carouselPosition + 4 < activeProducts.length"
        type="button"
        class="absolute right-1 top-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow"
        aria-label="Show next products"
        @click="moveCarousel(4)"
      >
        <ChevronRightIcon class="h-5 w-5" />
      </button>
    </div>
    <div
      v-else-if="activity.status !== 'searching'"
      class="px-5 py-8 text-center text-sm text-slate-500"
    >
      No matching products found. Try widening the filters or asking in another way.
    </div>
  </article>
</template>
