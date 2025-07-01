<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import Image from './Image.vue';
import { findImage } from '@/helpers/imageHelper';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
    showContentDemoVariant: {type: Boolean, required: false, default: false },
    isPromotion: { type: Boolean, required: false, default: false },
});

const { content: content, showContentDemoVariant } = toRefs(props);

</script>

<template>
    <RouterLink v-if="showContentDemoVariant"
                :to="{ name: 'content', params: { id: content.contentId } }"
                class="relative flex flex-col overflow-hidden bg-white text-slate-900 hover:!text-brand-500 transition duration-200">
        <div class="relative flex h-max-[275px] overflow-hidden justify-center">
            <Image v-if="findImage(content)" :entity="content"/>
        </div>
        <div class="mt-2">
            <div class="text-left">
                <h5 class="tracking-tight text-lg font-semibold leading-tight line-clamp-2 h-12">
                    {{ content.displayName }}
                </h5>
            </div>
        </div>
    </RouterLink>
    <RouterLink v-else
                :to="{ name: 'content', params: { id: content.contentId } }"
                class="relative flex flex-col overflow-hidden bg-white text-slate-900 hover:!text-brand-500 transition duration-200">
        <div class="mt-2 flex gap-2">
            <div v-if="findImage(content)" class="w-40 h-40 flex-shrink-0">
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