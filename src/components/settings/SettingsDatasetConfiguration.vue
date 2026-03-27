<template>
  <div class="space-y-6">
    <section class="sticky top-3 z-30 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-sm text-slate-600">
            Review and update the dataset configuration, then save when you are ready.
          </p>
          <p
            v-if="isDirty"
            class="mt-2 text-sm font-semibold text-amber-700"
          >
            You have unsaved changes.
          </p>
        </div>

        <button
          :disabled="!isDirty"
          :class="!isDirty ? 'cursor-not-allowed opacity-60' : ''"
          @click="saveChanges"
        >
          Save changes
        </button>
      </div>

      <ul
        v-if="errors.length > 0"
        class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <li
          v-for="error in errors"
          :key="error"
        >
          {{ error }}
        </li>
      </ul>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-left transition hover:bg-slate-100"
        @click="toggleSection('general')"
      >
        <h2 class="text-2xl font-semibold text-slate-900">
          General
        </h2>
        <ChevronDownIcon
          class="h-5 w-5 text-slate-500 transition"
          :class="openSections.general ? 'rotate-180' : ''"
        />
      </button>

      <div
        v-if="openSections.general"
        class="px-6 py-6"
      >
        <div class="grid gap-8 xl:grid-cols-2">
          <div class="space-y-5">
            <div>
              <label class="text-sm block">Name</label>
              <input
                v-model="editableDataset.displayName"
                type="text"
                class="lp-ignore-field"
                name="rw-display-name"
                placeholder="Name"
                autocomplete="new-password"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
              >
            </div>

            <div>
              <label class="text-sm block">Dataset ID</label>
              <input
                v-model="editableDataset.datasetId"
                type="text"
                class="lp-ignore-field disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                name="dataset-id"
                placeholder="Dataset ID"
                disabled
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                data-form-type="other"
                data-lpignore="true"
              >
            </div>

            <div>
              <label class="text-sm block">API Key</label>
              <SecretInput
                v-model="editableDataset.apiKey"
                name="dataset-api-key"
                placeholder="API Key"
                :reveal-on-change-key="props.dataset.datasetId"
                show-label="Show API key"
                hide-label="Hide API key"
              />
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

          <div class="space-y-5">
            <DismissibleBadgeInput
              :items="languageItems"
              label="Languages"
              placeholder="Add language"
              @update:items="setLanguages"
            />

            <DismissibleBadgeInput
              :items="currencyItems"
              label="Currencies"
              placeholder="Add currency"
              uppercase
              @update:items="setCurrencies"
            />

            <div>
              <label class="text-sm block">Tracking</label>
              <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label class="flex items-start justify-between gap-4">
                  <div>
                    <span class="block font-semibold text-slate-900">Tracking enabled</span>
                    <span class="mt-1 block text-sm text-slate-600">
                      When enabled, interactions are tracked to Relewise for personalized experiences.
                    </span>
                  </div>

                  <span class="relative inline-flex shrink-0 items-center">
                    <input
                      v-model="trackingEnabled"
                      type="checkbox"
                      class="peer sr-only"
                    >
                    <span class="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-slate-900" />
                    <span class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-left transition hover:bg-slate-100"
        @click="toggleSection('features')"
      >
        <h2 class="text-2xl font-semibold text-slate-900">
          Features
        </h2>
        <div class="flex items-center gap-4">
          <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-600">
            {{ enabledFeatureCount }} enabled
          </span>
          <ChevronDownIcon
            class="h-5 w-5 text-slate-500 transition"
            :class="openSections.features ? 'rotate-180' : ''"
          />
        </div>
      </button>

      <div
        v-if="openSections.features"
        class="px-6 py-6"
      >
        <div class="space-y-4">
          <div
            v-for="feature in featureFields"
            :key="feature.key"
            class="rounded-xl border border-slate-200 bg-slate-50 p-4"
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

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-left transition hover:bg-slate-100"
        @click="toggleSection('personalization')"
      >
        <h2 class="text-2xl font-semibold text-slate-900">
          Personalization
        </h2>
        <ChevronDownIcon
          class="h-5 w-5 text-slate-500 transition"
          :class="openSections.personalization ? 'rotate-180' : ''"
        />
      </button>

      <div
        v-if="openSections.personalization"
        class="px-6 py-6"
      >
        <Personalisation :dataset="editableDataset" />
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
/* eslint-disable vue/no-mutating-props */
import DismissibleBadgeInput from '@/components/DismissibleBadgeInput.vue';
import Personalisation from '@/components/Personalisation.vue';
import SecretInput from '@/components/SecretInput.vue';
import { validateDatasetCoreFields } from '@/helpers/datasetValidation';
import contextStore, { sanitizeDatasetConfiguration, type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import type { Company, DataValue } from '@relewise/client';
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

const props = defineProps<{
    dataset: IDataset;
}>();

const editableDataset = ref<IDataset>(cloneDataset(props.dataset));
const trackingEnabled = ref(props.dataset.trackingEnabled ?? false);
const errors = ref<string[]>([]);
const openSections = ref({
    general: true,
    features: false,
    personalization: true,
});
const lastSavedSnapshot = ref('');

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
    return featureFields.filter((feature) => editableDataset.value[feature.key]).length;
});
const languageItems = computed(() => uniqueValues(editableDataset.value.allLanguages ?? []));
const currencyItems = computed(() => uniqueValues(editableDataset.value.allCurrencies ?? [], { uppercase: true }));

