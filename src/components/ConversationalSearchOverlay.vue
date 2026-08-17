<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { BookOpenIcon, InformationCircleIcon, PaperAirplaneIcon, SparklesIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import type { ProductResult, SelectedVariantPropertiesSettings } from '@relewise/client';
import Popover from '@/components/Popover.vue';
import ProductTile from '@/components/ProductTile.vue';
import { conversationalSearch, emptyConversationState, type ConversationState } from '@/helpers/conversationalSearchApi';
import contextStore from '@/stores/context.store';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  products?: ProductResult[];
  context?: Record<string, string>;
}

const open = ref(false);
const input = ref('');
const messages = ref<ChatMessage[]>([]);
const conversationState = ref<ConversationState>(emptyConversationState());
const loading = ref(false);
const error = ref('');
const scrollContainer = ref<HTMLElement | null>(null);
const inputElement = ref<HTMLInputElement | null>(null);

let messageId = 0;
let abortController = new AbortController();
let bodyScrollPosition = 0;
let bodyScrollLocked = false;

const canUseConversationalSearch = computed(() => contextStore.isConfigured.value);

function toggle() {
  if (open.value) {
    close();
    return;
  }

  open.value = true;
  error.value = '';

  if (messages.value.length === 0) {
    messages.value.push({
      id: nextMessageId(),
      role: 'assistant',
      text: 'What are you looking for?',
    });
  }
}

function close() {
  open.value = false;
  abortController.abort();
  loading.value = false;
}

function resetConversation() {
  abortController.abort();
  abortController = new AbortController();
  input.value = '';
  error.value = '';
  loading.value = false;
  conversationState.value = emptyConversationState();
  messages.value = [{
    id: nextMessageId(),
    role: 'assistant',
    text: 'What are you looking for?',
  }];
  focusInput();
}

async function submit() {
  const text = input.value.trim();
  let firstAssistantMessageId: number | null = null;

  if (!text || loading.value || !canUseConversationalSearch.value) {
    return;
  }

  messages.value.push({
    id: nextMessageId(),
    role: 'user',
    text,
  });
  input.value = '';
  error.value = '';
  loading.value = true;
  await scrollToBottom();
  focusInput();

  abortController.abort();
  abortController = new AbortController();

  try {
    const response = await conversationalSearch(contextStore.context.value.datasetId, {
      apiKey: contextStore.context.value.apiKey,
      currentInput: text,
      conversationState: conversationState.value,
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
      take: 6,
    }, abortController.signal);

    const responseContext = Object.keys(response.context ?? {}).length > 0
      ? response.context
      : undefined;

    if (response.conversationState) {
      conversationState.value = response.conversationState;
    }

    if (response.message) {
      const assistantMessageId = nextMessageId();
      firstAssistantMessageId = assistantMessageId;
      messages.value.push({
        id: assistantMessageId,
        role: 'assistant',
        text: response.message,
        context: responseContext,
      });
    }

    if (response.products.length > 0) {
      const assistantMessageId = nextMessageId();
      firstAssistantMessageId ??= assistantMessageId;
      messages.value.push({
        id: assistantMessageId,
        role: 'assistant',
        text: 'Here are the products I found.',
        products: response.products,
        context: response.message ? undefined : responseContext,
      });
    }
    else if (!response.message) {
      const assistantMessageId = nextMessageId();
      firstAssistantMessageId = assistantMessageId;
      messages.value.push({
        id: assistantMessageId,
        role: 'assistant',
        text: 'I did not find any products for that request.',
        context: responseContext,
      });
    }
  }
  catch (exception) {
    if (abortController.signal.aborted) {
      return;
    }

    error.value = exception instanceof Error ? exception.message : 'Conversational search failed.';
  }
  finally {
    if (!abortController.signal.aborted) {
      loading.value = false;
      if (firstAssistantMessageId !== null) {
        await scrollToMessage(firstAssistantMessageId);
      }
      focusInput();
    }
  }
}

async function scrollToBottom() {
  await nextTick();
  scrollContainer.value?.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' });
}

