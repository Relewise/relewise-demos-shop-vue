<template>
    <div id="blogpost" class="container mx-auto px-2 lg:p-0">
        <div v-if="content" class="mb-16">
            <div class="flex flex-wrap xl:flex-nowrap gap-8 xl:gap-20 mt-3">
                <div class="relative flex overflow-hidden w-full xl:w-1/2 justify-center">
                    <ProductImage :product="content" class="!h-[300px] xl:!h-[600px] !w-auto" />
                </div>

                <div class="bg-white flex-grow">
                    <div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ content.displayName }}
                        </h1>

                        <p v-if="content.data?.Summary.value" class="text-lg text-slate-600 mb-6">
                            {{ content.data.Summary.value }}
                        </p>

                        <section class="prose prose-slate max-w-none">
                            <div v-html="content.data?.Body.value ?? '<p>No content available.</p>'"></div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import trackingService from '@/services/tracking.service';
import contextStore from '@/stores/context.store';
import { ContentSearchBuilder, type ContentResult } from '@relewise/client';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ProductImage from '../components/ProductImage.vue';

const contentId = ref<string>('');
const content = ref<ContentResult | null | undefined>(null);
const route = useRoute();

async function init() {
    const id = route.params.id;
    if (id && !Array.isArray(id)) {
        contentId.value = id;

        trackingService.trackContentView(id);

        const request = new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .filters(f => f.addContentIdFilter([id]))
            .build();

        const searcher = contextStore.getSearcher();

        content.value = (await searcher.searchContents(request))?.results![0];
    }
}

init();

watch(route, () => {
    init();
});

</script>

<style lang="scss" scoped>
dl {
    display: grid;
    grid-template-columns: max-content auto;
}

dt {
    grid-column-start: 1;
    @apply bg-gray-100 px-4 py-2 border-b border-solid border-gray-100 font-medium capitalize;
}

dd {
    grid-column-start: 2;
    @apply p-2 border-b border-solid border-gray-100 pl-2;
}
</style>