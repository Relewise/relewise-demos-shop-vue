import { onBeforeUnmount, onMounted, ref } from 'vue';

export function useHeaderInteraction() {
    const open = ref<string | null>(null);
    const headerElement = ref<HTMLElement | null>(null);
    const headerHeight = ref(106);
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
    let headerResizeObserver: ResizeObserver | null = null;

    const handleMouseOver = (categoryId: string) => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        hoverTimeout = setTimeout(() => {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            document.body.classList.add('overflow-hidden');

            if (!document.body.style.marginRight) {
                document.body.style.marginRight = `${scrollbarWidth}px`;
            }

            open.value = categoryId;
        }, 250);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        const searchParams = new URLSearchParams(window.location.search);
        const isSearchOverlayOpen = searchParams.get('open') === '1';

        if (!isSearchOverlayOpen) {
            document.body.classList.remove('overflow-hidden');
            document.body.style.marginRight = '';
        }

        open.value = null;
    };

    onMounted(() => {
        if (!headerElement.value) {
            return;
        }

        const updateHeaderHeight = () => {
            headerHeight.value = Math.ceil(headerElement.value?.getBoundingClientRect().height ?? 106);
            document.documentElement.style.setProperty('--header-height', `${headerHeight.value}px`);
        };

        updateHeaderHeight();
        headerResizeObserver = new ResizeObserver(updateHeaderHeight);
        headerResizeObserver.observe(headerElement.value);
    });

    onBeforeUnmount(() => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        headerResizeObserver?.disconnect();
    });

    return {
        open,
        headerElement,
        headerHeight,
        handleMouseOver,
        handleMouseLeave,
    };
}
