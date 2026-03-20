<template>
  <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Datasets
          </p>
          <h2 class="mt-2 text-3xl text-slate-900">
            Manage configured datasets
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Select the active dataset, review key details, and remove datasets you no longer need.
          </p>
        </div>

        <button
          class="shrink-0"
          @click="startCreatingDataset"
        >
          New dataset
        </button>
      </div>

      <div
        v-if="datasets.length === 0"
        class="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
      >
        <h3 class="text-2xl text-slate-900">
          No datasets configured
        </h3>
        <p class="mt-2 text-sm text-slate-600">
          Create a dataset to configure the demo shop and unlock personalization settings.
        </p>
        <button
          class="mt-6"
          @click="startCreatingDataset"
        >
          Create your first dataset
        </button>
      </div>

      <div
        v-else
        class="mt-8 space-y-4"
      >
        <button
          v-for="dataset in datasets"
          :key="dataset.datasetId || dataset.displayName || 'dataset'"
          type="button"
          class="w-full rounded-2xl border p-5 text-left transition"
          :class="dataset.datasetId === activeDatasetId
            ? 'border-brand-500 bg-brand-50 shadow-sm'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
          @click="selectDataset(dataset.datasetId)"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-xl text-slate-900">
                  {{ dataset.displayName || 'Unnamed dataset' }}
                </h3>
                <span
                  v-if="dataset.datasetId === activeDatasetId"
                  class="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                >
                  Active
                </span>
              </div>
              <p class="mt-2 font-mono text-sm text-slate-500">
                {{ dataset.datasetId || 'Missing dataset id' }}
              </p>
            </div>

            <div class="text-right text-sm text-slate-500">
              <p>{{ dataset.language || 'No language' }} / {{ dataset.currencyCode || 'No currency' }}</p>
              <p class="mt-1">
                {{ dataset.users?.length ?? 0 }} users, {{ dataset.companies?.length ?? 0 }} companies
              </p>
            </div>
          </div>
        </button>
      </div>
    </section>

    <section class="space-y-6">
      <div
        v-if="isCreating"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              New dataset
            </p>
            <h3 class="mt-2 text-2xl text-slate-900">
              Create dataset
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
            Create dataset
          </button>
          <span
            v-if="created"
            class="text-sm text-green-600"
          >
            Dataset created.
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import contextStore, { type IDataset } from '@/stores/context.store';
import { UserFactory } from '@relewise/client';
import { computed, ref } from 'vue';

type DatasetDraft = IDataset;

const emit = defineEmits<{
    datasetSelected: [];
}>();

const datasets = computed(() => contextStore.datasets.value);
const activeDatasetId = computed(() => activeDataset.value?.datasetId ?? '');
const created = ref(false);
const isCreating = ref(false);
const validationErrors = ref<string[]>([]);
const activeDataset = computed(() => contextStore.context.value);

const draft = ref<DatasetDraft>(createEmptyDraft());

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
        users: [UserFactory.anonymous()],
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
        users: dataset.users?.length ? dataset.users : [UserFactory.anonymous()],
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
        validationErrors.value.push('A default language is required.');
    }
    if (!draft.value.currencyCode.trim()) {
        validationErrors.value.push('A default currency is required.');
    }
    if (datasets.value.some((dataset) => dataset.datasetId === draft.value.datasetId.trim())) {
        validationErrors.value.push('Dataset id must be unique.');
    }

    if (validationErrors.value.length > 0) {
        return;
    }

    contextStore.addDataset(normalizeDataset(draft.value));
    created.value = true;
    isCreating.value = false;
    emit('datasetSelected');
    setTimeout(() => {
        created.value = false;
    }, 3000);
}

function selectDataset(datasetId: string) {
    if (!datasetId || datasetId === activeDatasetId.value) {
        return;
    }

    contextStore.setDataset(datasetId);
    emit('datasetSelected');
    window.location.reload();
}

function deleteDataset() {
    const confirmed = confirm('Delete active dataset?');
    if (!confirmed) {
        return;
    }

    contextStore.deleteSelected();
    emit('datasetSelected');
}
</script>
