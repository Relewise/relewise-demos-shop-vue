<script setup lang="ts">
import type { ContentResult, ContentSearchResponse } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import ProductImage from './ProductImage.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const { content } = toRefs(props);

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
                <div v-html="content.data?.Body.value ?? 'No description available.'" class="text-sm text-slate-700 line-clamp-2"></div>
            </div>
        </div>
        <div class="w-32 h-32 flex-shrink-0">
            <div class="relative w-full h-full overflow-hidden justify-center flex">
                <ProductImage :product="content" />
            </div>
        </div>
    </div>
</template>