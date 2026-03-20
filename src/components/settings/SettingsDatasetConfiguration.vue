<template>
  <div
    v-if="dataset"
    class="grid gap-6 xl:grid-cols-2"
  >
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Basics
      </p>
      <h2 class="mt-2 text-3xl text-slate-900">
        Dataset configuration
      </h2>
      <p class="mt-2 text-sm text-slate-600">
        Changes save automatically for the active dataset.
      </p>

      <div class="mt-8 grid gap-5">
        <div>
          <label class="text-sm block">Name</label>
          <input
            v-model="dataset.displayName"
            type="text"
            placeholder="Name"
          >
        </div>

        <div>
          <label class="text-sm block">Dataset Id</label>
          <input
            v-model="dataset.datasetId"
            type="text"
            placeholder="Dataset id"
          >
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Connection
      </p>
      <h3 class="mt-2 text-2xl text-slate-900">
        API access
      </h3>

      <div class="mt-8 grid gap-5">
        <div>
          <label class="text-sm block">API Key</label>
          <input
            v-model="dataset.apiKey"
            type="text"
            placeholder="Api key"
          >
        </div>

        <div>
          <label class="text-sm block">Server URL</label>
          <input
            v-model="dataset.serverUrl"
            type="text"
            placeholder="Server Url"
          >
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Locales
      </p>
      <h3 class="mt-2 text-2xl text-slate-900">
        Languages and currencies
      </h3>

      <div class="mt-8 grid gap-5">
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <label class="text-sm block">Language</label>
            <input
              v-model="dataset.language"
              type="text"
              placeholder="LanguageCode"
            >
          </div>

          <div>
            <label class="text-sm block">Currency</label>
            <input
              v-model="dataset.currencyCode"
              type="text"
              placeholder="CurrencyCode"
            >
          </div>
        </div>

        <ListValues
          label="Languages"
          :items="dataset.allLanguages"
          :single-item="dataset.language"
          input-placeholder="LanguageCode"
          new-item-placeholder="New Language"
        />

        <ListValues
          label="Currencies"
          :items="dataset.allCurrencies"
          :single-item="dataset.currencyCode"
          input-placeholder="CurrencyCode"
          new-item-placeholder="New Currency"
        />
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Features
          </p>
          <h3 class="mt-2 text-2xl text-slate-900">
            Demo behavior
          </h3>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {{ enabledFeatureCount }} enabled
        </span>
      </div>

      <div class="mt-8 space-y-6">
        <div
          v-for="feature in featureFields"
          :key="feature.key"
          class="rounded-xl border border-slate-200 p-4"
        >
          <label class="flex items-start gap-3">
            <input
              v-model="dataset[feature.key]"
              class="mt-1 h-5 w-5 accent-brand-500"
              type="checkbox"
            >
            <span>
              <span class="block font-semibold text-slate-900">{{ feature.label }}</span>
              <span class="mt-1 block text-sm text-slate-600">{{ feature.description }}</span>
            </span>
          </label>
        </div>

        <div class="rounded-xl border border-slate-200 p-4">
          <label class="text-sm block">Recommendations lookback in minutes</label>
          <input
            v-model.number="dataset.recommendationsMinutesAgo"
            class="mt-2"
            type="text"
          >
          <p class="mt-2 text-sm text-slate-600">
            Default is 20160 minutes, equivalent to 14 days.
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 p-4">
          <h4 class="font-semibold text-slate-900">
            UTM-based Product Boosting
          </h4>
          <p class="mt-2 text-sm text-slate-600">
            Search and listing results are boosted based on supported UTM parameters. This is descriptive only and does not require local configuration.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import ListValues from '@/components/ListValues.vue';
import contextStore from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { computed, ref, watch } from 'vue';

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

const dataset = computed(() => contextStore.context.value);
const datasets = computed(() => contextStore.datasets.value);
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSavedNotificationAt = 0;
let isApplyingAutosave = false;
let lastPersistedSnapshot = '';

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
    if (!dataset.value) {
        return 0;
    }

    return featureFields.filter((feature) => dataset.value[feature.key]).length;
});

watch(
    dataset,
    () => {
        if (isApplyingAutosave) {
            return;
        }
        queueSave();
    },
    { deep: true },
);

function queueSave() {
    if (!dataset.value) {
        return;
    }

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        const normalizedLanguages = uniqueValues([dataset.value.language, ...(dataset.value.allLanguages ?? [])]);
        const normalizedCurrencies = uniqueValues([dataset.value.currencyCode, ...(dataset.value.allCurrencies ?? [])]);
        const nextSnapshot = JSON.stringify({
            ...dataset.value,
            displayName: dataset.value.displayName?.trim() ?? '',
            datasetId: dataset.value.datasetId.trim(),
            apiKey: dataset.value.apiKey.trim(),
            language: dataset.value.language.trim(),
            currencyCode: dataset.value.currencyCode.trim(),
            serverUrl: dataset.value.serverUrl?.trim() ?? '',
            allLanguages: normalizedLanguages,
            allCurrencies: normalizedCurrencies,
        });

        if (nextSnapshot === lastPersistedSnapshot) {
            return;
        }

        isApplyingAutosave = true;
        try {
            dataset.value.displayName = dataset.value.displayName?.trim() ?? '';
            dataset.value.datasetId = dataset.value.datasetId.trim();
            dataset.value.apiKey = dataset.value.apiKey.trim();
            dataset.value.language = dataset.value.language.trim();
            dataset.value.currencyCode = dataset.value.currencyCode.trim();
            dataset.value.serverUrl = dataset.value.serverUrl?.trim() ?? '';
            dataset.value.allLanguages = normalizedLanguages;
            dataset.value.allCurrencies = normalizedCurrencies;

            if (!dataset.value.datasetId || !dataset.value.apiKey || !dataset.value.language || !dataset.value.currencyCode) {
                return;
            }

            const duplicateDatasetIds = datasets.value.filter((entry) => entry.datasetId === dataset.value.datasetId);
            if (duplicateDatasetIds.length > 1) {
                return;
            }

            contextStore.persistState();
            lastPersistedSnapshot = nextSnapshot;
        } finally {
            isApplyingAutosave = false;
        }
        pushSavedNotification();
    }, 500);
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
    notificationsStore.push({ title: 'Settings saved', text: 'Dataset configuration was saved.' });
}

lastPersistedSnapshot = JSON.stringify(dataset.value ? {
    ...dataset.value,
} : {});
</script>
