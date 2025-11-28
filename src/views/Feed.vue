<template>
    <main class="pt-6 bg-neutral-100">
        <div class="container mx-auto">
            <h1 class="text-3xl font-semibold mb-4">Shoppertainment</h1>
        </div>


        <!-- <article v-for="(group, index) in elements" :key="index" class="mb-12">
            <div class="" v-if="group.content">
                <div class="mx-auto container">
                    <h2 class="text-xl mb-2 font-semibold">{{ group.name }}</h2>

                    <div class="grid grid-cols-5 gap-4 mb-4" v-if="group.content">
                        <span v-for="ele in group.content">
                            <FeedContentTile :content="ele" class="rounded-lg p-2 shadow"
                                @click="trackClick('Content', ele.contentId!)" />
                        </span>
                    </div>
                </div>
            </div>

            <div v-if="group.products" style="background-color: #e9effb;">
                <div class="waves"></div>
                <div class="container mx-auto grid grid-cols-5 gap-4 mb-4 rounded-lg" v-if="group.products">
                    <span v-for="ele in group.products">
                        <ProductTile :product="ele" class="rounded-lg shadow p-2 bg-white"
                            @click="trackClick('Product', ele.productId!)" />
                    </span>
                </div>
                <div class="reverse-waves"></div>
            </div>
        </article> -->

        <article class="mb-4">
            <div class="mx-auto container">

                <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <template v-for="(group, index) in elements" :key="index" v-if="feedId">
                        <span v-for="ele in group.content">
                            <FeedContentTile :content="ele" class="rounded-lg p-2 shadow bg-white hover:scale-105"
                                :feed-id="feedId" @click="trackClick('Content', ele.contentId!)" />
                        </span>

                        <span v-for="ele in group.products">
                            <ProductTile :product="ele" class="rounded-lg shadow p-2 bg-white hover:scale-105"
                                :feed-id="feedId" @click="trackClick('Product', ele.productId!)" />
                        </span>
                    </template>
                </div>
            </div>

        </article>

        <div v-if="loading" class="py-6 text-center text-sm opacity-70">
            Loading more…
        </div>
        <div v-else-if="done" class="py-6 text-center text-sm opacity-70">
            You’re all caught up
        </div>

        <div ref="sentinel" class="h-2"></div>
    </main>
</template>

<script setup lang="ts">
import FeedContentTile from '@/components/FeedContentTile.vue';
import ProductTile from '@/components/ProductTile.vue';
import contextStore from '@/stores/context.store';
import { FeedRecommendationInitializationBuilder, FeedRecommendationNextItemsBuilder, FilterBuilder, type FeedCompositionResult, type FeedItem } from '@relewise/client';
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'

const recommender = contextStore.getRecommender();

const loading = ref(false);
const done = ref(false);
const sentinel = ref<HTMLElement | null>(null);
let io: IntersectionObserver | null = null;

const TOTAL = 25;

const feedId = ref<string>();
const elements = ref<FeedCompositionResult[]>([]);

function trackClick(type: "Product" | "Content", id: string) {
    if (!feedId.value) return;

    const item: FeedItem = type === 'Product'
        ? { productAndVariantId: { productId: id } }
        : { contentId: id }

    contextStore.getTracker().trackFeedItemClick({ user: contextStore.user.value, feedId: feedId.value, item });
}

function trackPreview(type: "Product" | "Content", id: string) {
    if (!feedId.value) return;

    const item: FeedItem = type === 'Product'
        ? { productAndVariantId: { productId: id } }
        : { contentId: id }

    contextStore.getTracker().trackFeedItemPreview({ user: contextStore.user.value, feedId: feedId.value, item: item });
}

async function fetchNextItems(): Promise<void> {
    if (!feedId.value) return;

    const builder = new FeedRecommendationNextItemsBuilder({ initializedFeedId: feedId.value });

    const response = await recommender.recommendFeedNextItems(builder.build());

    if (response?.recommendations?.length === 0) {
        done.value = true;
        return;
    }

    elements.value = elements.value?.concat(response?.recommendations ?? []);
}

async function initialize(): Promise<void> {
    const builder = new FeedRecommendationInitializationBuilder(contextStore.defaultSettings, { minimumPageSize: 10 })
        .setSelectedContentProperties(contextStore.selectedContentProperties)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .allowProductsCurrentlyInCart()
        .addCompostion({ options: { type: 'Product', count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 } } })
        .addCompostion({ options: { type: 'Content', count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 } } });

    // {
    //     count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 },
    //     type: 'Product',
    //     includeEmptyResults: false, // should default to false
    // },
    // {
    //     count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 },
    //     type: 'Content',
    //     includeEmptyResults: false, // should default to false
    // },
    // {
    //     count: { lowerBoundInclusive: 5, upperBoundInclusive: 5 },
    //     type: 'Content',
    //     includeEmptyResults: false,
    //     name: 'Blog Posts',
    //     rotationLimit: 1,
    //     filters: new FilterBuilder().addContentDataFilter("Tag", c => c.addEqualsCondition(DataValueFactory.string("blog"))).build()
    // },
    // {
    //     count: { lowerBoundInclusive: 5, upperBoundInclusive: 5 },
    //     type: 'Content',
    //     includeEmptyResults: false,
    //     name: 'Blog Posts',
    //     rotationLimit: 1,
    //     filters: new FilterBuilder().addContentDataFilter("Tag", c => c.addEqualsCondition(DataValueFactory.string("blog"))).build()
    // },

    const response = await recommender.recommendFeedInitialization(builder.build());
    feedId.value = response?.initializedFeedId;
    elements.value = response?.recommendations ?? [];
}

async function recommend() {
    if (loading.value || done.value) return;
    loading.value = true;
    try {
        if (!feedId.value) {
            await initialize();
        }
        else {
            await fetchNextItems();
        }

        if (elements.value.length >= TOTAL) {
            done.value = true;
        }
    } finally {
        loading.value = false;
    }
}

const preloadPx = 600;
function sentinelInPreload() {
    const el = sentinel.value;
    if (!el) return false;
    const top = el.getBoundingClientRect().top;
    return top <= window.innerHeight + preloadPx;
}

async function loadMoreAndFill() {
    await recommend();
    await nextTick();
    while (!loading.value && !done.value && sentinelInPreload()) {
        await recommend();
        await nextTick();
    }
}

onMounted(async () => {
    await loadMoreAndFill()
    io = new IntersectionObserver(
        (entries) => entries[0]?.isIntersecting && loadMoreAndFill(),
        { root: null, rootMargin: `0px 0px ${preloadPx}px 0px`, threshold: 0 }
    )
    if (sentinel.value) io.observe(sentinel.value);
})

onBeforeUnmount(() => {
    if (io && sentinel.value) io.unobserve(sentinel.value);
    io = null;
})
</script>
