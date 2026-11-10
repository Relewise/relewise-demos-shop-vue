<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
    AdjustmentsHorizontalIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PaperAirplaneIcon,
    PencilSquareIcon,
    PhotoIcon,
    ShoppingBagIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline';
import { DataValueFactory, type ProductResult, type SelectedVariantPropertiesSettings } from '@relewise/client';
import { toast } from 'vue-sonner';
import contextStore from '@/stores/context.store';
import basketService from '@/services/basket.service';
import {
    filterValue,
    streamConversationalSearch,
    type AgUiEvent,
    type ConversationalSearchFilters,
    type ConversationalSearchMessage,
    type ConversationalSearchProduct,
    type ConversationalSearchProductDetailActivity,
    type ConversationalSearchShoppingAction,
    type ConversationalSearchShoppingActivity,
    type ConversationalSearchState,
} from '@/helpers/conversationalSearchApi';

type TextEntry = ConversationalSearchMessage & { role: 'user' | 'assistant' };
type ShoppingEntry = {
    id: string;
    role: 'activity';
    activityType: 'SHOPPING_RESULTS';
    content: ConversationalSearchShoppingActivity;
};
type ProductDetailEntry = {
    id: string;
    role: 'activity';
    activityType: 'PRODUCT_DETAIL';
    content: ConversationalSearchProductDetailActivity;
};
type ChatEntry = TextEntry | ShoppingEntry | ProductDetailEntry;

const emit = defineEmits<{
    openSearch: [query: string];
}>();

const open = ref(false);
const input = ref('');
const entries = ref<ChatEntry[]>([]);
const state = ref<ConversationalSearchState>({ searchTerm: '', filters: {} });
const loading = ref(false);
const error = ref('');
const filtersVisible = ref<Record<string, boolean>>({});
const carouselPositions = ref<Record<string, number>>({});
const scrollContainer = ref<HTMLElement | null>(null);
const inputElement = ref<HTMLInputElement | null>(null);

let threadId = crypto.randomUUID();
let abortController = new AbortController();
let bodyScrollPosition = 0;
let bodyScrollLocked = false;
const handledBagOperations = new Set<string>();

const canUseConversationalSearch = computed(() => contextStore.isConfigured.value);

function openWithPrompt(prompt: string) {
    open.value = true;
    error.value = '';
    input.value = prompt.trim();

    if (entries.value.length === 0) {
        entries.value.push(welcomeMessage());
    }

    focusInput();
}

defineExpose({ openWithPrompt });

function close() {
    open.value = false;
    abortController.abort();
    loading.value = false;
}

function switchToSearch() {
    const query = input.value || state.value.searchTerm;
    close();
    emit('openSearch', query);
}

function resetConversation() {
    abortController.abort();
    abortController = new AbortController();
    threadId = crypto.randomUUID();
    input.value = '';
    error.value = '';
    loading.value = false;
    entries.value = [welcomeMessage()];
    state.value = { searchTerm: '', filters: {} };
    filtersVisible.value = {};
    carouselPositions.value = {};
    focusInput();
}

async function submit() {
    const content = input.value.trim();
    if (!content || loading.value || !canUseConversationalSearch.value) {
        return;
    }

    entries.value.push({ id: crypto.randomUUID(), role: 'user', content });
    input.value = '';
    await run();
}

async function refine(activity: ShoppingEntry, action: ConversationalSearchShoppingAction) {
    if (loading.value) {
        return;
    }

    await run(action, activity.id);
}

