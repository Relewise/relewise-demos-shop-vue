<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Configure dataset
        </p>
        <h2
          class="mt-2 truncate text-3xl text-slate-900"
          :title="editableDataset.displayName || editableDataset.datasetId"
        >
          {{ editableDataset.displayName || editableDataset.datasetId }}
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          Update connection details, dataset configuration, and personalization data for this dataset.
        </p>
      </div>

      <button
        class="outline shrink-0"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>

    <div class="mt-8 flex flex-wrap items-center gap-3">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="rounded-full border px-5 py-2 text-sm font-semibold transition"
        :class="activeTab === tab.id
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="activeTab === 'overview'"
      class="mt-8 grid gap-6 xl:grid-cols-2"
    >
      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Overview
        </p>
        <div class="mt-6 grid gap-5">
          <div>
            <label class="text-sm block">Name</label>
            <input
              v-model="editableDataset.displayName"
              type="text"
              placeholder="Name"
            >
          </div>

          <div>
            <label class="text-sm block">Dataset Id</label>
            <input
              v-model="editableDataset.datasetId"
              type="text"
              placeholder="Dataset Id"
            >
          </div>

          <div>
            <label class="text-sm block">API Key</label>
            <input
              v-model="editableDataset.apiKey"
              type="text"
              placeholder="API Key"
            >
          </div>

          <div>
            <label class="text-sm block">Server URL</label>
            <input
              v-model="editableDataset.serverUrl"
              type="text"
              placeholder="Server URL"
            >
          </div>
        </div>
      </section>
    </div>

    <div
      v-else-if="activeTab === 'configuration'"
      class="mt-8 grid gap-6 xl:grid-cols-2"
    >
      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Locales
        </p>
        <h3 class="mt-2 text-2xl text-slate-900">
          Languages and currencies
        </h3>

        <ListValues
          v-model:items="editableDataset.allLanguages"
          v-model:single-item="editableDataset.language"
          label="Languages"
          new-item-placeholder="Add language"
        />

        <ListValues
          v-model:items="editableDataset.allCurrencies"
          v-model:single-item="editableDataset.currencyCode"
          label="Currencies"
          new-item-placeholder="Add currency"
        />
      </section>

      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Features
            </p>
            <h3 class="mt-2 text-2xl text-slate-900">
              Demo behavior
            </h3>
          </div>
          <span class="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600">
            {{ enabledFeatureCount }} enabled
          </span>
        </div>

        <div class="mt-8 space-y-4">
          <div
            v-for="feature in featureFields"
            :key="feature.key"
            class="rounded-xl border border-slate-200 bg-white p-4"
          >
            <label class="flex items-start gap-3">
              <input
                v-model="editableDataset[feature.key]"
                class="mt-1 h-5 w-5 accent-brand-500"
                type="checkbox"
              >
              <span>
                <span class="block font-semibold text-slate-900">{{ feature.label }}</span>
                <span class="mt-1 block text-sm text-slate-600">{{ feature.description }}</span>
              </span>
            </label>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <label class="text-sm block">Recommendations lookback in minutes</label>
            <input
              v-model.number="editableDataset.recommendationsMinutesAgo"
              class="mt-2"
              type="text"
            >
            <p class="mt-2 text-sm text-slate-600">
              Default is 20160 minutes, equivalent to 14 days.
            </p>
          </div>
        </div>
      </section>
    </div>

    <div
      v-else
      class="mt-8"
    >
      <Personalisation :dataset="editableDataset" />
    </div>
  </section>
</template>

<script lang="ts" setup>
 
import ListValues from '@/components/ListValues.vue';
import Personalisation from '@/components/Personalisation.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { computed, ref, watch } from 'vue';

type TabId = 'overview' | 'configuration' | 'personalization';
type DatasetBooleanKey =
    | 'allowThirdLevelCategories'
    | 'hideSoldOutProducts'
    | 'userClassificationFilters'
    | 'showProductRelevanceScore'
    | 'B2bRecommendations'
    | 'showVariantsBadge'
    | 'similarProductsOnPdp'
    | 'variantBasedSearchOverlay'
    | 'searchHighlight'
    | 'contentSearch'
    | 'shoppertainmentEnabled';

const props = defineProps<{
    dataset: IDataset;
}>();

defineEmits(['close']);
const editableDataset = props.dataset;

const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'personalization', label: 'Personalization' },
];

const activeTab = ref<TabId>('overview');
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSavedNotificationAt = 0;
let isApplyingAutosave = false;
let lastPersistedSnapshot = JSON.stringify(editableDataset);

