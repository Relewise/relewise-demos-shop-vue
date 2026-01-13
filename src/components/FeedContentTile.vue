<template>
    <RouterLink :to="{ name: 'content-feed', params: { 'id': content.contentId ?? '' } }"
        class="relative flex flex-col overflow-hidden text-white bg-white  transition duration-200 h-full rounded-lg p-2 hover:scale-105"
        :class="brandClass">
        <div class="gap-4 items-start h-full flex flex-col">
            <div class="flex-shrink-0">
                <Image :entity="content" />
            </div>

            <div class="text-left flex flex-col flex-1 h-full w-full">
                <h5 class="tracking-tight text-lg font-semibold leading-tight line-clamp-2 h-12">
                    {{ content.displayName ?? content.contentId }}
                </h5>
                <div class="grow"></div>
                <div class="flex justify-end">
                    <!-- <span class="text-sm text-neutral-500" v-if="content.data">
                        {{ content.data['ByLine']?.value }}
                    </span> -->
                    <span class="flex gap-3 text-neutral-400">
                        <ContentSentimentButtons :content="content" />
                    </span>
                </div>
            </div>
        </div>
    </RouterLink>
</template>

<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { computed, toRefs, type PropType } from 'vue';
import Image from './Image.vue';
import ContentSentimentButtons from '@/components/ContentSentimentButtons.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const { content: content } = toRefs(props);

function hashString(s = ''): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

const brandClass = computed(() => {
    const id = content.value?.contentId ?? '';
    const hash = hashString(id);
    const index = (hash % 6) + 1;
    return `brand${index}`;
});
</script>

<style scoped>
.brand1 {
    background-color: #FFC1D7;
    border-color: #FFC1D7;
    color: #0f172a;
}

.brand2 {
    background-color: #FFC1D7;
    color: #0f172a;
}

.brand3 {
    background-color: #53CF78;
    border-color: #53CF78;
    color: #0f172a;
}

.brand4 {
    background-color: #FFD93B;
    border-color: #FFD93B;
    color: #0f172a;
}

.brand5 {
    background-color: #e9effb;
    border-color: #e9effb;
    color: #0f172a;
}

.brand6 {
    background-color: #e0d5d5;
    border-color: #e0d5d5;
    color: #0f172a;
}
</style>