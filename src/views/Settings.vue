<template>
  <div class="container mx-auto p-2 xl:p-0">
    <Breadcrumb :items="breadcrumbItems" />

    <h1
      v-if="!selectedDataset"
      class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block"
    >
      Settings
    </h1>
    <h1
      v-else
      class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block"
    >
      {{ selectedDataset.displayName || selectedDataset.datasetId }}
    </h1>

    <div
      :key="settingsViewKey"
      class="mb-8"
    >
      <div v-if="selectedDataset">
        <SettingsDatasetConfiguration :dataset="selectedDataset" />
      </div>
      <div v-else-if="datasetIdParam">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-slate-600">
            The requested dataset could not be found.
          </p>
        </div>
      </div>
      <div v-else>
        <SettingsDatasetsWorkspace />
      </div>
    </div>
  </div>

  <ConfirmationDialog
    v-model="isSharedDatasetImportDialogOpen"
    title="Update existing dataset?"
    :description="sharedDatasetImportDescription"
    confirm-label="Update dataset"
    cancel-label="Keep existing"
    confirm-tone="primary"
    @confirm="confirmSharedDatasetImport"
    @cancel="declineSharedDatasetImport"
  >
    <template #content>
      <div class="space-y-3">
        <div
          v-if="pendingSharedDatasetImport"
          class="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dataset ID
          </p>
          <p class="mt-1 break-all font-mono text-sm text-slate-900">
            {{ pendingSharedDatasetImport.incoming.datasetId }}
          </p>
        </div>

        <p class="text-sm text-slate-600">
          Confirm to update the fields below:
        </p>

        <div
          v-for="change in sharedDatasetCoreFieldChanges"
          :key="change.key"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-slate-900">
              {{ change.label }}
            </p>
            <button
              v-if="change.key === 'apiKey'"
              type="button"
              class="!bg-transparent !px-0 !py-0 text-sm font-semibold !text-slate-600 !shadow-none transition hover:!text-slate-900"
              @click="isApiKeyComparisonVisible = !isApiKeyComparisonVisible"
            >
              {{ isApiKeyComparisonVisible ? 'Hide values' : 'Show values' }}
            </button>
          </div>
          <div class="mt-3 space-y-3">
            <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current
              </p>
              <p
                class="mt-1 break-all font-mono text-sm text-slate-700"
                :class="change.key === 'apiKey' && !isApiKeyComparisonVisible ? 'masked-secret' : ''"
              >
                {{ formatSharedFieldValue(change.currentValue) }}
              </p>
            </div>
            <div class="rounded-xl bg-white p-3 ring-1 ring-brand-200">
              <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
                New
              </p>
              <p
                class="mt-1 break-all font-mono text-sm text-slate-900"
                :class="change.key === 'apiKey' && !isApiKeyComparisonVisible ? 'masked-secret' : ''"
              >
                {{ formatSharedFieldValue(change.nextValue) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <p class="text-sm text-slate-600">
        Users, companies, feature settings, and other local configuration will be kept.
      </p>
    </template>
  </ConfirmationDialog>
</template>

<script lang="ts" setup>
import router from '@/router';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Breadcrumb from '@/components/Breadcrumb.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
import { decodeSharePayload } from '@/helpers/shareEncoding';
import {
    createDatasetFromSharedDataset,
    getSharedDatasetCoreFieldChanges,
    mergeSharedDatasetLocalesIntoExistingDataset,
    mergeSharedDatasetIntoExistingDataset,
    parseSharedDataset,
    type SharedDataset,
} from '@/helpers/sharedDataset';
import SettingsDatasetsWorkspace from '@/components/settings/SettingsDatasetsWorkspace.vue';
import SettingsDatasetConfiguration from '@/components/settings/SettingsDatasetConfiguration.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';

const route = useRoute();
const datasetIdParam = computed(() => typeof route.params.datasetId === 'string' ? route.params.datasetId : '');
const settingsViewKey = computed(() => datasetIdParam.value || 'datasets-list');
const selectedDataset = computed(() => datasetIdParam.value
    ? contextStore.datasets.value.find((dataset) => dataset.datasetId === datasetIdParam.value)
    : undefined);
const pendingSharedDatasetImport = ref<{
    incoming: SharedDataset;
    existingDataset: IDataset;
} | null>(null);
const isSharedDatasetImportDialogOpen = ref(false);
const isApiKeyComparisonVisible = ref(false);
const breadcrumbItems = computed(() => {
    if (!selectedDataset.value) {
        return [{ name: 'Settings', route: { name: 'settings' } }];
    }

    return [
        { name: 'Settings', route: { name: 'settings' } },
        { name: selectedDataset.value.displayName || selectedDataset.value.datasetId, route: { name: 'settings-dataset', params: { datasetId: selectedDataset.value.datasetId } } },
    ];
});
const sharedDatasetImportDescription = computed(() => {
    if (!pendingSharedDatasetImport.value) {
        return '';
    }

    return 'The dataset already exists locally.';
});
const sharedDatasetCoreFieldChanges = computed(() => {
    const pendingImport = pendingSharedDatasetImport.value;
    if (!pendingImport) {
        return [];
    }

    return getSharedDatasetCoreFieldChanges(pendingImport.existingDataset, pendingImport.incoming);
});

void init();

async function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('share')) {
        return;
    }

    let sharedDataset: SharedDataset | null = null;
    try {
        sharedDataset = parseSharedDataset(JSON.parse(decodeSharePayload(params.get('share')!)));
    } catch {
    }

    if (!sharedDataset) {
        await router.replace({ name: 'settings' });
        notificationsStore.push({ type: 'error', title: 'Invalid link', text: 'The dataset could not be imported.' });
        return;
    }

    const existingDataset = contextStore.datasets.value.find((dataset) => dataset.datasetId === sharedDataset.datasetId);
    if (!existingDataset) {
        const importedDataset = createDatasetFromSharedDataset(sharedDataset);
        contextStore.addDataset(importedDataset);
        activateImportedDataset(importedDataset.datasetId, sharedDataset);
        await reloadAtRoute(
            { name: 'settings-dataset', params: { datasetId: importedDataset.datasetId } },
            { type: 'success', title: 'Dataset imported.' },
        );
        return;
    }

    const coreFieldChanges = getSharedDatasetCoreFieldChanges(existingDataset, sharedDataset);
    if (coreFieldChanges.length === 0) {
        mergeSharedDatasetIntoExistingDataset(existingDataset, sharedDataset);
        activateImportedDataset(existingDataset.datasetId, sharedDataset);

        await reloadAtRoute({ name: 'home' });
        return;
    }

    pendingSharedDatasetImport.value = {
        incoming: sharedDataset,
        existingDataset,
    };
    isApiKeyComparisonVisible.value = false;
    isSharedDatasetImportDialogOpen.value = true;
}

