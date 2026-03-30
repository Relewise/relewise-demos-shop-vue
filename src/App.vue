<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router';
import contextStore from './stores/context.store';
import { Searcher, type CategoryResult, type CategoryHierarchyFacetResult, ProductSearchBuilder, type CategoryHierarchyFacetResultCategoryNode } from '@relewise/client';
import { ref } from 'vue';
import { computed, onMounted, watch } from 'vue';
import basketService from './services/basket.service';
import Header from './layout/Header.vue';
import Footer from './layout/Footer.vue';
import breakpointService from './services/breakpoint.service';
import notificationsStore from './stores/notifications.store';
import { Toaster } from 'vue-sonner';

export type NavigationItem = { id: string, category: CategoryResult, children: CategoryHierarchyFacetResultCategoryNode[]; }

const mainCategories = ref<NavigationItem[]>([]);
const footer = ref<NavigationItem[]>([]);
const hasChildCategories = ref(true);
const router = useRouter();
const lineItemsCount = basketService.itemsCount;
const breakpoint = computed(() => breakpointService.active.value);
const hasActiveDataset = computed(() => contextStore.hasActiveDataset.value);
const activeContextRevision = computed(() => contextStore.activeContextRevision.value);
const routeViewKey = computed(() => activeContextRevision.value.toString());
let categoryLoadToken = 0;

init();

onMounted(() => {
    notificationsStore.flushAfterReload();
});

watch(activeContextRevision, async() => {
    await refreshActiveContext();
}, { immediate: true });

async function init() {
    const params = new URLSearchParams(window.location.search);
    let query = undefined;
    if (params.has('share')) {
        query = { share: params.get('share') };
        await router.push({ path: '/settings', query: query });
    }

    if (!contextStore.hasActiveDataset.value) {
        if (router.currentRoute.value.path !== '/settings') {
            await router.push('/settings');
        }
        return;
    }

    if (params.has('datasetId')) {
        const datasetId = params.get('datasetId');
        
        const url = new URL(window.location.href);
        url.searchParams.delete('datasetId');
        history.replaceState(null, '', url);

        if (datasetId && contextStore.datasets.value.some(x => x.datasetId === datasetId)) {
            contextStore.setDataset(datasetId);
        }
        else {
            notificationsStore.push({ type: 'error', title: 'Could not find dataset', text: 'Make sure it is correctly configured' });
        }

    }
}

async function refreshActiveContext() {
    categoryLoadToken += 1;
    const loadToken = categoryLoadToken;

    if (!contextStore.hasActiveDataset.value || !contextStore.isConfigured.value) {
        clearNavigation();
        return;
    }

    try {
        await getCategories(contextStore.getSearcher(), loadToken);
    } catch {
        if (loadToken !== categoryLoadToken) {
            return;
        }

        clearNavigation();
    }
}

async function getCategories(searcher: Searcher, loadToken: number) {
    const request = new ProductSearchBuilder(contextStore.defaultSettings)
        .pagination(p => p.setPageSize(0))
        .facets(f => f.addProductCategoryHierarchyFacet('ImmediateParent', null, { displayName: true, paths: true }))
        .build();

    const response = await searcher.searchProducts(request);

    if (loadToken !== categoryLoadToken) {
        return;
    }

    const categoryFacet = response?.facets?.items![0] as CategoryHierarchyFacetResult;
    const navigation: NavigationItem[] = categoryFacet.nodes
        .filter(x => !!x.category.displayName)
        .sort((a, b) => a.category.displayName?.localeCompare(b?.category.displayName ?? '') ?? 0)
        .map(x => ({ id: x.category.categoryId!, category: x.category, children: x.children ?? [] }));

    hasChildCategories.value = navigation.some(x => x.children.length > 0);
    mainCategories.value = navigation;
    footer.value = navigation.slice(0, 4);
}

function clearNavigation() {
    hasChildCategories.value = false;
    mainCategories.value = [];
    footer.value = [];
}
</script>

<template>
  <Toaster
    position="bottom-right"
    rich-colors
    :visible-toasts="5"
    offset="16px"
  />
  <Header
    :line-items-count="lineItemsCount"
    :has-child-categories="hasChildCategories"
    :main-categories="mainCategories"
  />

  <div
    id="main-container"
    class="w-full mx-auto pb-10 flex-grow relative"
  >
    <RouterView :key="routeViewKey" />
  </div>
  <Footer
    v-if="hasActiveDataset"
    :has-child-categories="hasChildCategories"
    :main-categories="mainCategories"
    :footer="footer"
  />

  <div class="fixed px-2 py-0.5 rounded bg-red-600 bottom-0 right-0 z-[10000] text-white text-xs font-mono uppercase">
    {{ breakpoint }}
  </div>
</template>

<style lang="scss">
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease-in-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.navigationmodal {
    @apply bg-white overflow-hidden border-t border-solid border-slate-100;
    position: fixed;
    z-index: 1000;
    top: var(--header-height, 106px);
    left: 0;
    width: 100%;

    .backdrop {
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.1));
        position: fixed;
        z-index: 1;
        left: 0;
        width: 100%;
        height: calc(100% - var(--header-height, 106px));
    }

    .modalcontent {
        z-index: 1002;
    }
}
</style>
