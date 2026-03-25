<template>
  <div>
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div
        v-if="datasets.length > 0"
        class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <h2 class="text-3xl text-slate-900">
            Datasets
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Click a dataset row to make it active. Use the actions on each row to configure, share, or remove it.
          </p>
        </div>

        <button
          class="shrink-0"
          @click="startCreatingDataset"
        >
          Add new dataset
        </button>
      </div>

      <div
        v-if="datasets.length === 0"
        class="py-14 text-center"
      >
        <h2 class="text-3xl text-slate-900">
          No datasets configured
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-sm text-slate-600">
          Add a dataset to start configuring the demo shop.
        </p>
        <button
          class="mt-8"
          @click="startCreatingDataset"
        >
          Add new dataset
        </button>
      </div>

      <div
        v-else
        class="mt-8 space-y-4"
      >
        <article
          v-for="dataset in datasets"
          :key="dataset.datasetId"
          class="rounded-2xl border p-5 transition cursor-pointer"
          :class="dataset.datasetId === activeDatasetId
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'"
          @click="selectDataset(dataset.datasetId)"
        >
          <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h3
                  class="max-w-full truncate text-2xl text-slate-900"
                  :title="dataset.displayName || 'Unnamed dataset'"
                >
                  {{ dataset.displayName || 'Unnamed dataset' }}
                </h3>
                <span
                  v-if="dataset.datasetId === activeDatasetId"
                  class="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                >
                  Active
                </span>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span class="rounded-full bg-white px-3 py-1 font-mono text-xs text-slate-700">
                  {{ dataset.datasetId || 'Missing dataset ID' }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {{ dataset.language || 'No language' }} / {{ dataset.currencyCode || 'No currency' }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {{ formatCount(dataset.users?.length ?? 0, 'user') }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {{ formatCount(dataset.companies?.length ?? 0, 'company', 'companies') }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                title="Configure dataset"
                aria-label="Configure dataset"
                @click.stop="configureDataset(dataset.datasetId)"
              >
                <Cog6ToothIcon
                  class="shrink-0"
                  style="width: 1.25rem; height: 1.25rem;"
                />
              </button>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                title="Copy share link"
                aria-label="Copy share link"
                @click.stop="shareDataset(dataset)"
              >
                <LinkIcon
                  class="shrink-0"
                  style="width: 1.25rem; height: 1.25rem;"
                />
              </button>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Remove dataset"
                @click.stop="removeDataset(dataset)"
              >
                <TrashIcon
                  class="shrink-0"
                  style="width: 1.25rem; height: 1.25rem;"
                />
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div
      v-if="isCreating"
      class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      @click.self="cancelCreatingDataset"
    >
      <div class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div>
          <h3 class="text-3xl text-slate-900">
            Add dataset
          </h3>
        </div>

        <div class="mt-6 grid gap-5">
          <div>
            <label class="text-sm block">Name</label>
            <input
              ref="nameInput"
              v-model="draft.displayName"
              type="text"
              placeholder="Name"
            >
          </div>

          <div>
            <label class="text-sm block">Dataset ID</label>
            <input
              v-model="draft.datasetId"
              type="text"
              placeholder="Dataset ID"
            >
          </div>

          <div>
            <label class="text-sm block">API Key</label>
            <input
              v-model="draft.apiKey"
              type="text"
              placeholder="API Key"
            >
          </div>

          <div>
            <label class="text-sm block">Server URL</label>
            <input
              v-model="draft.serverUrl"
              type="text"
              placeholder="Server URL"
            >
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="text-sm block">Language</label>
              <input
                v-model="draft.language"
                type="text"
                placeholder="en"
              >
            </div>

            <div>
              <label class="text-sm block">Currency</label>
              <input
                v-model="draft.currencyCode"
                type="text"
                placeholder="EUR"
              >
            </div>
          </div>
        </div>

        <ul
          v-if="validationErrors.length > 0"
          class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <li
            v-for="error in validationErrors"
            :key="error"
          >
            {{ error }}
          </li>
        </ul>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button @click="createDataset">
            Add dataset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import router from '@/router';
import { encodeSharePayload } from '@/helpers/shareEncoding';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { Cog6ToothIcon, LinkIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { UserFactory } from '@relewise/client';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type DatasetDraft = IDataset;

const datasets = computed(() => contextStore.datasets.value);
const activeDatasetId = computed(() => contextStore.context.value?.datasetId ?? '');
const isCreating = ref(false);
const validationErrors = ref<string[]>([]);
const draft = ref<DatasetDraft>(createEmptyDraft());
const nameInput = ref<HTMLInputElement | null>(null);

watch(isCreating, async(nextIsCreating) => {
    if (!nextIsCreating) {
        return;
    }

    await nextTick();
    nameInput.value?.focus();
});

function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && isCreating.value) {
        cancelCreatingDataset();
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEscape);
});

function createEmptyDraft(): DatasetDraft {
    return {
        displayName: '',
        datasetId: '',
        apiKey: '',
        language: '',
        allLanguages: [],
        currencyCode: '',
        allCurrencies: [],
        serverUrl: '',
        users: [createDefaultUser()],
        companies: [],
        selectedUserIndex: 0,
        allowThirdLevelCategories: false,
        hideSoldOutProducts: false,
        userClassificationFilters: false,
        recommendationsMinutesAgo: 20160,
        showProductRelevanceScore: false,
        B2bRecommendations: false,
        showVariantsBadge: false,
        similarProductsOnPdp: false,
        variantBasedSearchOverlay: false,
        contentSearch: false,
        searchHighlight: false,
        shoppertainmentEnabled: false,
    };
}

function createDefaultUser() {
    const user = UserFactory.anonymous();
    user.temporaryId = crypto.randomUUID();
    return user;
}

function normalizeDataset(dataset: DatasetDraft): IDataset {
    const language = dataset.language.trim();
    const currencyCode = dataset.currencyCode.trim();

    return {
        ...dataset,
        displayName: dataset.displayName?.trim() ?? '',
        datasetId: dataset.datasetId.trim(),
        apiKey: dataset.apiKey.trim(),
        language,
        currencyCode,
        serverUrl: dataset.serverUrl?.trim() ?? '',
        allLanguages: uniqueValues([language, ...(dataset.allLanguages ?? [])]),
        allCurrencies: uniqueValues([currencyCode, ...(dataset.allCurrencies ?? [])]),
        users: dataset.users?.length ? dataset.users : [createDefaultUser()],
        companies: dataset.companies ?? [],
        selectedUserIndex: 0,
    };
}

function uniqueValues(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatCount(count: number, singularLabel: string, pluralLabel = `${singularLabel}s`) {
    return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
}

function startCreatingDataset() {
    draft.value = createEmptyDraft();
    validationErrors.value = [];
    isCreating.value = true;
}

function cancelCreatingDataset() {
    draft.value = createEmptyDraft();
    validationErrors.value = [];
    isCreating.value = false;
}

function createDataset() {
    validationErrors.value = [];

    if (!draft.value.displayName?.trim()) {
        validationErrors.value.push('A dataset name is required.');
    }
    if (!draft.value.datasetId.trim()) {
        validationErrors.value.push('A dataset ID is required.');
    }
    if (!draft.value.apiKey.trim()) {
        validationErrors.value.push('An API key is required.');
    }
    if (!draft.value.language.trim()) {
        validationErrors.value.push('A language is required.');
    }
    if (!draft.value.currencyCode.trim()) {
        validationErrors.value.push('A currency is required.');
    }
    if (datasets.value.some((dataset) => dataset.datasetId === draft.value.datasetId.trim())) {
        validationErrors.value.push('Dataset ID must be unique.');
    }

    if (validationErrors.value.length > 0) {
        return;
    }

    const newDataset = normalizeDataset(draft.value);
    contextStore.addDataset(newDataset);
    isCreating.value = false;
    notificationsStore.push({ title: 'Dataset added', text: `${newDataset.displayName || newDataset.datasetId} was added.` });
}

function configureDataset(datasetId: string) {
    void router.push({ name: 'settings-dataset', params: { datasetId } });
}

function selectDataset(datasetId: string) {
    if (datasetId === activeDatasetId.value) {
        return;
    }

    contextStore.setDataset(datasetId);
    notificationsStore.push({ title: 'Dataset selected', text: 'The active dataset was updated.' });
}

function shareDataset(dataset: IDataset) {
    const shareUrl = new URL('/app-settings', window.location.origin);
    shareUrl.searchParams.set('share', encodeSharePayload(JSON.stringify(dataset)));
    navigator.clipboard.writeText(shareUrl.toString());
    notificationsStore.push({ title: 'Share link copied', text: `The share link for ${dataset.displayName || dataset.datasetId} was copied to your clipboard.` });
}

function removeDataset(dataset: IDataset) {
    const confirmed = confirm(`Remove dataset "${dataset.displayName || dataset.datasetId}"?`);
    if (!confirmed) {
        return;
    }

    contextStore.deleteDatasetById(dataset.datasetId);
    notificationsStore.push({ title: 'Dataset removed', text: `${dataset.displayName || dataset.datasetId} was removed.` });
}
</script>
