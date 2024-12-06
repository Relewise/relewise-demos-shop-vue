<script setup lang="ts">
import type { ContentResult, ContentSearchResponse } from '@relewise/client';
import { toRefs, type PropType } from 'vue';
import ProductImage from './ProductImage.vue';
// import Popover from '@/components/Popover.vue';
// import { ExclamationCircleIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const { content } = toRefs(props);

</script>

<template>
    <RouterLink :to="{ name: 'content-blog', params: { id: content.contentId } }"
        class="relative flex flex-col overflow-hidden bg-white text-slate-900 hover:!text-brand-500 transition duration-200">
        <div class="relative flex h-max-[275px] overflow-hidden justify-center">
            <ProductImage :product="content" />
        </div>
                <div class="mt-2">
                    <div class="text-left">
                        <h5 class="tracking-tight text-lg font-semibold leading-tight line-clamp-2 h-12">
                            {{ content.displayName }}
                        </h5>
                    </div>
                </div>
    </RouterLink>
</template>