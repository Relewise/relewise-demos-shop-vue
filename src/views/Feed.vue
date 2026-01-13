<template>
    <main class="pt-6 grow px-2 xl:px-0">
        <div class="container mx-auto" v-if="!topProduct && !topContent">
            <h1 class=" text-3xl font-semibold mb-4 underline--yellow inline-flex">Shoppertainment: Adaptive Discovery
            </h1>
        </div>

        <div class="container mx-auto mb-6 rounded-lg p-2 shadow bg-brand-50" v-if="topProduct || topContent">
            <div v-if="topProduct" class="relative p-2 rounded">
                <app-product-favorite-button :product="topProduct" />
                <div class="flex flex-col lg:flex-row gap-4 items-center">
                    <div class="w-32 h-32 flex-shrink-0">
                        <Image :entity="topProduct" />
                    </div>
                    <div class="flex-1">

                        <h2 class="inline-flex text-2xl font-semibold underline--yellow">{{ topProduct?.displayName }}
                        </h2>
                        <p class="text-sm text-slate-600 line-clamp-3" v-if="topProduct?.data">{{
                            topProduct?.data?.description?.value ?? topProduct?.data?.Description?.value }}</p>
                    </div>
                    <div class="flex-shrink-0 items-end">
                        <button type="button"
                            class="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                            :class="topButtonClass" @click="addProductToBasket">
                            Add to cart
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="topContent" class="p-2 rounded">
                <div class="relative flex gap-4 items-start">
                    <div class="w-32 h-32 flex-shrink-0" v-if="findImage(topContent)">
                        <Image :entity="topContent" />
                    </div>
                    <div class="flex flex-col gap-1">

                        <h2 class="text-2xl font-semibold inline-flex">
                            {{ topContent?.displayName }}
                        </h2>
                        <div class="text-sm text-slate-600 line-clamp-3" v-if="topContent?.data?.Body?.value"
                            v-html="topContent?.data?.Body?.value"></div>
                        <span class="flex gap-3 text-neutral-400">
                            <ContentSentimentButtons :content="topContent" />
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <article class="mb-4">
            <div class="mx-auto container">
                <div v-if="error" class="p-2 border border-red-500 rounded bg-white text-red-600">{{ error }}</div>
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
                    <template v-for="(group, index) in elements" :key="index" v-if="feedId">
                        <span v-for="ele in group.content" :key="String(ele.contentId)" :data-feed-item-type="'Content'"
                            :data-feed-item-id="ele.contentId" class="feed-item">
                            <FeedContentTile :content="ele" @click="trackClick('Content', ele.contentId!)" />
                        </span>

                        <span v-for="ele in group.products" :key="String(ele.productId)"
                            :data-feed-item-type="'Product'" :data-feed-item-id="ele.productId" class="feed-item"
                            :class="group.name === 'Full' ? 'col-span-2' : ''">
                            <ProductTile :product="ele" class="hover:!scale-[1.02]"
                                @click.prevent=" router.push({ name: 'product-feed', params: { 'id': ele.productId } }); trackClick('Product', ele.productId!);" />
                        </span>
                    </template>
                </div>
            </div>

        </article>

        <div v-if="loading" class="py-6 text-center text-sm text-neutral-950 opacity-70">
            Loading more…
        </div>
        <div v-else-if="done" class="py-6 text-center text-sm text-neutral-950 opacity-70">
            You’re all caught up
        </div>

        <div ref="sentinel" class="h-2"></div>
    </main>
</template>

<script setup lang="ts">
import FeedContentTile from '@/components/FeedContentTile.vue';
import ProductTile from '@/components/ProductTile.vue';
import Image from '@/components/Image.vue';
import contextStore from '@/stores/context.store';
import { FeedRecommendationInitializationBuilder, FeedRecommendationNextItemsBuilder, type FeedCompositionResult, type ProductResult, type ContentResult } from '@relewise/client';
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router';
import { findImage } from '@/helpers/imageHelper';
import trackingService from '@/services/tracking.service';
import basketService from '@/services/basket.service';
import router from '@/router';
import ContentSentimentButtons from '@/components/ContentSentimentButtons.vue';

