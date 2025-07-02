<script setup lang="ts">
import { type ContentSearchResponse } from '@relewise/client';
import { type PropType } from 'vue';
import ContentSearchResultElement from './ContentSearchResultElement.vue';

defineProps({
    contentSearchResult: { type: Object as PropType<ContentSearchResponse>, required: true },
    pageSize: { type: Number, required: true },
    page: { type: Number, required: true },
    term: { type: [String, Array] as PropType<string | string[]>, required: true },
});

</script>

<template>
    <div v-if="contentSearchResult" class="container mx-auto pt-6 pb-10 px-2 xl:px-0">
        <h2 v-if="term" class="text-xl lg:text-3xl mb-6">
            Showing content results for <span class="underline--yellow inline-block">{{ term }}</span>
        </h2>
        <div class="flex gap-10">
            <div class="w-full lg:w-4/5">
                <div class="lg:flex lg:gap-6 items-end bg-white rounded mb-3">
                    <span v-if="contentSearchResult.hits > 0">Showing {{ page * (pageSize) - (pageSize - 1) }} - {{
                        contentSearchResult?.hits < pageSize ? contentSearchResult?.hits : page * pageSize }} of {{ contentSearchResult?.hits }}</span>
                    <div class="hidden lg:block lg:flex-grow">
                    </div>
                    <!-- <Sorting v-model="filters.sort" @change="contentSearch"/> -->
                </div>
                <div v-if="contentSearchResult.hits == 0" class="p-3 text-xl bg-white">
                    No content found
                </div>
                <div v-else>
                    <div class="flex flex-col divide-y divide-slate-200">
                        <ContentSearchResultElement v-for="(content, pIndex) in contentSearchResult?.results"
                                                    :key="content.contentId || pIndex"
                                                    :content="content"/>
                    </div>
                    <div class="py-3 flex justify-center">
                        <!-- <Pagination v-model.sync="page"
                                    v-model:total="contentSearchResult.hits"
                                    :page-size="pageSize"
                                    @change="contentSearch"/> -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