const isDirty = computed(() => {
    return createSnapshot(editableDataset.value, trackingEnabled.value) !== lastSavedSnapshot.value;
});

watch(
    () => props.dataset,
    (nextDataset) => {
        editableDataset.value = cloneDataset(nextDataset);
        trackingEnabled.value = nextDataset.trackingEnabled ?? false;
        errors.value = [];
        lastSavedSnapshot.value = createSnapshot(nextDataset, trackingEnabled.value);
    },
    { immediate: true, deep: true },
);

function toggleSection(section: keyof typeof openSections.value) {
    openSections.value[section] = !openSections.value[section];
}

function setLanguages(nextLanguages: string[]) {
    editableDataset.value.allLanguages = uniqueValues(nextLanguages);
}

function setCurrencies(nextCurrencies: string[]) {
    editableDataset.value.allCurrencies = uniqueValues(nextCurrencies, { uppercase: true });
}

function saveChanges() {
    errors.value = [];

    const normalizedDataset = normalizeDataset(editableDataset.value);

    errors.value.push(...validateDatasetCoreFields(normalizedDataset));

    if (normalizedDataset.allLanguages.length === 0) {
        errors.value.push('At least one language is required.');
    }
    if (normalizedDataset.allCurrencies.length === 0) {
        errors.value.push('At least one currency is required.');
    }

    const duplicateDatasetIds = contextStore.datasets.value.filter((entry) => entry.datasetId === normalizedDataset.datasetId && entry !== props.dataset);
    if (duplicateDatasetIds.length > 0) {
        errors.value.push('Dataset ID must be unique.');
    }

    validatePersonalisation(normalizedDataset);

    if (errors.value.length > 0) {
        return;
    }

    Object.assign(props.dataset, normalizedDataset);
    props.dataset.trackingEnabled = trackingEnabled.value;
    editableDataset.value = cloneDataset(normalizedDataset);
    editableDataset.value.trackingEnabled = trackingEnabled.value;

    if (contextStore.hasActiveDataset.value && contextStore.context.value === props.dataset) {
        contextStore.refreshActiveContext();
    }
    else {
        contextStore.persistState();
    }

    lastSavedSnapshot.value = createSnapshot(props.dataset, trackingEnabled.value);
    notificationsStore.push({ title: 'Settings saved', text: 'Dataset settings were saved.' });
}

function normalizeDataset(dataset: IDataset): IDataset {
    return sanitizeDatasetConfiguration({
        ...cloneDataset(dataset),
        displayName: dataset.displayName?.trim() ?? '',
        datasetId: dataset.datasetId.trim(),
        apiKey: dataset.apiKey.trim(),
        serverUrl: dataset.serverUrl?.trim() ?? '',
        allLanguages: uniqueValues(dataset.allLanguages ?? []),
        allCurrencies: uniqueValues(dataset.allCurrencies ?? [], { uppercase: true }),
        trackingEnabled: dataset.trackingEnabled ?? false,
        users: dataset.users ?? [],
        companies: dataset.companies ?? [],
    });
}

function createSnapshot(dataset: IDataset, tracking: boolean) {
    return JSON.stringify({
        tracking,
        dataset: normalizeDataset(dataset),
    });
}

function cloneDataset(dataset: IDataset): IDataset {
    return JSON.parse(JSON.stringify(dataset)) as IDataset;
}

