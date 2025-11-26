<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { computed, toRefs, type PropType } from 'vue';
import Image from './Image.vue';
import { findImage } from '@/helpers/imageHelper';
import contextStore from '@/stores/context.store';
import { highlightWithOffsets } from '@/helpers/highligther';
import ContentSentimentButtons from '@/components/ContentSentimentButtons.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
    isPromotion: { type: Boolean, required: false, default: false },
    showSummary: { type: Boolean, required: false, default: false },
});

const { content: content } = toRefs(props);

const summarySnippet = computed(() => {
    const highlight = content.value?.highlight;
    const snippetObj = highlight?.snippets?.data?.find(h => h.key === 'Summary')?.value?.[0];
    const snippetText = snippetObj?.text;
    const matchedOffsets = snippetObj?.matchedWords?.map(m => m.offset).filter(m => !!m) ?? [];

    if (snippetText && matchedOffsets.length > 0) {
        return highlightWithOffsets(snippetText, matchedOffsets);
    }

    return snippetText ?? content.value?.data?.Summary?.value ?? 'No summary available.';
});

const displayName = computed(() => {
    if (!contextStore.context.value.searchHighlight || !content.value.displayName)
        return content.value.displayName;

    const highlight = content.value.highlight;
    const matchedOffsets = highlight?.offsets?.displayName;

    return highlightWithOffsets(content.value.displayName, matchedOffsets);
});
</script>

<template>
    <RouterLink
        :to="{ name: 'content', params: { id: content.contentId } }"
        class="relative flex flex-col overflow-hidden bg-white text-slate-900 hover:!text-brand-500 transition duration-200 h-full">
        <div class="mt-2 flex gap-4 items-start h-full">
            <div v-if="findImage(content)"
                 class="flex-shrink-0"
                 :class="showSummary ? 'w-36 h-36' : 'w-28 h-28'">
                <Image :entity="content"/>
            </div>

            <div class="text-left flex flex-col flex-1 h-full">
                <h5 class="tracking-tight font-medium"
                    :class="showSummary ? 'text-2xl' : 'text-lg'"
                    v-html="displayName">
                </h5>
                <span v-if="showSummary" class="text-slate-700 flex-1 mt-1 overflow-hidden line-clamp-2" v-html="summarySnippet"></span>
                <div v-if="showSummary" class="mt-3 flex justify-end">
                    <ContentSentimentButtons :content="content" />
                </div>
            </div>
        </div>
    </RouterLink>
</template>