async function run(shoppingAction?: ConversationalSearchShoppingAction, activityMessageId?: string) {
    error.value = '';
    loading.value = true;
    abortController.abort();
    abortController = new AbortController();
    await scrollToBottom();

    try {
        await streamConversationalSearch(contextStore.context.value.datasetId, {
            threadId,
            runId: crypto.randomUUID(),
            messages: entries.value
                .filter((entry): entry is TextEntry => entry.role !== 'activity')
                .filter(entry => entry.content.trim().length > 0)
                .slice(-32)
                .map(({ role, content }) => ({ role, content })),
            state: state.value,
            forwardedProps: {
                apiKey: contextStore.context.value.apiKey,
                shopContext: {
                    language: contextStore.language.value,
                    currency: contextStore.currencyCode.value,
                    user: contextStore.user.value,
                },
                selectedProductProperties: contextStore.selectedProductProperties,
                selectedVariantProperties: {
                    displayName: true,
                    pricing: true,
                    allData: true,
                } as SelectedVariantPropertiesSettings,
                take: 8,
                shoppingAction,
                activityMessageId,
                productContext: productContext(activityMessageId),
                propertyDefinitions: contextStore.context.value.conversationalSearchProperties ?? [],
            },
        }, applyEvent, abortController.signal);
    }
    catch (exception) {
        if (abortController.signal.aborted) {
            settleActivities('cancelled');
            return;
        }

        settleActivities('error');
        error.value = exception instanceof Error ? exception.message : 'Conversational search failed.';
    }
    finally {
        if (!abortController.signal.aborted) {
            loading.value = false;
            await scrollToBottom();
            focusInput();
        }
    }
}

function applyEvent(event: AgUiEvent) {
    if (event.type === 'STATE_SNAPSHOT' && event.snapshot) {
        state.value = event.snapshot;
    }
    else if (event.type === 'TEXT_MESSAGE_START' && event.messageId && !findEntry(event.messageId)) {
        entries.value.push({ id: event.messageId, role: 'assistant', content: '' });
    }
    else if (event.type === 'TEXT_MESSAGE_CONTENT' && event.messageId && event.delta) {
        const entry = findEntry(event.messageId);
        if (entry && entry.role !== 'activity') {
            entry.content += event.delta;
        }
    }
    else if (event.type === 'ACTIVITY_SNAPSHOT' && event.messageId && event.activityType === 'SHOPPING_RESULTS') {
        upsertActivity({
            id: event.messageId,
            role: 'activity',
            activityType: 'SHOPPING_RESULTS',
            content: event.content as ConversationalSearchShoppingActivity,
        }, event.replace);
    }
    else if (event.type === 'ACTIVITY_SNAPSHOT' && event.messageId && event.activityType === 'PRODUCT_DETAIL') {
        upsertActivity({
            id: event.messageId,
            role: 'activity',
            activityType: 'PRODUCT_DETAIL',
            content: event.content as ConversationalSearchProductDetailActivity,
        }, event.replace);
    }
    else if (event.type === 'CUSTOM' && event.name === 'shopping.ui') {
        const value = event.value as { activityMessageId?: string; filtersVisible?: boolean };
        if (value.activityMessageId && value.filtersVisible !== undefined) {
            filtersVisible.value[value.activityMessageId] = value.filtersVisible;
        }
    }
    else if (event.type === 'CUSTOM' && event.name === 'shopping.bag.add') {
        const value = event.value as {
            operationId?: string;
            product?: ConversationalSearchProduct;
            quantity?: number;
        };
        if (value.product && (!value.operationId || !handledBagOperations.has(value.operationId))) {
            if (value.operationId) {
                handledBagOperations.add(value.operationId);
            }

            addProductToBasket(value.product, Math.max(1, value.quantity ?? 1));
        }
    }
    else if (event.type === 'RUN_ERROR') {
        settleActivities('error');
        error.value = event.message || 'Conversational search failed.';
    }

    void scrollToBottom();
}

function upsertActivity(entry: ShoppingEntry | ProductDetailEntry, replace = true) {
    const index = entries.value.findIndex(candidate => candidate.id === entry.id);
    if (index < 0) {
        entries.value.push(entry);
        return;
    }

    if (replace !== false && entries.value[index]?.role === 'activity') {
        entries.value.splice(index, 1, entry);
    }
}

function findEntry(id: string) {
    return entries.value.find(entry => entry.id === id);
}

function settleActivities(status: 'error' | 'cancelled') {
    for (const entry of entries.value) {
        if (entry.role === 'activity' && entry.content.status === 'searching') {
            entry.content.status = status;
        }
    }
}

function productContext(activityId?: string) {
    const shoppingEntry = [...entries.value].reverse().find((entry): entry is ShoppingEntry =>
        entry.role === 'activity'
        && entry.activityType === 'SHOPPING_RESULTS'
        && (!activityId || entry.id === activityId));

    return { productIds: shoppingEntry?.content.result?.products.map(product => product.id) ?? [] };
}

function activeProducts(activity: ShoppingEntry) {
    return activity.content.result?.products.length
        ? activity.content.result.products
        : activity.content.result?.recommendations ?? [];
}

