<script setup lang="ts">
import { ChevronDownIcon, HeartIcon, MagnifyingGlassIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline';
import { ref, type PropType, onBeforeUnmount, computed, onMounted } from 'vue';
import SearchOverlay from '../components/SearchOverlay.vue';
import type { NavigationItem } from '@/App.vue';
import SideMenu from '@/components/SideMenu.vue';
import Popover from '@/components/Popover.vue';
import ContextSwitcher from '@/components/ContextSwitcher.vue';
import contextStore from '@/stores/context.store';
import { displayUser } from '@/helpers/userHelper';

defineProps({
    lineItemsCount: { type: Number, required: true },
    hasChildCategories: { type: Boolean, required: true },
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true },
});

const open = ref<string | null>(null);
const hasActiveDataset = computed(() => contextStore.hasActiveDataset.value);
const activeUserLabel = computed(() => {
    const users = contextStore.context.value?.users ?? [];
    const selectedUserIndex = contextStore.context.value?.selectedUserIndex;

    if (selectedUserIndex === undefined || selectedUserIndex < 0 || selectedUserIndex >= users.length) {
        return '(None)';
    }

    return displayUser(users[selectedUserIndex]) || '(None)';
});
const headerElement = ref<HTMLElement | null>(null);
const headerHeight = ref(106);
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
let headerResizeObserver: ResizeObserver | null = null;

const handleMouseOver = (categoryId: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
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
    if (hoverTimeout) clearTimeout(hoverTimeout);

    const searchParams = new URLSearchParams(window.location.search);
    const isSearchOverlayOpen = searchParams.get('open') === '1' ? true : false;

    if (!isSearchOverlayOpen) {
        document.body.classList.remove('overflow-hidden');
        document.body.style.marginRight = ''; // Reset margin
    }

    open.value = null;
};

onBeforeUnmount(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    headerResizeObserver?.disconnect();
});

onMounted(() => {
    if (!headerElement.value) {
        return;
    }

    const updateHeaderHeight = () => {
        headerHeight.value = Math.ceil(headerElement.value?.getBoundingClientRect().height ?? 106);
    };

    updateHeaderHeight();
    headerResizeObserver = new ResizeObserver(() => {
        updateHeaderHeight();
    });
    headerResizeObserver.observe(headerElement.value);
});
</script>