function uniqueValues(values: string[], { uppercase = false }: { uppercase?: boolean } = {}) {
    const normalized: string[] = [];

    for (const value of values) {
        const trimmedValue = uppercase ? value.trim().toUpperCase() : value.trim();
        if (!trimmedValue || normalized.some((existingValue) => existingValue.toLowerCase() === trimmedValue.toLowerCase())) {
            continue;
        }

        normalized.push(trimmedValue);
    }

    return normalized;
}

function validatePersonalisation(dataset: IDataset) {
    const users = dataset.users ?? [];
    const companies = dataset.companies ?? [];

    const invalidUserMetadata = users.some((user) => hasInvalidRecord(user.classifications) || hasInvalidRecord(user.identifiers) || hasInvalidDataRecord(user.data));
    if (invalidUserMetadata) {
        errors.value.push('All user classifications, identifiers, and data values must include both a key and value.');
    }

    const temporaryIds = users.map((user) => user.temporaryId?.trim()).filter(Boolean);
    if (new Set(temporaryIds).size !== temporaryIds.length) {
        errors.value.push('Temporary IDs must be unique.');
    }

    const authenticatedIds = users.map((user) => user.authenticatedId?.trim()).filter(Boolean);
    if (new Set(authenticatedIds).size !== authenticatedIds.length) {
        errors.value.push('Authenticated IDs must be unique.');
    }

    const emails = users.map((user) => user.email?.trim().toLowerCase()).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
        errors.value.push('User emails must be unique.');
    }

    const invalidCompanies = companies.filter((company) => !company.id?.trim());
    if (invalidCompanies.length > 0) {
        errors.value.push('Each company must have an ID.');
    }

    const companyIds = companies.map((company) => company.id?.trim()).filter(Boolean);
    if (new Set(companyIds).size !== companyIds.length) {
        errors.value.push('Company IDs must be unique.');
    }

    const invalidCompanyData = companies.some((company) => hasInvalidDataRecord(company.data));
    if (invalidCompanyData) {
        errors.value.push('All company data values must include both a key and value.');
    }

    const companiesById = new Map(
        companies
            .filter((company) => company.id?.trim())
            .map((company) => [company.id.trim(), company] as const),
    );

    const hasUnknownParentReference = companies.some((company) => {
        const parentId = company.parent?.id?.trim();
        if (!parentId) {
            return false;
        }

        return !companiesById.has(parentId);
    });

    if (hasUnknownParentReference) {
        errors.value.push('Each parent company must reference another company in the dataset.');
    }

    const hasParentAndChildren = companies.some((company) => {
        const companyId = company.id?.trim();
        if (!companyId || !company.parent?.id?.trim()) {
            return false;
        }

        return companies.some((candidate) => candidate.parent?.id?.trim() === companyId);
    });

    if (hasParentAndChildren) {
        errors.value.push('A company with child companies cannot also have a parent company.');
    }

    if (hasCompanyHierarchyCycle(companiesById)) {
        errors.value.push('Company hierarchy cannot contain cycles.');
    }

    if (hasCompanyHierarchyDeeperThanTwoLevels(companiesById)) {
        errors.value.push('Company hierarchy can only be 2 levels deep.');
    }
}

function hasInvalidRecord(record?: Record<string, string | null>) {
    if (!record) {
        return false;
    }

    return Object.entries(record).some(([key, value]) => !key || !value);
}

function hasInvalidDataRecord(record?: Record<string, DataValue>) {
    if (!record) {
        return false;
    }

    return Object.entries(record).some(([key, value]) => !key || !value?.value);
}

function hasCompanyHierarchyCycle(companiesById: Map<string, Company>) {
    for (const companyId of companiesById.keys()) {
        const visited = new Set<string>();
        let currentCompanyId: string | undefined = companyId;

        while (currentCompanyId) {
            if (visited.has(currentCompanyId)) {
                return true;
            }

            visited.add(currentCompanyId);
            currentCompanyId = companiesById.get(currentCompanyId)?.parent?.id?.trim();
        }
    }

    return false;
}

function hasCompanyHierarchyDeeperThanTwoLevels(companiesById: Map<string, Company>) {
    for (const companyId of companiesById.keys()) {
        let depth = 0;
        let currentCompanyId = companiesById.get(companyId)?.parent?.id?.trim();
        const visited = new Set<string>();

        while (currentCompanyId && !visited.has(currentCompanyId)) {
            visited.add(currentCompanyId);
            depth += 1;

            if (depth > 1) {
                return true;
            }

            currentCompanyId = companiesById.get(currentCompanyId)?.parent?.id?.trim();
        }
    }

    return false;
}
</script>
