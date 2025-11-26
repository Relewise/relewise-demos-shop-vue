<script setup lang="ts">
import type { ContentResult, User } from '@relewise/client';
import { userIsAnonymous } from '@relewise/client';
import { computed, toRefs, type PropType } from 'vue';
import contextStore from '@/stores/context.store';
import Popover from '@/components/Popover.vue';

const props = defineProps({
    content: { type: Object as PropType<ContentResult>, required: true },
    user: { type: Object as PropType<User>, required: false },
});

const { content } = toRefs(props);
const storeUser = contextStore.user;
const user = computed(() => props.user ?? storeUser.value);
const isAnonymous = computed(() => userIsAnonymous(user.value));
</script>

<template>
    <div class="sentiment-buttons" @click.stop.prevent>
        <relewise-content-sentiment-buttons
            v-if="!isAnonymous"
            :content.prop="content"
            :user.prop="user"
        />
        <Popover v-else placement="bottom-end" :arrow="false" popper-class="favorite-popover">
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
                    Engagement tracking works only when the user is identified.
                </div>
            </template>
        </Popover>
    </div>
</template>

<style scoped>
.sentiment-buttons {
    display: flex;
    justify-content: flex-end;
}

.sentiment-buttons :deep(relewise-content-sentiment-buttons) {
    width: 100%;
}

.fake-sentiment-button {
    display: flex;
    gap: var(--relewise-sentiment-button-gap, 0.5em);
    justify-content: flex-end;
    padding: var(--relewise-sentiment-padding, 0 0.5em 0.5em 0.5em);
}

.fake-sentiment-button__button {
    border: 0;
    border-radius: var(--relewise-sentiment-border-radius, 9999px);
    background-color: var(--relewise-sentiment-background, transparent);
    color: inherit;
    padding: var(--relewise-sentiment-button-padding, 0.35em);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.fake-sentiment-button__icon {
    width: var(--relewise-icon-width, 1rem);
    height: var(--relewise-icon-height, 1rem);
    fill: var(--relewise-icon-color, currentColor);
}

.fake-sentiment-button__icon path {
    stroke: var(--relewise-icon-color, currentColor);
}
</style>
