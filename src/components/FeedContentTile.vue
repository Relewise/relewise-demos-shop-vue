<template>
    <RouterLink :to="{ name: 'content', params: { id: content.contentId } }"
        class="relative flex flex-col overflow-hidden text-slate-900 hover:!text-brand-500 transition duration-200 h-full">
        <div class="gap-4 items-start h-full flex flex-col">
            <div v-if="findImage(content)" class="flex-shrink-0">
                <Image :entity="content" />
            </div>

            <div class="text-left flex flex-col flex-1 h-full">
                <h5 class="tracking-tight text-lg font-semibold leading-tight line-clamp-2 h-12">
                    {{ content.displayName }}
                </h5>
                <div class="flex justify-between">
                    <span class="text-sm text-neutral-500">{{ content.data!['ByLine']?.value }}</span>
                    <span class="flex gap-3 text-neutral-400">
                        <HandThumbUpIcon class="h-5 hover:text-neutral-800" @click.prevent.stop="giveFeedback('Like')"/>
                        <HandThumbDownIcon class="h-5 hover:text-neutral-800" @click.prevent.stop="giveFeedback('Dislike')" />
                    </span>
                </div>
            </div>
        </div>
    </RouterLink>
</template>

<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import Image from './Image.vue';
import { findImage } from '@/helpers/imageHelper';
import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/vue/24/solid';
import contextStore from '@/stores/context.store';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
    feedId: { type: String, required: true }
});

const { content: content, feedId } = toRefs(props);

function giveFeedback(kind: "Like" | "Dislike") {
    if (!feedId.value) return;

    const item = content.value.contentId!;

    contextStore.getTracker().trackContentEngagement({ 
        user: contextStore.user.value, 
        engagement: {
            sentiment: kind
        },
        id: item
    });
}
</script>