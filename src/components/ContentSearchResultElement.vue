<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { toRefs, type PropType, computed } from 'vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const { content } = toRefs(props);

const summarySnippet = computed(() => {
    const highlight = content.value?.highlight;
    const snippetText = highlight?.snippets?.data?.find(h => h.key === 'Summary')?.value?.[0]?.text;
    const matchedOffsets = highlight?.snippets?.data?.find(h => h.key === 'Summary')?.value?.[0]?.matchedWords?.map(m => m.offset) ?? [];

    if (snippetText && matchedOffsets.length > 0) {
        const sortedOffsets = matchedOffsets.sort((a, b) => {
            if (!a || !b) return 0;
            return a.lowerBoundInclusive - b.lowerBoundInclusive;
        });

        let result = '';
        let currentIndex = 0;

        for (const offset of sortedOffsets) {
            if (!offset) continue;
            result += snippetText.slice(currentIndex, offset.lowerBoundInclusive);
            result += '<strong>' + snippetText.slice(offset.lowerBoundInclusive, offset.upperBoundInclusive + 1) + '</strong>';
            currentIndex = offset.upperBoundInclusive + 1;
        }

        result += snippetText.slice(currentIndex);
        return result;
    }

    return snippetText ?? content.value?.data?.Summary?.value ?? 'No description available.';
});

</script>

<template>
    <div class="flex flex-row justify-between p-4 border-b border-slate-200 hover:bg-slate-50 transition duration-150">
        <div class="flex-1 flex flex-col gap-2 pr-4">
            <RouterLink :to="{ name: 'content', params: { id: content.contentId } }"
                        class="text-xl text-blue-600 hover:underline font-medium">
                {{ content.displayName }}
            </RouterLink>
            <div class="text-sm text-green-700">
                /content/{{ content.contentId }}
            </div>
            <div class="text-sm text-slate-700 line-clamp-2">
                <div class="text-sm text-slate-700 line-clamp-2" v-html="summarySnippet"></div>
            </div>
        </div>
        <div class="w-32 h-32 flex-shrink-0 flex items-center justify-center">
            <ProductImage :product="content" class="max-w-full max-h-full object-contain"/>
        </div>
    </div>
</template>