<template>
    <RouterLink :to="{ name: 'content', params: { id: content.contentId } }"
        class="relative flex flex-col overflow-hidden text-slate-900 bg-white hover:!text-brand-500 transition duration-200 h-full rounded-lg p-2 shadow hover:scale-105">
        <div class="gap-4 items-start h-full flex flex-col">
            <div v-if="findImage(content)" class="flex-shrink-0">
                <Image :entity="content" />
            </div>

            <div class="text-left flex flex-col flex-1 h-full w-full">
                <h5 class="tracking-tight text-lg font-semibold leading-tight line-clamp-2 h-12">
                    {{ content.displayName }}
                </h5>
                <div class="grow"></div>
                <div class="flex justify-between">
                    <span class="text-sm text-neutral-500">{{ content.data!['ByLine']?.value }}</span>
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
import { toRefs, type PropType } from 'vue';
import Image from './Image.vue';
import { findImage } from '@/helpers/imageHelper';
import ContentSentimentButtons from '@/components/ContentSentimentButtons.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const { content: content } = toRefs(props);
</script>