const recommender = contextStore.getRecommender();
const route = useRoute();

const loading = ref(false);
const done = ref(false);
const sentinel = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
let io: IntersectionObserver | null = null;
let itemObserver: IntersectionObserver | null = null;
const visibleItems = ref(new Set<string>());
const visibleStartTimes = ref(new Map<string, number>());
const dwelledItems = ref(new Set<string>());
let idleTimer: number | null = null;
let onScroll: (() => void) | null = null;
const hasScrolled = ref(false);
const dwellTimeoutMs = 1500; // wait for 1.5s of no scrolling
let lastScrollTime = 0;

const TOTAL = 40;

const feedId = ref<string>();
const elements = ref<FeedCompositionResult[]>([]);

// Top seeded item details (if route contains an id for product-feed/:id or content-feed/:id)
const topProduct = ref<ProductResult | null | undefined>(null);
const topContent = ref<ContentResult | null | undefined>(null);
const topButtonClass = ref('');

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
    const isMobile = breakpointService.active.value === 'mobile';

    const builder = new FeedRecommendationInitializationBuilder(contextStore.defaultSettings, { minimumPageSize: isMobile ? 6 : 15 })
        .setSelectedContentProperties(contextStore.selectedContentProperties)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .allowProductsCurrentlyInCart()
        .addCompostion({ options: { type: 'Product', count: { lowerBoundInclusive: isMobile ? 3 : 4, upperBoundInclusive: isMobile ? 3 : 4 } } })
        .addCompostion({ options: { type: 'Content', count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 } } })
        .addCompostion({ options: { name: 'Full', type: 'Product', count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 } } })
        .addCompostion({ options: { type: 'Product', count: { lowerBoundInclusive: 1, upperBoundInclusive: isMobile ? 6 : 10 } } })
        .addCompostion({ options: { type: 'Content', count: { lowerBoundInclusive: 1, upperBoundInclusive: 3 } } })

    // If route contains an id for product-feed/:id or content-feed/:id, seed the initialization
    const idParam = route.params.id;
    if (idParam && !Array.isArray(idParam)) {
        const path = route.path ?? '';
        if (path.includes('/product-feed/') || path.includes('product-feed')) {
            // fetch product details to show at the top
            topProduct.value = await fetchProduct(idParam);
            builder.seed({
                productAndVariantIds: [{ productId: idParam }],
            });
            // TODO Should this be a preview-tracking instead?
            trackingService.trackProductView(idParam);
        } else if (path.includes('/content-feed/') || path.includes('content-feed')) {
            topContent.value = await fetchContent(idParam);
            builder.seed({
                contentIds: [idParam],
            });
            trackingService.trackContentView(idParam);
        }
    }

    try {
        const response = await recommender.recommendFeedInitialization(builder.build());
        feedId.value = response?.initializedFeedId;
        elements.value = response?.recommendations ?? [];
    } catch (err: any) {
        error.value = err.message;
    }
}

function trackClick(type: "Product" | "Content", id: string) {
    if (!feedId.value) return;

    trackingService.trackFeedItemClick(feedId.value, type === "Product" ? { productAndVariantId: { productId: id } } : { contentId: id });
}

function addProductToBasket() {
    if (!topProduct.value) return;

    basketService.addProduct({ product: topProduct.value, quantityDelta: 1 });
    trackingService.trackCart(basketService.model.value.lineItems);

    topButtonClass.value = 'animate-bounce';
    setTimeout(() => topButtonClass.value = '', 2000);
}

