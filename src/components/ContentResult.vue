<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { toRefs, type PropType, computed } from 'vue';
import ProductImage from './ProductImage.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const { content } = toRefs(props);

const summarySnippet = computed(() => {
    const highlight = content.value?.highlight;
    const snippetText = highlight?.snippets?.data?.find(h => h.key === 'Summary')?.value?.[0]?.text;
    const offset = highlight?.offsets?.data?.find(h => h.key === 'Summary')?.value?.[0];

    if (snippetText && offset) {
        const before = snippetText.slice(0, offset.lowerBoundInclusive);
        const match = snippetText.slice(offset.lowerBoundInclusive, offset.upperBoundInclusive + 1);
        const after = snippetText.slice(offset.upperBoundInclusive + 1);
        return `${before}<strong>${match}</strong>${after}`;
    }

    return snippetText ?? content.value?.data?.Summary?.value ?? 'No description available.';
});

</script>

<template>
    <div class="flex flex-row justify-between p-4 border-b border-slate-200 hover:bg-slate-50 transition duration-150">
        <div class="flex-1 flex flex-col gap-2 pr-4">
            <RouterLink
                :to="{ name: 'content-blog', params: { id: content.contentId } }"
                class="text-xl text-blue-600 hover:underline font-medium"
            >
                {{ content.displayName }}
            </RouterLink>
            <div class="text-sm text-green-700">
                /content-blog/{{ content.contentId }}
            </div>
            <div class="text-sm text-slate-700 line-clamp-2">
                <div v-html="summarySnippet" class="text-sm text-slate-700 line-clamp-2"></div>
            </div>
        </div>
        <div class="w-32 h-32 flex-shrink-0 flex items-center justify-center">
            <ProductImage :product="content" class="max-w-full max-h-full object-contain" />
        </div>
    </div>
</template>