<template>
  <header
    ref="headerElement"
    class="border-b border-solid border-slate-100 bg-white"
    :style="{ '--header-height': `${headerHeight}px` }"
    @mouseleave="handleMouseLeave"
  >
    <div class="container mx-auto px-2 xl:p-0">
      <div
        class="flex items-center gap-2 py-2"
        @mouseover="handleMouseLeave"
      >
        <div class="flex items-center">
          <div class="xl:hidden">
            <SideMenu :main-categories="mainCategories" />
          </div>
          <RouterLink
            to="/"
            class="font-semibold text-2xl uppercase text-black leading-normal block hover:opacity-70 transitions ease-in-out delay-150"
          >
            <img
              src="/demoshopwise.png"
              style="height: 40px;"
            >
          </RouterLink>
        </div>
        <div class="ml-0 flex min-w-0 flex-1 items-center gap-2">
          <div
            v-if="hasActiveDataset"
            class="min-w-0 flex-1 xl:items-center"
          >
            <SearchOverlay />
          </div>
          <div
            v-else
            class="relative inline-flex flex-1 overflow-hidden rounded-full"
          >
            <span class="flex items-center bg-slate-100 rounded-none px-3">
              <MagnifyingGlassIcon class="h-6 w-6 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search..."
              disabled
              class="!rounded-r-full !shadow-none !pl-0 !bg-slate-100 !border-slate-100 !text-slate-400 cursor-not-allowed focus:!border-slate-100 focus:!ring-0"
            >
          </div>
        </div>
        <div class="ml-auto flex items-center gap-6">
          <div class="shrink-0">
            <Popover
              v-if="hasActiveDataset"
              placement="bottom-end"
            >
              <div
                class="hidden cursor-pointer items-center gap-4 rounded-lg bg-slate-100 px-4 py-3 text-slate-800 hover:bg-slate-200 xl:flex"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <div
                      class="max-w-[12rem] truncate font-medium text-sm"
                      :title="contextStore.context.value.displayName || ''"
                    >
                      {{ contextStore.context.value.displayName }}
                    </div>
                    <span class="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {{ contextStore.context.value.language }} / {{ contextStore.context.value.currencyCode }}
                    </span>
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                      :class="contextStore.tracking.value.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'"
                    >
                      <span
                        class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                        :class="contextStore.tracking.value.enabled ? 'bg-emerald-500' : 'bg-slate-400'"
                      />
                      {{ contextStore.tracking.value.enabled ? 'Tracking on' : 'Tracking off' }}
                    </span>
                  </div>
                  <div class="mt-1 text-xs">
                    User: {{ activeUserLabel }}
                  </div>
                </div>
                <ChevronDownIcon class="h-4" />
              </div>
              <template #content>
                <div class="w-96">
                  <ContextSwitcher />
                </div>
              </template>
            </Popover>
            <div
              v-else
              class="hidden xl:flex items-center rounded-lg bg-slate-100 px-4 py-3 text-slate-500 opacity-75 cursor-not-allowed"
            >
              <div class="min-w-0">
                <div class="font-medium text-sm">
                  No dataset configured
                </div>
                <div class="mt-1 text-xs text-slate-500">
                  Configure in App Settings
                </div>
              </div>
            </div>
          </div>
          <component
            :is="hasActiveDataset ? 'RouterLink' : 'div'"
            :to="hasActiveDataset ? '/favorites' : undefined"
            class="relative flex flex-col items-center"
            :class="hasActiveDataset ? 'text-slate-600' : 'text-slate-300 cursor-not-allowed'"
          >
            <HeartIcon class="h-8 w-8" />
            <span class="text-[9px] mt-1 font-bold">FAVORITES</span>
          </component>
          <component
            :is="hasActiveDataset ? 'RouterLink' : 'div'"
            :to="hasActiveDataset ? '/cart' : undefined"
            class="relative flex flex-col items-center"
            :class="hasActiveDataset ? 'text-slate-600' : 'text-slate-300 cursor-not-allowed'"
          >
            <ShoppingBagIcon class="h-8 w-8" />
            <span class="text-[9px] mt-1 font-bold">CART</span>
            <span
              v-if="hasActiveDataset && lineItemsCount > 0"
              class="absolute top-0 right-0 leading-none inline-flex items-center justify-center h-5 w-5 pb-0.5 bg-brand-700 rounded-full text-white font-bold text-[11px]"
            >
              {{ lineItemsCount }}
            </span>
          </component>
        </div>
      </div>
      <nav class="hidden xl:block">
        <ul class="flex w-full gap-2">
          <ul
            v-if="hasActiveDataset && (hasChildCategories || contextStore.context.value.shoppertainmentEnabled)"
            class="flex overflow-y-auto scrollable-element"
          >
            <li
              v-for="category in mainCategories"
              :key="category.id ?? ''"
              class="inline-flex relative pr-5"
            >
              <RouterLink
                :to="{ name: 'category', params: { id: category.id } }"
                class="flex items-center font-semibold uppercase py-3 leading-none text-md text-slate-700 hover:text-brand-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
                @mouseover="handleMouseOver(category.id)"
              >
                {{ category.category.displayName ?? category.category.categoryId }}
                <ChevronDownIcon class="ml-2 mt-1 inline-block h-3 text-slade-500" />
              </RouterLink>
              <div
                v-if="open === category.id"
                to="#navigationmodal"
              >
                <div
                  class="navigationmodal"
                  @mouseover="handleMouseOver(category.id)"
                >
                  <div class="bg-white overflow-x-auto modalcontent pb-10">
                    <div class="container mx-auto">
                      <h4 class="my-4 text-xl -mx-1">
                        <RouterLink
                          :to="{ name: 'category', params: { id: category.id } }"
                          class="text-slate-900 hover:underline"
                          @click="handleMouseLeave"
                        >
                          {{ category.category.displayName ?? category.category.categoryId }}
                        </RouterLink>
                      </h4>
                      <ul
                        v-if="category.children.length > 0"
                        class="text-base z-10 list-none grid grid-cols-2 mb-3 -mx-1"
                      >
                        <li
                          v-for="child in category.children"
                          :key="child.category.categoryId ?? ''"
                          class="text-sm block"
                        >
                          <RouterLink
                            :to="{ name: 'sub-category', params: { parent: category.id, id: child.category.categoryId } }"
                            class="block py-2 rounded cursor-pointer hover:underline text-gray-700"
                            @click="handleMouseLeave"
                          >
                            {{ child.category.displayName }}
                          </RouterLink>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div
                    class="backdrop"
                    @mouseenter="handleMouseLeave"
                  />
                </div>
              </div>
            </li>
            <li
              v-if="contextStore.context.value.shoppertainmentEnabled"
              class="inline-flex relative pr-5"
            >
              <RouterLink
                to="/feed"
                class="flex items-center font-semibold uppercase py-3 leading-none text-md text-slate-700 hover:text-brand-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
              >
                Shoppertainment
              </RouterLink>
            </li>
          </ul>
          <ul v-else-if="hasActiveDataset && mainCategories.length > 0">
            <div
              class="font-semibold uppercase py-3 leading-none text-lg text-slate-700 whitespace-nowrap hover:text-brand-500 transitions ease-in-out delay-150 cursor-pointer"
              @mouseover="handleMouseOver('1')"
            >
              Categories
            </div>
            <div
              v-if="open === '1'"
              to="#navigationmodal"
            >
              <div class="navigationmodal">
                <div class="bg-white overflow-x-auto mb-5 modalcontent">
                  <div class="container mx-auto">
                    <ul class="text-base z-10 max-h-96 list-none grid grid-cols-4 mb-3">
                      <li
                        v-for="category in mainCategories"
                        :key="category.id ?? ''"
                        class="text-sm block"
                      >
                        <RouterLink
                          :to="{ name: 'category', params: { id: category.id } }"
                          class="block px-2 py-1 rounded cursor-pointer hover:bg-gray-100 text-gray-700"
                          @click="() => {
                            open = null;
                            handleMouseLeave();
                          }"
                        >
                          {{ category.category.displayName }}
                        </RouterLink>
                      </li>
                    </ul>
                  </div>
                </div>
                <div
                  class="backdrop"
                  @mouseenter="handleMouseLeave"
                />
              </div>
            </div>
          </ul>
          <li v-else />
          <li class="flex-grow" />
        </ul>
      </nav>
    </div>
  </header>
</template>
