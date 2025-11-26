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
    <div class="sentiment-buttons" @click.stop>
        <relewise-content-sentiment-buttons
            v-if="!isAnonymous"
            :content.prop="content"
            :user.prop="user"
        />
        <Popover v-else placement="bottom-end" :distance="35" :arrow="false" popper-class="favorite-popover">
            <template #default>
                <div
                    class="sentiment-buttons__fallback"
                    role="group"
                    aria-label="Content sentiment actions"
                    aria-disabled="true"
                    @click.stop.prevent
                >
                    <button
                        type="button"
                        class="sentiment-buttons__button"
                        aria-disabled="true"
                        tabindex="-1"
                        @click.stop.prevent
                    >
                        <relewise-like-icon
                            class="sentiment-buttons__icon"
                            aria-hidden="true"
                        ></relewise-like-icon>
                    </button>
                    <button
                        type="button"
                        class="sentiment-buttons__button"
                        aria-disabled="true"
                        tabindex="-1"
                        @click.stop.prevent
                    >
                        <relewise-dislike-icon
                            class="sentiment-buttons__icon"
                            aria-hidden="true"
                        ></relewise-dislike-icon>
                    </button>
                </div>
            </template>
            <template #content>
                <div class="favorite-popover-content max-w-xs p-4 text-sm text-slate-700">
                    You need to be logged in or accept marketing cookies to favorite products.
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

.sentiment-buttons__fallback {
    display: flex;
    gap: var(--relewise-sentiment-button-gap, 0.5em);
    justify-content: flex-end;
    padding: var(--relewise-sentiment-padding, 0 0.5em 0.5em 0.5em);
}

.sentiment-buttons__button {
    border: 0;
    border-radius: var(--relewise-sentiment-border-radius, 9999px);
    background-color: var(--relewise-sentiment-background, transparent);
    color: inherit;
    padding: var(--relewise-sentiment-button-padding, 0.35em);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
    opacity: 0.5;
}

.sentiment-buttons__icon {
    width: var(--relewise-icon-width, 1rem);
    height: var(--relewise-icon-height, 1rem);
    fill: var(--relewise-icon-color, currentColor);
}

.sentiment-buttons__icon path {
    stroke: var(--relewise-icon-color, currentColor);
}
</style>
