<template>
    <div class="category-page container mx-auto p-2 xl:p-0 relative">
        <div class="flex gap-10">
            <div v-if="result?.facets || (childCategories?.length ?? 0) > 0" class="hidden lg:block w-1/5">
                <Facets v-if="result?.facets"
                        :facets="result.facets"
                        :filters="filters"
                        :context="'ContentSearch'"
                        @search="search"/>
            </div>
            <div class="w-full lg:w-4/5">
                <div v-if="result?.results">
                    <div class="grid grid-cols-1 xl:grid-cols-2 bg-white rounded gap-1 lg:flex lg:gap-4 items-start">
                        <div>
                            <span v-if="result.hits > 0" class="text-sm lg:text-base whitespace-nowrap">
                                Showing {{ (page * 10) - 9 }} - {{ result?.hits < 10 ? result?.hits : page * 10 }} of {{
                                    result?.hits }} hits </span>
                        </div>

                        <div class="hidden lg:block lg:flex-grow">
                        </div>
                        <Sorting v-model="filters.sort" @change="search"/>
                    </div>
                    <div v-if="result" class="grid gap-2 xl:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3">
                        <ContentTile v-for="(content, pIndex) in result.results"
                                     :key="content.contentId || pIndex"
                                     :content="content"
                                     :show-content-demo-variant="contextStore.context.value.showContentMenu"/>
                    </div>

                    <div class="py-3 flex justify-center mt-10">
                        <Pagination v-model.sync="page" v-model:total="result.hits" :page-size="10" @change="search"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


<script lang="ts" setup>
import Pagination from '../components/Pagination.vue';
import Facets from '../components/Facets.vue';
import { ref, type Ref, watch } from 'vue';
import { type CategoryHierarchyFacetResultCategoryNode, ContentSearchBuilder, type ContentSearchResponse } from '@relewise/client';
import contextStore from '@/stores/context.store';
import { useRoute } from 'vue-router';
import router from '@/router';
import breakpointService from '@/services/breakpoint.service';
import Sorting from '../components/Sorting.vue';
import ContentTile from '@/components/ContentTile.vue';
import { getFacets } from '@/helpers/facetHelper';

const route = useRoute();
const childCategories = ref<CategoryHierarchyFacetResultCategoryNode[] | undefined>(undefined);
const result: Ref<ContentSearchResponse | undefined> = ref<ContentSearchResponse | undefined>(undefined);
const categoryId = ref<string>('');
const page = ref<number>(1);
const filters = ref<Record<string, string | string[]>>({ price: [], sort: '' });

async function init() {
    const id = route.params.id;

    if (id && !Array.isArray(id) && id !== categoryId.value) {
        categoryId.value = id;
        await search();
    }
    await search();
}

init();

watch(route, () => {
    if (route.query.open !== '1')
        init();
});

watch(breakpointService.active, () => {
    if (route.query.open !== '1')
        init();
});

async function search() {
    scrollTo({ top: 0 });

    const request = new ContentSearchBuilder(contextStore.defaultSettings)
        .setContentProperties(contextStore.selectedContentProperties)
        .filters(f => {
            if (categoryId.value) {
                f.addContentCategoryIdFilter('Ancestor', [categoryId.value]);
            }
        })
        .facets(f => {
            getFacets('ContentSearch', f, filters.value);
        })
        .pagination(p => p.setPageSize(10).setPage(page.value))
        .build();

    const query = { ...router.currentRoute.value.query, ...filters.value };

    await router.push({ path: route.path, query: query, replace: true });

    const searcher = contextStore.getSearcher();
    const response: ContentSearchResponse | undefined = await searcher.searchContents(request);
    contextStore.assertApiCall(response);

    result.value = response;
}
</script>
