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
    <RouterLink
        :to="{ name: 'content', params: { id: content.contentId } }"
        class="relative flex flex-col overflow-hidden bg-white text-slate-900 font-medium hover:!text-brand-500 transition duration-200">
        <div class="mt-2 flex gap-4 items-center">
            <div v-if="findImage(content)" class="w-28 h-28 flex-shrink-0">
                <Image :entity="content"/>
            </div>
            <div class="text-left">
                <h5 class="tracking-tight text-lg">
                    {{ content.displayName }}
                </h5>
            </div>
        </div>
    </RouterLink>
</template>