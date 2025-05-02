<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import Image from './Image.vue';
import { findImage } from '@/helpers/imageHelper';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
    isPromotion: { type: Boolean, required: false, default: false },
});

const { content: content } = toRefs(props);

</script>

<template>
    <RouterLink :to="{ name: 'content', params: { id: content.contentId } }"
                class="relative flex flex-col overflow-hidden bg-white text-slate-900 hover:!text-brand-500 transition duration-200">
        <div class="mt-2 flex gap-2">
            <div v-if="findImage(content)" class="w-20 h-20 flex-shrink-0">
                <Image :entity="content"/>
            </div>
            <div class="text-left">
                <h5 class="tracking-tight leading-tight line-clamp-2">
                    {{ content.displayName }}
                </h5>
            </div>
        </div>
    </RouterLink>
</template>