function visibleProducts(activity: ShoppingEntry) {
    const products = activeProducts(activity);
    const position = carouselPositions.value[activity.id] ?? 0;
    return products.slice(position, position + 4);
}

function moveCarousel(activity: ShoppingEntry, amount: number) {
    const max = Math.max(0, activeProducts(activity).length - 4);
    carouselPositions.value[activity.id] = Math.min(max, Math.max(0, (carouselPositions.value[activity.id] ?? 0) + amount));
}

function facetLabel(activity: ShoppingEntry, key: string, value: string) {
    return activity.content.result?.facets.find(facet => facet.key === key)?.labels?.[value] ?? value;
}

function formatFacetName(key: string, displayName?: string | null) {
    if (displayName) {
        return displayName;
    }

    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, value => value.toUpperCase());
}

function formatPrice(price: number | null, currency: string) {
    if (price === null) {
        return '';
    }

    return new Intl.NumberFormat(contextStore.language.value, { style: 'currency', currency }).format(price);
}

function title(activity: ShoppingEntry) {
    const resultCount = activity.content.result?.products.length ?? 0;
    const term = activity.content.searchTerm.trim();
    return term ? `${resultCount} results for “${term}”` : `${resultCount} products for you`;
}

function productRoute(product: ConversationalSearchProduct) {
    return { name: 'product', params: { id: product.id } };
}

function addProductToBasket(product: ConversationalSearchProduct, quantity = 1) {
    void basketService.addProduct({
        product: toBasketProduct(product),
        quantityDelta: quantity,
    });
    toast.success(`${product.name} added to the cart`);
}

function toBasketProduct(product: ConversationalSearchProduct) {
    return {
        productId: product.id,
        displayName: product.name,
        salesPrice: product.price,
        listPrice: product.price,
        brand: product.brand
            ? {
                id: product.brandId ?? product.brand,
                displayName: product.brand,
            }
            : null,
        data: product.image
            ? { Image: DataValueFactory.string(product.image) }
            : {},
    } as ProductResult;
}

function welcomeMessage(): TextEntry {
    return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'What can I help you find today?',
    };
}

async function scrollToBottom() {
    await nextTick();
    scrollContainer.value?.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' });
}

function focusInput() {
    nextTick(() => inputElement.value?.focus());
}

function lockBodyScroll() {
    bodyScrollPosition = window.scrollY;
    bodyScrollLocked = true;
    window.document.documentElement.classList.add('overflow-hidden');
    window.document.body.classList.add('overflow-hidden');
    window.document.body.style.position = 'fixed';
    window.document.body.style.top = `-${bodyScrollPosition}px`;
    window.document.body.style.width = '100%';
}

function unlockBodyScroll() {
    if (!bodyScrollLocked) {
        return;
    }

    bodyScrollLocked = false;
    window.document.documentElement.classList.remove('overflow-hidden');
    window.document.body.classList.remove('overflow-hidden');
    window.document.body.style.removeProperty('position');
    window.document.body.style.removeProperty('top');
    window.document.body.style.removeProperty('width');
    window.scrollTo(0, bodyScrollPosition);
}

watch(open, value => {
    if (value) {
        lockBodyScroll();
        focusInput();
    }
    else {
        unlockBodyScroll();
    }
});

onBeforeUnmount(() => {
    abortController.abort();
    unlockBodyScroll();
});
</script>