const featureFields: Array<{ key: DatasetBooleanKey; label: string; description: string }> = [
    {
        key: 'allowThirdLevelCategories',
        label: 'Third level categories',
        description: 'Render third level category links on category pages with parents.',
    },
    {
        key: 'hideSoldOutProducts',
        label: 'Hide sold out products in recommendations',
        description: 'Exclude products marked with the SoldOut data key from recommendations.',
    },
    {
        key: 'userClassificationFilters',
        label: 'Respect user classification availability',
        description: 'Filter products based on the user country/channel classifications.',
    },
    {
        key: 'showProductRelevanceScore',
        label: 'Show product relevance score in search',
        description: 'Expose relevance score data in the search experience.',
    },
    {
        key: 'B2bRecommendations',
        label: 'Enable B2B recommendations',
        description: 'Use the B2B cart recommendation behavior for category 3_5.',
    },
    {
        key: 'showVariantsBadge',
        label: 'Show variants badge',
        description: 'Display a badge on product tiles when variants are available.',
    },
    {
        key: 'similarProductsOnPdp',
        label: 'Similar products on PDP',
        description: 'Swap to similar products on sold out product detail pages.',
    },
    {
        key: 'variantBasedSearchOverlay',
        label: 'Variant-based search overlay',
        description: 'Group and display variants beneath each search result product.',
    },
    {
        key: 'searchHighlight',
        label: 'Search highlight',
        description: 'Highlight matched terms in product and content display names.',
    },
    {
        key: 'contentSearch',
        label: 'Content search',
        description: 'Include content results in the search overlay.',
    },
    {
        key: 'shoppertainmentEnabled',
        label: 'Shoppertainment',
        description: 'Show the Shoppertainment navigation entry for enabled datasets.',
    },
];

const enabledFeatureCount = computed(() => {
    return featureFields.filter((feature) => editableDataset[feature.key]).length;
});

watch(
    () => props.dataset,
    () => {
        if (isApplyingAutosave) {
            return;
        }

        queueSave();
    },
    { deep: true },
);

function queueSave() {
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        const normalizedLanguages = uniqueValues([editableDataset.language, ...(editableDataset.allLanguages ?? [])]);
        const normalizedCurrencies = uniqueValues([editableDataset.currencyCode, ...(editableDataset.allCurrencies ?? [])]);
        const nextSnapshot = JSON.stringify({
            ...editableDataset,
            displayName: editableDataset.displayName?.trim() ?? '',
            datasetId: editableDataset.datasetId.trim(),
            apiKey: editableDataset.apiKey.trim(),
            serverUrl: editableDataset.serverUrl?.trim() ?? '',
            language: editableDataset.language.trim(),
            currencyCode: editableDataset.currencyCode.trim(),
            allLanguages: normalizedLanguages,
            allCurrencies: normalizedCurrencies,
        });

        if (nextSnapshot === lastPersistedSnapshot) {
            return;
        }

        isApplyingAutosave = true;
        try {
            editableDataset.displayName = editableDataset.displayName?.trim() ?? '';
            editableDataset.datasetId = editableDataset.datasetId.trim();
            editableDataset.apiKey = editableDataset.apiKey.trim();
            editableDataset.serverUrl = editableDataset.serverUrl?.trim() ?? '';
            editableDataset.language = editableDataset.language.trim();
            editableDataset.currencyCode = editableDataset.currencyCode.trim();
            editableDataset.allLanguages = normalizedLanguages;
            editableDataset.allCurrencies = normalizedCurrencies;

            if (!editableDataset.language) {
                editableDataset.language = editableDataset.allLanguages[0] ?? '';
            }
            if (!editableDataset.currencyCode) {
                editableDataset.currencyCode = editableDataset.allCurrencies[0] ?? '';
            }

            if (!editableDataset.datasetId || !editableDataset.apiKey || !editableDataset.language || !editableDataset.currencyCode) {
                return;
            }

            const duplicateDatasetIds = contextStore.datasets.value.filter((entry) => entry.datasetId === editableDataset.datasetId);
            if (duplicateDatasetIds.length > 1) {
                return;
            }

            contextStore.persistState();
            lastPersistedSnapshot = JSON.stringify(editableDataset);
        } finally {
            isApplyingAutosave = false;
        }

        pushSavedNotification();
    }, 400);
}

function uniqueValues(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function pushSavedNotification() {
    const now = Date.now();
    if (now - lastSavedNotificationAt < 2000) {
        return;
    }

    lastSavedNotificationAt = now;
    notificationsStore.push({ title: 'Settings saved', text: 'Dataset settings were saved.' });
}
</script>
