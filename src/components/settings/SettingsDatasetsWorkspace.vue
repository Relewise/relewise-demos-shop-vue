<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div
        v-if="datasets.length > 0"
        class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Datasets
          </p>
          <h2 class="mt-2 text-3xl text-slate-900">
            Manage datasets
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Select the active dataset for the shop, configure any dataset, or share and remove them individually.
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
          Create a dataset to start configuring the demo shop.
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
          class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
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
                  {{ dataset.datasetId || 'Missing dataset id' }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {{ dataset.language || 'No language' }} / {{ dataset.currencyCode || 'No currency' }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {{ dataset.users?.length ?? 0 }} users
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {{ dataset.companies?.length ?? 0 }} companies
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                class="outline"
                @click="configureDataset(dataset.datasetId)"
              >
                Configure dataset
              </button>
              <button
                class="outline"
                :disabled="dataset.datasetId === activeDatasetId"
                :class="dataset.datasetId === activeDatasetId ? 'cursor-not-allowed opacity-60' : ''"
                @click="selectDataset(dataset.datasetId)"
              >
                {{ dataset.datasetId === activeDatasetId ? 'Selected' : 'Select dataset' }}
              </button>
              <button
                class="outline"
                @click="shareDataset(dataset)"
              >
                Share dataset
              </button>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title="Remove dataset"
                @click="removeDataset(dataset)"
              >
                <TrashIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <SettingsDatasetConfiguration
      v-if="configuredDataset"
      :dataset="configuredDataset"
      @close="configuredDatasetRef = null"
    />

    <div
      v-if="isCreating"
      class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      @click.self="cancelCreatingDataset"
    >
      <div class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              New dataset
            </p>
            <h3 class="mt-2 text-3xl text-slate-900">
              Add dataset
            </h3>
          </div>
          <button
            class="outline"
            @click="cancelCreatingDataset"
          >
            Cancel
          </button>
        </div>

        <div class="mt-6 grid gap-5">
          <div>
            <label class="text-sm block">Name</label>
            <input
              v-model="draft.displayName"
              type="text"
              placeholder="Name"
            >
          </div>

          <div>
            <label class="text-sm block">Dataset Id</label>
            <input
              v-model="draft.datasetId"
              type="text"
              placeholder="Dataset id"
            >
          </div>

          <div>
            <label class="text-sm block">API Key</label>
            <input
              v-model="draft.apiKey"
              type="text"
              placeholder="Api key"
            >
          </div>

          <div>
            <label class="text-sm block">Server URL</label>
            <input
              v-model="draft.serverUrl"
              type="text"
              placeholder="Server Url"
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
                placeholder="USD"
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

        <div class="mt-6 flex items-center gap-3">
          <button @click="createDataset">
            Add dataset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import SettingsDatasetConfiguration from '@/components/settings/SettingsDatasetConfiguration.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { UserFactory } from '@relewise/client';
import { computed, ref, watch } from 'vue';

type DatasetDraft = IDataset;

const datasets = computed(() => contextStore.datasets.value);
const activeDatasetId = computed(() => contextStore.context.value?.datasetId ?? '');
const configuredDatasetRef = ref<IDataset | null>(null);
const isCreating = ref(false);
const validationErrors = ref<string[]>([]);
const draft = ref<DatasetDraft>(createEmptyDraft());

const configuredDataset = computed(() => {
    if (!configuredDatasetRef.value) {
        return undefined;
    }

    return datasets.value.find((dataset) => dataset === configuredDatasetRef.value);
});

watch(datasets, (nextDatasets) => {
    if (!nextDatasets.length) {
        configuredDatasetRef.value = null;
        return;
    }

    if (configuredDatasetRef.value && nextDatasets.some((dataset) => dataset === configuredDatasetRef.value)) {
        return;
    }

    configuredDatasetRef.value = null;
}, { deep: true });

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
        validationErrors.value.push('A dataset id is required.');
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
        validationErrors.value.push('Dataset id must be unique.');
    }

    if (validationErrors.value.length > 0) {
        return;
    }

    const newDataset = normalizeDataset(draft.value);
    contextStore.addDataset(newDataset);
    configuredDatasetRef.value = contextStore.datasets.value.find((dataset) => dataset.datasetId === newDataset.datasetId) ?? null;
    isCreating.value = false;
    notificationsStore.push({ title: 'Dataset added', text: `${newDataset.displayName || newDataset.datasetId} was created.` });
}

function configureDataset(datasetId: string) {
    configuredDatasetRef.value = datasets.value.find((dataset) => dataset.datasetId === datasetId) ?? null;
}

function selectDataset(datasetId: string) {
    contextStore.setDataset(datasetId);
    notificationsStore.push({ title: 'Dataset selected', text: 'The active dataset was updated.' });
    window.location.reload();
}

function shareDataset(dataset: IDataset) {
    const shareUrl = new URL('/app-settings', window.location.origin);
    shareUrl.searchParams.set('share', btoa(JSON.stringify(dataset)));
    navigator.clipboard.writeText(shareUrl.toString());
    notificationsStore.push({ title: 'Share link copied', text: `A share link for ${dataset.displayName || dataset.datasetId} was copied.` });
}

function removeDataset(dataset: IDataset) {
    const confirmed = confirm(`Remove dataset "${dataset.displayName || dataset.datasetId}"?`);
    if (!confirmed) {
        return;
    }

    if (configuredDatasetRef.value === dataset) {
        configuredDatasetRef.value = null;
    }

    contextStore.deleteDatasetById(dataset.datasetId);
    notificationsStore.push({ title: 'Dataset removed', text: `${dataset.displayName || dataset.datasetId} was removed.` });
}
</script>
