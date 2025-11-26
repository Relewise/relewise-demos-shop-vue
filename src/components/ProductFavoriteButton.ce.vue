<script setup lang="ts">
import type { ProductResult } from '@relewise/client';
import { userIsAnonymous, type User } from '@relewise/client';
import { computed, type PropType } from 'vue';
import contextStore from '@/stores/context.store';
import Popover from '@/components/Popover.vue';

const props = defineProps({
    product: { type: Object as PropType<ProductResult>, required: true },
    user: { type: Object as PropType<User>, required: false },
});

const user = contextStore.user;
const isAnonymous = computed(() => userIsAnonymous(user.value));
</script>

<template>
    <div class="favorite-wrapper" @click.stop>
        <relewise-product-favorite-button v-if="!isAnonymous" :product.prop="product" :user.prop="user" />
        <Popover v-else placement="bottom-end" :distance="35" :arrow="false" popper-class="favorite-popover">
            <template #default>
                <button
                    class="favorite-trigger"
                    type="button" @click.stop.prevent>
                    <svg id="svg-icon" class="favorite-icon" aria-hidden="true" viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg" focusable="false" clip-rule="evenodd" fill-rule="evenodd"
                        stroke-linejoin="round" stroke-miterlimit="2" stroke="currentColor" stroke-width="0.2"
                        width="1em" height="1em">
                        <path
                            d="m7.234 3.004c-2.652 0-5.234 1.829-5.234 5.177 0 3.725 4.345 7.727 9.303 12.54.194.189.446.283.697.283s.503-.094.697-.283c4.977-4.831 9.303-8.814 9.303-12.54 0-3.353-2.58-5.168-5.229-5.168-1.836 0-3.646.866-4.771 2.554-1.13-1.696-2.935-2.563-4.766-2.563zm0 1.5c1.99.001 3.202 1.353 4.155 2.7.14.198.368.316.611.317.243 0 .471-.117.612-.314.955-1.339 2.19-2.694 4.159-2.694 1.796 0 3.729 1.148 3.729 3.668 0 2.671-2.881 5.673-8.5 11.127-5.454-5.285-8.5-8.389-8.5-11.127 0-1.125.389-2.069 1.124-2.727.673-.604 1.625-.95 2.61-.95z"
                            fill-rule="nonzero" />
                    </svg>
                </button>
            </template>
            <template #content>
                <div class="favorite-popover-content">
                    You need to be logged in or accept marketing cookies to favorite products.
                </div>
            </template>
        </Popover>
    </div>
</template>
<style scoped lang="postcss">
.favorite-wrapper {
    position: relative;
}

.favorite-trigger {
    @apply absolute top-2 right-2 z-10 text-slate-900 bg-white/90 rounded-full inline-flex items-center justify-center;
    padding: 0.35em;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.favorite-icon {
    @apply h-4 w-4;
}

.favorite-popover-content {
    @apply max-w-xs p-4 text-sm text-slate-700;
}
</style>
