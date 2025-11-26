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
    <div class="favorite-wrapper" @click.stop.prevent>
        <relewise-product-favorite-button v-if="!isAnonymous" :product.prop="product" :user.prop="user" />
        <Popover v-else placement="bottom-end" :arrow="false" popper-class="favorite-popover">
            <template #default>
                <button
                    class="fake-favorite-button"
                    type="button" @click.stop.prevent>
                    <relewise-heart-icon></relewise-heart-icon>
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

<!-- web components styling -->
<style scoped>
.fake-favorite-button {
    border: 0;
    background-color: var(--relewise-favorite-background, rgba(255, 255, 255, 0.9));
    padding: var(--relewise-favorite-padding, 0.35em);
    color: inherit;
    cursor: pointer;
    border-radius: var(--relewise-favorite-border-radius, 9999px);
    box-shadow: var(--relewise-favorite-shadow, 0 1px 4px rgba(0, 0, 0, 0.12));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    top: var(--relewise-favorite-top, 0.5em);
    right: var(--relewise-favorite-right, 0.5em);
    position: absolute;
    z-index: var(--relewise-favorite-z-index, 2);
}
</style>
