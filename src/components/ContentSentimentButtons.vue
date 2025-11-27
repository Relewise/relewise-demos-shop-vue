<script setup lang="ts">
import type { ContentResult } from '@relewise/client';
import { userIsAnonymous } from '@relewise/client';
import { computed, toRefs, type PropType } from 'vue';
import contextStore from '@/stores/context.store';
import Popover from '@/components/Popover.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
});

const user = contextStore.user;
const isAnonymous = computed(() => userIsAnonymous(user.value));
</script>

<template>
    <div class="sentiment-buttons" @click.stop.prevent>
        <relewise-content-sentiment-buttons
            v-if="!isAnonymous"
            :content.prop="content"
            :user.prop="user"
        />
        <Popover v-else placement="right-end" :arrow="false" popper-class="favorite-popover">
            <template #default>
                <div
                    class="fake-sentiment-button"
                    role="group"
                    aria-label="Content sentiment actions"
                >
                    <button
                        type="button"
                        class="fake-sentiment-button__button"
                    >
                        <relewise-like-icon
                            class="fake-sentiment-button__icon"
                            aria-hidden="true"
                        ></relewise-like-icon>
                    </button>
                    <button
                        type="button"
                        class="fake-sentiment-button__button"
                    >
                        <relewise-dislike-icon
                            class="fake-sentiment-button__icon"
                            aria-hidden="true"
                        ></relewise-dislike-icon>
                    </button>
                </div>
            </template>
            <template #content>
                <div class="favorite-popover-content max-w-xs p-4 text-sm text-slate-700">
                    This feature requires a non-anonymous user.
                </div>
            </template>
        </Popover>
    </div>
</template>

<style scoped>
.fake-sentiment-button {
    display: flex;
    gap: var(--relewise-sentiment-button-gap, 0.5em);
    padding: var(--relewise-sentiment-padding, 0 0.5em 0.5em 0.5em);
    justify-content: flex-end;
}

.fake-sentiment-button__button {
    border: 0;
    border-radius: var(--relewise-sentiment-border-radius, 9999px);
    background-color: var(--relewise-sentiment-background, transparent);
    color: inherit;
    cursor: pointer;
    padding: var(--relewise-sentiment-button-padding, 0.35em);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease, color 0.2s ease;
}
</style>
