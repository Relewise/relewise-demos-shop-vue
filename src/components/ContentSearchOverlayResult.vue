<script setup lang="ts">
import { type ContentSearchResponse, type SearchTermPredictionResult } from '@relewise/client';
import { computed, ref, watch, type PropType } from 'vue';
import Sorting from '../components/Sorting.vue';
import Pagination from '../components/Pagination.vue';
import Facets from './Facets.vue';
import ContentTile from './ContentTile.vue';

const props = defineProps({
    contentSearchResult: { type: Object as PropType<ContentSearchResponse>, required: true },
    pageSize: { type: Number, required: true },
    term: { type: [String, Array] as PropType<string | string[]>, required: true },
    sort: { type: [String, Array] as PropType<string | string[]>, required: true },
    filters: { type: Object as PropType<Record<string, string | string[]>>, required: true },
    predictionsList: { type: Array as PropType<SearchTermPredictionResult[]>, required: true },
});

const emit = defineEmits(['search', 'update:sort', 'search-for']);
const sortValue = ref(props.sort);
const pageValue = computed(() => Number(props.filters.page ?? 1));

watch(sortValue, (newVal) => {
    emit('update:sort', newVal);
    emit('search');
});

function searchFor(term: string) {
    emit('search-for', term);
}

</script>

<template>
  <div
    v-if="contentSearchResult"
    class="container mx-auto pt-6 pb-10 px-2 xl:px-0"
  >
    <h2
      v-if="term"
      class="text-xl lg:text-3xl mb-6"
    >
      Showing results for <span class="underline--yellow inline-block">{{ term }}</span>
    </h2>
    <div class="lg:flex lg:gap-10">
      <div class="lg:w-1/5">
        <div
          v-if="predictionsList.length > 0 && filters.term && filters.term.length > 0"
          class="hidden pb-6 bg-white mb-6 border-b border-solid border-slate-300 lg:flex flex-col gap-1"
        >
          <h3 class="font-semibold text-lg">
            Suggestions
          </h3>
          <a
            v-for="(prediction) in predictionsList"
            :key="prediction.term ?? ''"
            class="block cursor-pointer text-slate-900 hover:!text-brand-link"
            @click.prevent="searchFor(prediction.term ?? '')"
          >
            {{ prediction.term }}
          </a>
        </div>
        <Facets
          :filters="filters"
          :facets="contentSearchResult.hits > 0 ? contentSearchResult.facets : null"
          context="ContentSearch"
          @search="emit('search', 1)"
          @reset="emit('search', 1)"
        />
      </div>
      <div class="w-full lg:w-4/5">
        <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
          <span v-if="contentSearchResult.hits > 0">Showing {{ pageValue * (pageSize) - (pageSize - 1) }} - {{
            contentSearchResult?.hits < pageSize ? contentSearchResult?.hits : pageValue * pageSize }} of {{
            contentSearchResult?.hits }}</span>
          <div class="hidden lg:block lg:flex-grow" />
          <Sorting
            v-model="sortValue"
            type="Content"
          />
        </div>
        <div
          v-if="contentSearchResult.hits == 0"
          class="p-3 text-xl bg-white"
        >
          No content found
        </div>
        <div v-else>
          <div class="flex flex-col divide-y divide-slate-200 gap-4">
            <ContentTile
              v-for="(content, index) in contentSearchResult?.results"
              :key="index"
              :content="content"
              :show-summary="true"
            />
          </div>
          <div class="py-3 flex justify-center">
            <Pagination
              :model-value="pageValue"
              :total="contentSearchResult.hits"
              :page-size="pageSize"
              @update:model-value="emit('search', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
