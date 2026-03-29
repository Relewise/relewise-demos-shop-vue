import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export function useStickyPinned(element: Ref<HTMLElement | null>, threshold = 12) {
    const isPinned = ref(false);

    const updatePinnedState = () => {
        if (!element.value) {
            isPinned.value = false;
            return;
        }

        isPinned.value = element.value.getBoundingClientRect().top <= threshold;
    };

    onMounted(() => {
        updatePinnedState();
        window.addEventListener('scroll', updatePinnedState, { passive: true });
        window.addEventListener('resize', updatePinnedState);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('scroll', updatePinnedState);
        window.removeEventListener('resize', updatePinnedState);
    });

    return {
        isPinned,
        updatePinnedState,
    };
}