// If the route changes, reinitialize the feed using the new route param (if any)
import { watch } from 'vue';
import breakpointService from '@/services/breakpoint.service';
import { fetchContent, fetchProduct } from '@/helpers/feedHelpers';
watch(route, async () => {
    feedId.value = undefined;
    elements.value = [];
    topProduct.value = null;
    topContent.value = null;
    await loadMoreAndFill();
});

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
    // Ensure we observe any newly added feed-item elements
    observeFeedItems();
    while (!loading.value && !done.value && !error.value && sentinelInPreload()) {
        await recommend();
        await nextTick();
        // ensure new items also get observed
        observeFeedItems();
    }
}

onMounted(async () => {
    await loadMoreAndFill()
    io = new IntersectionObserver(
        (entries) => entries[0]?.isIntersecting && loadMoreAndFill(),
        { root: null, rootMargin: `0px 0px ${preloadPx}px 0px`, threshold: 0 }
    )
    if (sentinel.value) io.observe(sentinel.value);

    // observe the feed item elements for intersection
    itemObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const el = entry.target as HTMLElement;
            const id = el.dataset.feedItemId;
            const type = el.dataset.feedItemType;
            if (!id || !type) return;
            const key = `${type}:${id}`;
            if (entry.isIntersecting) {
                visibleItems.value.add(key);
                if (!visibleStartTimes.value.has(key)) {
                    visibleStartTimes.value.set(key, Date.now());
                }
            } else {
                visibleItems.value.delete(key);
                visibleStartTimes.value.delete(key);
            }
        });
    }, { root: null, threshold: 0.5 });

    observeFeedItems();

    // Only start recording dwell after user has scrolled once
    onScroll = () => {
        if (!hasScrolled.value) hasScrolled.value = true;
        lastScrollTime = Date.now();
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        idleTimer = window.setTimeout(() => {
            if (hasScrolled.value) {
                recordDwell();
            }
        }, dwellTimeoutMs);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
})

onBeforeUnmount(() => {
    if (io && sentinel.value) io.unobserve(sentinel.value);
    io = null;
    if (itemObserver) {
        itemObserver.disconnect();
        itemObserver = null;
    }
    if (onScroll) {
        window.removeEventListener('scroll', onScroll);
    }
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
})

function observeFeedItems() {
    if (!itemObserver) return;
    const nodes = Array.from(document.querySelectorAll('.feed-item')) as HTMLElement[];
    nodes.forEach(n => itemObserver!.observe(n));
}

async function recordDwell() {
    if (!feedId.value) return;

    // gather items currently visible, excluding those already dwelled
    const keys = Array.from(visibleItems.value).filter(k => !dwelledItems.value.has(k));
    if (keys.length === 0) return;

    const itemsWithDurations = keys.map(k => {
        const parts = k.split(':');
        const type = parts[0];
        const id = parts[1]! as string;
        const start = visibleStartTimes.value.get(k) ?? lastScrollTime ?? Date.now();
        const duration = Math.max(0, Date.now() - (start ?? Date.now()));
        return type === 'Product'
            ? { productAndVariantId: { productId: id }, dwellDurationMs: duration }
            : { contentId: id, dwellDurationMs: duration };
    });

    // aggregated dwell time - use time since last scroll if available as a reasonable time window
    const dwellTimeMs = lastScrollTime ? Math.max(0, Date.now() - lastScrollTime) : Math.max(...itemsWithDurations.map(i => i.dwellDurationMs ?? 0));

    await trackingService.trackFeedItemsDwell(feedId.value, itemsWithDurations, dwellTimeMs);
    // mark items as dwelled to avoid duplicates
    for (const k of keys) {
        dwelledItems.value.add(k);
        visibleStartTimes.value.delete(k);
    }
}
</script>

<style lang="css" scoped>
@media not all and (min-width: 640px) {
    .feed-item {
        margin: 0 4px 0 4px;

        &:nth-child(even) {
            margin-top: 20px;
        }
    }
}
</style>
