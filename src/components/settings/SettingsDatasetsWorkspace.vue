<template>
  <div>
    <SettingsPanel
      :title="datasets.length > 0 ? 'Datasets' : 'No datasets configured'"
      :description="datasets.length > 0
        ? 'Click a dataset row to open its settings. Use the actions on each row to set the active dataset, share, or remove it.'
        : 'Add a dataset to start configuring the demo shop.'"
      :content-class="datasets.length > 0 ? 'mt-8' : 'mt-0'"
    >
      <template
        v-if="datasets.length > 0"
        #actions
      >
        <button @click="startCreatingDataset">
          Add new dataset
        </button>
      </template>

      <div
        v-if="datasets.length === 0"
        class="py-14 text-center"
      >
        <button
          class="mt-2"
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
          @click="configureDataset(dataset.datasetId)"
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
                  {{ formatCount(dataset.allLanguages?.length ?? 0, 'language') }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {{ formatCount(dataset.allCurrencies?.length ?? 0, 'currency', 'currencies') }}
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
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border transition"
                :class="dataset.datasetId === activeDatasetId
                  ? 'cursor-default border-brand-200 bg-brand-100 text-brand-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'"
                :title="dataset.datasetId === activeDatasetId ? 'Active dataset' : 'Set as active'"
                :aria-label="dataset.datasetId === activeDatasetId ? 'Active dataset' : 'Set as active'"
                @click.stop="selectDataset(dataset.datasetId)"
              >
                <CheckCircleIcon
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
    </SettingsPanel>

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
          <SettingsField label="Name">
            <input
              ref="nameInput"
              v-model="draft.displayName"
              type="text"
              placeholder="Name"
            >
          </SettingsField>

          <SettingsField label="Dataset ID">
            <input
              v-model="draft.datasetId"
              type="text"
              placeholder="Dataset ID"
            >
          </SettingsField>

          <SettingsField label="API Key">
            <SecretInput
              v-model="draft.apiKey"
              name="new-dataset-api-key"
              placeholder="API Key"
              :reveal-on-change-key="isCreating ? 'create-dataset' : 'closed'"
              show-label="Show API key"
              hide-label="Hide API key"
            />
          </SettingsField>

          <SettingsField label="Server URL">
            <input
              v-model="draft.serverUrl"
              type="text"
              placeholder="Server URL"
            >
          </SettingsField>

          <div class="grid gap-5 md:grid-cols-2">
            <SettingsField label="Language">
              <input
                v-model="draft.language"
                type="text"
                placeholder="en"
              >
            </SettingsField>

            <SettingsField label="Currency">
              <input
                v-model="draft.currencyCode"
                type="text"
                placeholder="EUR"
              >
            </SettingsField>
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

  <ConfirmationDialog
    v-model="isRemoveDialogOpen"
    title="Remove dataset"
    :description="removeDialogDescription"
    confirm-label="Remove dataset"
    @confirm="confirmRemoveDataset"
  />
</template>

<script lang="ts" setup>
import SecretInput from '@/components/SecretInput.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
import SettingsField from '@/components/settings/SettingsField.vue';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import router from '@/router';
import { validateDatasetCoreFields } from '@/helpers/datasetValidation';
import { encodeSharePayload } from '@/helpers/shareEncoding';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { CheckCircleIcon, LinkIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type DatasetDraft = IDataset & {
    currencyCode: string;
    language: string;
};

const datasets = computed(() => contextStore.datasets.value);
const activeDatasetId = computed(() => contextStore.context.value?.datasetId ?? '');
const isCreating = ref(false);
const datasetPendingRemoval = ref<IDataset | null>(null);
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
        trackingEnabled: false,
        serverUrl: '',
        users: [],
        companies: [],
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
    return normalizeDatasetConfiguration(dataset);
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
    validationErrors.value = validateDatasetCoreFields(draft.value);

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
    notificationsStore.push({ type: 'success', title: 'Dataset added', text: `${newDataset.displayName || newDataset.datasetId} was added.` });
}

const isRemoveDialogOpen = computed({
    get: () => !!datasetPendingRemoval.value,
    set: (value: boolean) => {
        if (!value) {
            datasetPendingRemoval.value = null;
        }
    },
});

const removeDialogDescription = computed(() => {
    const dataset = datasetPendingRemoval.value;
    if (!dataset) {
        return '';
    }

    return `Remove "${dataset.displayName || dataset.datasetId}" from the demo shop? This cannot be undone.`;
});

function configureDataset(datasetId: string) {
    void router.push({ name: 'settings-dataset', params: { datasetId } });
}

function selectDataset(datasetId: string) {
    if (datasetId === activeDatasetId.value) {
        return;
    }

    contextStore.setDataset(datasetId);
    notificationsStore.push({ type: 'success', title: 'Dataset selected', text: 'The active dataset was updated.' });
}

function shareDataset(dataset: IDataset) {
    const shareUrl = new URL('/app-settings', window.location.origin);
    shareUrl.searchParams.set('share', encodeSharePayload(JSON.stringify(dataset)));
    navigator.clipboard.writeText(shareUrl.toString());
    notificationsStore.push({ type: 'success', title: 'Share link copied', text: `The share link for ${dataset.displayName || dataset.datasetId} was copied to your clipboard.` });
}

function removeDataset(dataset: IDataset) {
    datasetPendingRemoval.value = dataset;
}

function confirmRemoveDataset() {
    const dataset = datasetPendingRemoval.value;
    if (!dataset) {
        return;
    }

    contextStore.deleteDatasetById(dataset.datasetId);
    notificationsStore.push({ type: 'success', title: 'Dataset removed', text: `${dataset.displayName || dataset.datasetId} was removed.` });
    datasetPendingRemoval.value = null;
}
</script>