async function scrollToMessage(id: number) {
  await nextTick();
  scrollContainer.value
    ?.querySelector<HTMLElement>(`[data-message-id="${id}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextMessageId() {
  messageId += 1;
  return messageId;
}

function focusInput() {
  nextTick(() => inputElement.value?.focus());
}

function lockBodyScroll() {
  bodyScrollPosition = window.scrollY;
  bodyScrollLocked = true;
  window.document.documentElement.classList.add('overflow-hidden');
  window.document.body.classList.add('overflow-hidden');
  window.document.body.classList.add('xl:pr-[17px]');
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
  window.document.body.classList.remove('xl:pr-[17px]');
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

onBeforeUnmount(unlockBodyScroll);
</script>

<template>
  <button
    type="button"
    class="inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center gap-1.5 rounded-full border text-sm font-semibold transition xl:w-auto xl:px-4"
    :class="open ? 'border-brand-500 bg-brand-500 text-white' : 'border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-400 hover:bg-white hover:text-brand-600'"
    :disabled="!canUseConversationalSearch"
    :title="canUseConversationalSearch ? 'Toggle Conversational Search' : 'Configure dataset, language, and currency before using Conversational Search'"
    @click="toggle"
  >
    <SparklesIcon class="hidden h-5 w-5 xl:block" />
    <span class="hidden xl:inline">Conversational Search</span>
    <span class="xl:hidden">CS</span>
  </button>

  <Teleport to="#modal">
    <div
      v-if="open"
      class="conversational-search-modal"
    >
      <section
        class="container mx-auto flex h-full w-full flex-col bg-white shadow-2xl xl:my-6 xl:h-[calc(100%-3rem)] xl:rounded-lg"
      >
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-slate-900">
              Conversational Search
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <a
              href="https://docs.relewise.com/docs/howto/conversational-search.html"
              target="_blank"
              rel="noreferrer noopener"
              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600 sm:px-3"
              title="Read the Conversational Search implementation guide"
            >
              <BookOpenIcon class="h-4 w-4" />
              <span class="hidden sm:inline">Guide</span>
            </a>
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600"
              @click="resetConversation"
            >
              New Conversation
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Close Conversational Search"
              @click="close"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
        </header>

        <div
          ref="scrollContainer"
          class="flex-1 overflow-y-auto bg-slate-50 px-4 py-5"
        >
          <div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <article
              v-for="message in messages"
              :key="message.id"
              :data-message-id="message.id"
              class="flex"
              :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="rounded-lg text-sm leading-6"
                :class="[
                  message.role === 'user'
                    ? 'max-w-[min(34rem,90%)] bg-brand-600 px-4 py-3 text-white'
                    : message.products?.length
                      ? 'w-full max-w-4xl bg-transparent text-slate-800'
                      : 'max-w-[min(34rem,90%)] bg-white px-4 py-3 text-slate-800 shadow-sm',
                ]"
              >
                <div
                  v-if="message.text || message.context"
                  class="flex items-start justify-between gap-2"
                  :class="message.products?.length ? 'mb-3' : ''"
                >
                  <p
                    v-if="message.text"
                    :class="message.products?.length
                      ? 'w-fit rounded-lg bg-white px-4 py-3 shadow-sm'
                      : 'min-w-0 flex-1'"
                  >
                    {{ message.text }}
                  </p>
                  <Popover
                    v-if="message.role === 'assistant' && message.context"
                    placement="bottom-end"
                    :arrow="false"
                  >
                    <button
                      type="button"
                      class="!m-0 !inline-flex !h-5 !w-5 !min-w-5 shrink-0 !items-center !justify-center !rounded-none !border-0 !bg-transparent !p-0 !text-slate-400 !shadow-none hover:!text-brand-600"
                      title="Show search context"
                      aria-label="Show search context"
                      @click="focusInput"
                    >
                      <InformationCircleIcon class="h-5 w-5 shrink-0 stroke-current" />
                    </button>
                    <template #content>
                      <dl class="grid max-h-96 w-96 max-w-[calc(100vw-2rem)] gap-3 overflow-y-auto bg-white p-4 text-sm sm:grid-cols-2">
                        <div
                          v-for="(value, key) in message.context"
                          :key="key"
                          class="min-w-0"
                        >
                          <dt class="font-semibold text-slate-700">
                            {{ key }}
                          </dt>
                          <dd class="break-words text-slate-600">
                            {{ value }}
                          </dd>
                        </div>
                      </dl>
                    </template>
                  </Popover>
                </div>
                <div
                  v-if="message.products?.length"
                  class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <ProductTile
                    v-for="product in message.products"
                    :key="`${product.productId ?? ''}-${product.variant?.variantId ?? ''}`"
                    :product="product"
                    @click="close"
                  />
                </div>
              </div>
            </article>
            <div
              v-if="loading"
              class="w-fit rounded-lg bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"
            >
              Thinking...
            </div>
          </div>
        </div>

        <form
          class="border-t border-slate-200 bg-white p-4"
          @submit.prevent="submit"
        >
          <div class="mx-auto w-full max-w-5xl">
            <p
              v-if="error"
              class="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {{ error }}
            </p>
            <div class="flex items-center gap-2">
              <input
                ref="inputElement"
                v-model="input"
                type="text"
                class="!rounded-full !border-slate-200 !bg-white !shadow-none focus:!border-brand-400 focus:!ring-brand-200"
                placeholder="Ask for products..."
                :disabled="loading"
              >
              <button
                type="submit"
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300"
                :disabled="loading || input.trim().length === 0"
                title="Send"
              >
                <PaperAirplaneIcon class="size-5 min-w-5 stroke-white" />
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.conversational-search-modal {
  background: rgb(15 23 42 / 30%);
  bottom: 0;
  left: 0;
  overflow: hidden;
  position: fixed;
  right: 0;
  top: 67px;
  z-index: 1000;
}

@media (min-width: 1280px) {
  .conversational-search-modal {
    top: 89px;
  }
}
</style>
