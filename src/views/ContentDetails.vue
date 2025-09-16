<template>
    <div id="content-page" class="container entity-page mx-auto px-2 lg:p-0">
        <div v-if="content" class="mb-16">
            <Breadcrumb v-if="breadcrumb" :breadcrumb="breadcrumb" :product="content"/>
            <div class="flex flex-wrap xl:flex-nowrap gap-8 xl:gap-20 mt-3">
                <div class="relative flex overflow-hidden w-full xl:w-1/2 justify-center">
                    <div>
                        <Image v-if="findImage(content)" :entity="content"/>
                    </div>
                </div>

                <div class="bg-white xl:w-1/2">
                    <div>
                        <h1 class="text-4xl mb-4 font-semibold">
                            {{ content.displayName }}
                        </h1>

                        <div v-if="content.data?.Body?.value">
                            <div class="content-body" v-html="content.data?.Body?.value"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="productRecommendations
                     && productRecommendations.recommendations
                     && productRecommendations.recommendations.length > 0"
                 class="scrollbar mt-16">
                <h2 class="text-2xl font-semibold mb-3">
                    Products viewed after viewing content
                </h2>
                <div class="w-full overflow-x-scroll">
                    <div class="flex flex-row gap-6">
                        <div v-for="(product, pIndex) in productRecommendations?.recommendations ?? []"
                             :key="pIndex"
                             class="min-w-[250px] pb-3">
                            <ProductTile :product="product"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { ContentSearchBuilder, ProductsViewedAfterViewingContentBuilder, type CategoryNameAndIdResult, type ContentResult, type ProductRecommendationResponse } from '@relewise/client';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Breadcrumb from '../components/Breadcrumb.vue';
import Image from '../components/Image.vue';
import { globalProductRecommendationFilters } from '@/stores/globalProductFilters';
import ProductTile from '../components/ProductTile.vue';
import trackingService from '@/services/tracking.service';
import { findImage } from '@/helpers/imageHelper';

const contentId = ref<string>('');
const content = ref<ContentResult | null | undefined>(null);
const route = useRoute();
const breadcrumb = ref<CategoryNameAndIdResult[] | undefined>();
const recommender = contextStore.getRecommender();

const productRecommendations = ref<ProductRecommendationResponse | undefined>(undefined);
async function init() {
    const id = route.params.id;
    if (id && !Array.isArray(id)) {
        contentId.value = id;

        trackingService.trackProductView(id);

        const request = new ContentSearchBuilder(contextStore.defaultSettings)
            .setContentProperties(contextStore.selectedContentProperties)
            .filters(f => f.addContentIdFilter([id]))
            .pagination(p => p.setPageSize(1))
            .build();

        const searcher = contextStore.getSearcher();
        content.value = (await searcher.searchContents(request))?.results![0];
        if (content.value?.categoryPaths) {
            // Taking the first path on the product to render the breadcrumb
            breadcrumb.value = content.value?.categoryPaths[0]?.pathFromRoot ?? [];
        }

        await recommend();
    }
}

async function recommend() {
    const request = new ProductsViewedAfterViewingContentBuilder(contextStore.defaultSettings)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .setSelectedVariantProperties({ allData: true })
        .setNumberOfRecommendations(contextStore.numberOfProductsToRecommend)
        .setContentId(contentId.value)
        .filters(builder => globalProductRecommendationFilters(builder))
        .build();

    const response: ProductRecommendationResponse | undefined = await recommender.recommendProductsViewedAfterViewingContent(request);
    contextStore.assertApiCall(response);

    productRecommendations.value = response;
}

init();

watch(route, () => {
    init();
});

</script>