import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import router from '@/router';
import breakpointService from '@/services/breakpoint.service';

export function useSearchOverlay(initialFilters: Record<string, string | string[]> = { term: '', sort: '' }) {
    const open = ref(false);
    const searchTerm = ref<string>('');
    const page = ref(1);
    const predictionsList = ref<any[]>([]);
    const filters = ref<Record<string, string | string[]>>({ ...initialFilters });
    const route = useRoute();
    let searchFn: (() => void) | undefined;

    function setSearchFn(fn: () => void) {
        searchFn = fn;
    }

    function showOrHide(show: boolean) {
        if (!show) {
            searchTerm.value = '';
            predictionsList.value = [];
            filters.value = { ...initialFilters };
            router.push({ path: router.currentRoute.value.path, query: {} });
        }
        open.value = show;
        if (show) {
            window.document.body.classList.add('overflow-hidden');
            window.document.body.classList.add('xl:pr-[17px]');
        } else {
            window.document.body.classList.remove('overflow-hidden');
            window.document.body.classList.remove('xl:pr-[17px]');
        }
    }

    function close() {
        showOrHide(false);
    }

    watch(() => ({ ...route }), (value, oldValue) => {
        if (route.query.open === '1' && !open.value) {
            scrollTo({ top: 0 });

            const searchParams = new URLSearchParams(window.location.search);
            searchParams.forEach((value, key) => {
                if (key === 'term') {
                    searchTerm.value = value;
                    return;
                }
                if (key === 'sort') {
                    filters.value.sort = value;
                    return;
                }
                const existing = filters.value[key];
                existing && Array.isArray(existing) ? existing.push(value) : filters.value[key] = [value];
            });

            filters.value['open'] = '1';

            searchFn && searchFn();
            return;
        } else if (value.query.open !== '1' && oldValue.query.open === '1') {
            close();
        }
    });

    watch(breakpointService.active, () => {
        if (route.query.open === '1' && searchFn)
            searchFn();
    });

    function typeAHeadSearch() {
        if (filters.value.term !== searchTerm.value) {
            filters.value['open'] = '1';

            searchFn && searchFn();
        }
    }

    return { open, searchTerm, page, predictionsList, filters, route, showOrHide, typeAHeadSearch, close, setSearchFn };
}