<template>
  <Teleport to="#modal">
    <div
      v-if="open"
      class="modal"
    >
      <section class="flex h-full w-full flex-col bg-white">
        <nav
          class="sticky top-0 z-10 border-b border-slate-200 bg-white px-2"
          aria-label="Discovery mode"
        >
          <div class="container mx-auto flex items-center gap-2 xl:px-0">
            <div
              class="flex min-w-0 flex-1"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected="false"
                class="flex-1 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-semibold text-slate-600 shadow-none hover:border-slate-300 hover:text-slate-900"
                @click="switchToSearch"
              >
                Search
              </button>
              <button
                type="button"
                role="tab"
                aria-selected="true"
                class="flex-1 rounded-none border-b-2 border-brand-500 bg-transparent px-4 py-3 text-sm font-semibold text-brand-700 shadow-none"
              >
                <span class="sm:hidden">Assistant</span>
                <span class="hidden sm:inline">Shopping Assistant</span>
              </button>
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-full bg-transparent px-2 py-2 text-slate-500 shadow-none hover:bg-slate-100 hover:text-slate-800 sm:px-3"
              title="New conversation"
              aria-label="Start a new conversation"
              @click="resetConversation"
            >
              <PencilSquareIcon class="h-5 w-5" />
              <span class="hidden text-sm font-semibold sm:inline">New conversation</span>
            </button>
            <button
              type="button"
              class="shrink-0 rounded-full bg-transparent p-2 text-slate-500 shadow-none hover:bg-slate-100 hover:text-slate-800"
              title="Close"
              aria-label="Close shopping assistant"
              @click="close"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
        </nav>

        <div
          ref="scrollContainer"
          class="flex-1 overflow-y-auto"
        >
          <div class="container mx-auto flex flex-col gap-5 px-2 py-6 xl:px-0">
            <template
              v-for="entry in entries"
              :key="entry.id"
            >
              <article
                v-if="entry.role !== 'activity'"
                class="flex"
                :class="entry.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <p
                  v-if="entry.content"
                  class="max-w-[min(38rem,90%)] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm"
                  :class="entry.role === 'user' ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-white text-slate-700'"
                >
                  {{ entry.content }}
                </p>
              </article>

              <article
                v-else-if="entry.activityType === 'SHOPPING_RESULTS'"
                class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <div>
                    <h3 class="font-semibold text-slate-900">
                      {{ title(entry) }}
                    </h3>
                    <p
                      v-if="entry.content.status === 'searching'"
                      class="text-xs text-brand-600"
                    >
                      Updating results…
                    </p>
                  </div>
                  <button
                    v-if="entry.content.result?.facets.length"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-none hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                    @click="filtersVisible[entry.id] = !filtersVisible[entry.id]"
                  >
                    <AdjustmentsHorizontalIcon class="h-4 w-4" /> Filters
                    <ChevronDownIcon
                      class="h-3 w-3"
                      :class="filtersVisible[entry.id] ? 'rotate-180' : ''"
                    />
                  </button>
                </div>

                <div
                  v-if="filtersVisible[entry.id]"
                  class="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 p-4 sm:p-5"
                >
                  <div
                    v-for="facet in entry.content.result?.facets"
                    :key="facet.key"
                  >
                    <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {{ formatFacetName(facet.key, facet.displayName) }}
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="value in facet.values"
                        :key="value"
                        type="button"
                        class="rounded-full border px-3 py-1.5 text-xs transition"
                        :class="filterValue(entry.content.filters, facet.key) === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'"
                        :disabled="loading"
                        @click="refine(entry, { kind: 'facet', key: facet.key, value: filterValue(entry.content.filters, facet.key) === value ? null : value })"
                      >
                        {{ facetLabel(entry, facet.key, value) }}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="w-fit rounded-none bg-transparent p-0 text-xs font-semibold text-brand-600 shadow-none hover:text-brand-700"
                    :disabled="loading"
                    @click="refine(entry, { kind: 'clear' })"
                  >
                    Clear all filters
                  </button>
                </div>

                <div
                  v-if="visibleProducts(entry).length"
                  class="relative p-4 sm:p-5"
                >
                  <div class="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
                    <article
                      v-for="product in visibleProducts(entry)"
                      :key="product.id"
                      class="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white text-slate-900 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                    >
                      <RouterLink
                        :to="productRoute(product)"
                        class="flex aspect-square items-center justify-center overflow-hidden bg-slate-50"
                        @click="close"
                      >
                        <img
                          v-if="product.image"
                          :src="product.image"
                          :alt="product.name"
                          class="h-full w-full object-contain p-3"
                        >
                        <PhotoIcon
                          v-else
                          class="h-16 w-16 text-slate-300"
                        />
                      </RouterLink>
                      <div class="flex flex-1 flex-col p-3">
                        <RouterLink
                          :to="productRoute(product)"
                          class="text-slate-900"
                          @click="close"
                        >
                          <p
                            v-if="product.brand"
                            class="truncate text-xs text-slate-500"
                          >
                            {{ product.brand }}
                          </p>
                          <h4 class="mt-1 line-clamp-2 text-sm font-semibold leading-5 group-hover:text-brand-600">
                            {{ product.name }}
                          </h4>
                        </RouterLink>
                        <p class="mt-auto pt-3 font-semibold">
                          {{ formatPrice(product.price, entry.content.result?.currency ?? contextStore.currencyCode.value) }}
                        </p>
                        <button
                          type="button"
                          class="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-none hover:bg-brand-700"
                          :aria-label="`Add ${product.name} to basket`"
                          @click="addProductToBasket(product)"
                        >
                          <ShoppingBagIcon class="h-4 w-4 stroke-white" />
                          Add to basket
                        </button>
                      </div>
                    </article>
                  </div>
                  <button
                    v-if="(carouselPositions[entry.id] ?? 0) > 0"
                    type="button"
                    class="absolute left-1 top-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow"
                    @click="moveCarousel(entry, -4)"
                  >
                    <ChevronLeftIcon class="h-5 w-5" />
                  </button>
                  <button
                    v-if="(carouselPositions[entry.id] ?? 0) + 4 < activeProducts(entry).length"
                    type="button"
                    class="absolute right-1 top-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow"
                    @click="moveCarousel(entry, 4)"
                  >
                    <ChevronRightIcon class="h-5 w-5" />
                  </button>
                </div>
                <div
                  v-else-if="entry.content.status !== 'searching'"
                  class="px-5 py-8 text-center text-sm text-slate-500"
                >
                  No matching products found. Try widening the filters or asking in another way.
                </div>
              </article>

              <article
                v-else-if="entry.activityType === 'PRODUCT_DETAIL'"
                class="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[13rem_1fr]"
              >
                <div class="flex min-h-48 items-center justify-center bg-slate-50">
                  <img
                    v-if="entry.content.product.image"
                    :src="entry.content.product.image"
                    :alt="entry.content.product.name"
                    class="h-48 w-full object-contain p-4"
                  >
                  <PhotoIcon
                    v-else
                    class="h-16 w-16 text-slate-300"
                  />
                </div>
                <div class="p-5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {{ entry.content.product.brand }}
                  </p>
                  <h3 class="mt-1 text-lg font-semibold text-slate-900">
                    {{ entry.content.product.name }}
                  </h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600">
                    {{ entry.content.product.description }}
                  </p>
                  <dl
                    v-if="Object.keys(entry.content.product.properties ?? {}).length"
                    class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
                  >
                    <template
                      v-for="(value, key) in entry.content.product.properties"
                      :key="key"
                    >
                      <dt class="text-slate-500">
                        {{ formatFacetName(key) }}
                      </dt><dd class="font-medium text-slate-700">
                        {{ value }}
                      </dd>
                    </template>
                  </dl>
                  <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <strong>{{ formatPrice(entry.content.product.price, entry.content.currency) }}</strong>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-none hover:bg-brand-700"
                        @click="addProductToBasket(entry.content.product)"
                      >
                        <ShoppingBagIcon class="h-4 w-4 stroke-white" />
                        Add to basket
                      </button>
                      <RouterLink
                        :to="productRoute(entry.content.product)"
                        class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
                        @click="close"
                      >
                        View product
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </article>
            </template>

            <div
              v-if="loading && !entries.some(entry => entry.role === 'assistant' && !entry.content)"
              class="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"
            >
              <span class="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Thinking…
            </div>
          </div>
        </div>

        <form
          class="border-t border-slate-200 bg-white px-2 py-4"
          @submit.prevent="submit"
        >
          <div class="container mx-auto xl:px-0">
            <p
              v-if="error"
              class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {{ error }}
            </p>
            <div class="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pl-4 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
              <input
                ref="inputElement"
                v-model="input"
                type="text"
                class="min-w-0 flex-1 !border-0 !bg-transparent !p-0 !shadow-none focus:!ring-0"
                placeholder="Describe what you are looking for…"
                :disabled="loading"
              >
              <button
                type="submit"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300"
                :disabled="loading || !input.trim()"
                title="Send"
                aria-label="Send message"
              >
                <PaperAirplaneIcon class="h-5 w-5 stroke-current" />
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal {
    background-color: #fff;
    height: calc(100% - var(--header-height, 132px));
    left: 0;
    overflow: hidden;
    position: fixed;
    top: var(--header-height, 132px);
    width: 100%;
    z-index: 999;
}
</style>
