<template>
    <main class="pt-6 grow px-2 xl:px-0">
        <div class="container mx-auto">
            <h1 class="text-3xl font-semibold mb-4 text-neutral-100">Shoppertainment: Adaptive Discovery</h1>
        </div>

        <article class="mb-4">
            <div class="mx-auto container">
                <div v-if="error" class="p-2 border border-red-500 rounded bg-white text-red-600">{{ error }}</div>
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <template v-for="(group, index) in elements" :key="index" v-if="feedId">
                        <span v-for="ele in group.content" :key="String(ele.contentId)" :data-feed-item-type="'Content'"
                            :data-feed-item-id="ele.contentId" class="feed-item">
                            <FeedContentTile :content="ele" @click="trackClick('Content', ele.contentId!)" />
                        </span>

                        <span v-for="ele in group.products" :key="String(ele.productId)"
                            :data-feed-item-type="'Product'" :data-feed-item-id="ele.productId" class="feed-item">
                            <ProductTile :product="ele" @click="trackClick('Product', ele.productId!)" />
                        </span>
                    </template>
                </div>
            </div>

        </article>

        <div v-if="loading" class="py-6 text-center text-sm text-neutral-100 opacity-70">
            Loading more…
        </div>
        <div v-else-if="done" class="py-6 text-center text-sm text-neutral-100 opacity-70">
            You’re all caught up
        </div>

        <div ref="sentinel" class="h-2"></div>
    </main>
</template>

<script setup lang="ts">
import FeedContentTile from '@/components/FeedContentTile.vue';
import ProductTile from '@/components/ProductTile.vue';
import contextStore from '@/stores/context.store';
import { FeedRecommendationInitializationBuilder, FeedRecommendationNextItemsBuilder, type FeedCompositionResult, type FeedItem } from '@relewise/client';
import { onMounted, onBeforeUnmount, ref, nextTick, onUnmounted } from 'vue'
import trackingService from '@/services/tracking.service';

const recommender = contextStore.getRecommender();

onMounted(() => {
    document.getElementById('app')?.classList.add('bg-gradient');
});
onUnmounted(() => {
    document.getElementById('app')?.classList.remove('bg-gradient');
});

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

function trackClick(type: "Product" | "Content", id: string) {
    if (!feedId.value) return;

    const item: FeedItem = type === 'Product'
        ? { productAndVariantId: { productId: id } }
        : { contentId: id }

    contextStore.getTracker().trackFeedItemClick({ user: contextStore.user.value, feedId: feedId.value, item });
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
    const builder = new FeedRecommendationInitializationBuilder(contextStore.defaultSettings, { minimumPageSize: 20 })
        .setSelectedContentProperties(contextStore.selectedContentProperties)
        .setSelectedProductProperties(contextStore.selectedProductProperties)
        .allowProductsCurrentlyInCart()
        .addCompostion({ options: { type: 'Product', count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 } } })
        .addCompostion({ options: { type: 'Content', count: { lowerBoundInclusive: 1, upperBoundInclusive: 1 } } });

    try {
        const response = await recommender.recommendFeedInitialization(builder.build());
        feedId.value = response?.initializedFeedId;
        elements.value = response?.recommendations ?? [];
    } catch (err: any) {
        error.value = err.message;
    }
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