async function confirmSharedDatasetImport() {
    const pendingImport = pendingSharedDatasetImport.value;
    if (!pendingImport) {
        return;
    }

    mergeSharedDatasetIntoExistingDataset(pendingImport.existingDataset, pendingImport.incoming);
    activateImportedDataset(pendingImport.existingDataset.datasetId, pendingImport.incoming);
    pendingSharedDatasetImport.value = null;
    isSharedDatasetImportDialogOpen.value = false;

    await reloadAtRoute(
        { name: 'settings-dataset', params: { datasetId: pendingImport.existingDataset.datasetId } },
        { type: 'success', title: 'Dataset updated.' },
    );
}

async function declineSharedDatasetImport() {
    const pendingImport = pendingSharedDatasetImport.value;
    pendingSharedDatasetImport.value = null;
    isSharedDatasetImportDialogOpen.value = false;

    if (!pendingImport) {
        return;
    }

    mergeSharedDatasetLocalesIntoExistingDataset(pendingImport.existingDataset, pendingImport.incoming);
    activateImportedDataset(pendingImport.existingDataset.datasetId, pendingImport.incoming);
    await reloadAtRoute({ name: 'home' });
}

function activateImportedDataset(datasetId: string, sharedDataset: SharedDataset) {
    const dataset = contextStore.datasets.value.find((entry) => entry.datasetId === datasetId);
    if (!dataset) {
        return;
    }

    const isCurrentDataset = contextStore.hasActiveDataset.value && contextStore.context.value.datasetId === datasetId;
    const nextLanguage = sharedDataset.language?.trim()
        || (isCurrentDataset ? contextStore.language.value : '')
        || dataset.allLanguages[0]
        || '';
    const nextCurrency = sharedDataset.currencyCode?.trim().toUpperCase()
        || (isCurrentDataset ? contextStore.currencyCode.value : '')
        || dataset.allCurrencies[0]
        || '';

    contextStore.applySessionContext({
        datasetId,
        language: nextLanguage,
        currencyCode: nextCurrency,
        selectedUserIndex: isCurrentDataset ? contextStore.selectedUserIndex.value : undefined,
        selectedCompanyId: isCurrentDataset ? contextStore.selectedCompanyId.value : undefined,
    });
}

function formatSharedFieldValue(value: string) {
    return value || 'Empty';
}

async function reloadAtRoute(
    to: Parameters<typeof router.replace>[0],
    notification?: Parameters<typeof notificationsStore.push>[0],
) {
    if (notification) {
        notificationsStore.pushAfterReload(notification);
    }
    await router.replace(to);
    window.location.reload();
}

watch(isSharedDatasetImportDialogOpen, (isOpen) => {
    if (!isOpen) {
        isApiKeyComparisonVisible.value = false;
    }
});
</script>

<style scoped>
.masked-secret {
    -webkit-text-security: disc;
    text-security: disc;
}
</style>
