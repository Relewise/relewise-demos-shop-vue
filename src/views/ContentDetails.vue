<template>
    <div id="product-page" class="container mx-auto px-2 lg:p-0">
        <div v-if="content" class="mb-16">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="content"/>
            <h1 class="text-4xl mb-4 font-semibold">
                {{ content.displayName }}
            </h1>
            <Image :entity="content" class="w-[300px]"/>
            <span class="content-body" v-html="content.data?.Body?.value"></span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { ContentSearchBuilder, type CategoryNameAndIdResult, type ContentResult } from '@relewise/client';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Breadcrumb from '../components/Breadcrumb.vue';
import Image from '../components/Image.vue';

const contentId = ref<string>('');
const content = ref<ContentResult|null|undefined>(null);
const route = useRoute();
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();

async function init() {
    const id = route.params.id;
    if (id && !Array.isArray(id)) {
        contentId.value = id;

        // TODO: Add content tracking
        // trackingService.trackProductView(id);

        const request = new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .filters(f => f.addContentIdFilter([id]))
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        content.value = (await searcher.searchContents(request))?.results![0];
        if (content.value?.categoryPaths) {
            // Taking the first path on the product to render the breadcrumb
            breadcrumb.value = content.value?.categoryPaths[0].pathFromRoot ?? [];
        }
    }
}

init();

watch(route, () => {
    init();
});

</script>

<style lang="scss">
.content-body {
    p {
        margin-bottom: 1rem;
    }
}
</style>