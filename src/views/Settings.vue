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

  <SettingsSharedDatasetImportDialog
    v-model="isSharedDatasetImportDialogOpen"
    :pending-import="pendingSharedDatasetImport"
    :import-decision="importDecision"
    @update:import-decision="importDecision = $event"
    @confirm="confirmSharedDatasetImport"
    @cancel="cancelSharedDatasetImport"
  />
</template>

<script lang="ts" setup>
import router from '@/router';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { decodeSharePayload } from '@/helpers/shareEncoding';
import {
    applySharedDatasetImportDecision,
    createDatasetFromSharedDataset,
    getDefaultSharedDatasetImportDecision,
    getSharedDatasetDiff,
    parseSharedDataset,
    resolveSharedDatasetSessionSelections,
    type SharedDataset,
    type SharedDatasetDiff,
    type SharedDatasetImportDecision,
} from '@/helpers/sharedDataset';
import SettingsDatasetsWorkspace from '@/components/settings/SettingsDatasetsWorkspace.vue';
import SettingsDatasetConfiguration from '@/components/settings/SettingsDatasetConfiguration.vue';
import SettingsSharedDatasetImportDialog from '@/components/settings/SettingsSharedDatasetImportDialog.vue';
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
    diff: SharedDatasetDiff;
} | null>(null);
const importDecision = ref<SharedDatasetImportDecision>(createDefaultImportDecision());
const isSharedDatasetImportDialogOpen = ref(false);
const breadcrumbItems = computed(() => {
    if (!selectedDataset.value) {
        return [{ name: 'Settings', route: { name: 'settings' } }];
    }

    return [
        { name: 'Settings', route: { name: 'settings' } },
        { name: selectedDataset.value.displayName || selectedDataset.value.datasetId, route: { name: 'settings-dataset', params: { datasetId: selectedDataset.value.datasetId } } },
    ];
});
void init();

async function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('share')) {
        return;
    }

    const shareParam = params.get('share')!;

    params.delete('share');
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState(null, '', url.toString());

    let sharedDataset: SharedDataset | null = null;
    try {
        sharedDataset = parseSharedDataset(JSON.parse(decodeSharePayload(shareParam)));
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

    const diff = getSharedDatasetDiff(existingDataset, sharedDataset);
    if (!diff.requiresReview) {
        if (diff.hasChanges) {
            applySharedDatasetImportDecision(existingDataset, sharedDataset, importDecision.value);
        }
        activateImportedDataset(existingDataset.datasetId, sharedDataset);
        await reloadAtRoute(
            { name: 'settings-dataset', params: { datasetId: existingDataset.datasetId } },
            { type: 'success', title: diff.hasChanges ? 'Shared dataset applied.' : 'Dataset already up to date.' },
        );
        return;
    }

    pendingSharedDatasetImport.value = {
        incoming: sharedDataset,
        existingDataset,
        diff,
    };
    importDecision.value = createDefaultImportDecision();
    isSharedDatasetImportDialogOpen.value = true;
}

async function confirmSharedDatasetImport() {
    const pendingImport = pendingSharedDatasetImport.value;
    if (!pendingImport) {
        return;
    }

    applySharedDatasetImportDecision(pendingImport.existingDataset, pendingImport.incoming, importDecision.value);
    activateImportedDataset(pendingImport.existingDataset.datasetId, pendingImport.incoming);
    pendingSharedDatasetImport.value = null;
    isSharedDatasetImportDialogOpen.value = false;

    await reloadAtRoute(
            { name: 'settings-dataset', params: { datasetId: importDecision.value.coreFields === 'incoming'
            ? pendingImport.incoming.datasetId
            : pendingImport.existingDataset.datasetId } },
        { type: 'success', title: 'Shared dataset applied.' },
    );
}

async function cancelSharedDatasetImport() {
    const pendingImport = pendingSharedDatasetImport.value;
    pendingSharedDatasetImport.value = null;
    isSharedDatasetImportDialogOpen.value = false;

    if (!pendingImport) {
        return;
    }

    await router.replace({ name: 'settings-dataset', params: { datasetId: pendingImport.existingDataset.datasetId } });
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
    const importedSelections = resolveSharedDatasetSessionSelections(dataset, sharedDataset);

    contextStore.applySessionContext({
        datasetId,
        language: nextLanguage,
        currencyCode: nextCurrency,
        selectedUserIndex: importedSelections.selectedUserIndex ?? (isCurrentDataset ? contextStore.selectedUserIndex.value : undefined),
        selectedCompanyId: importedSelections.selectedCompanyId ?? (isCurrentDataset ? contextStore.selectedCompanyId.value : undefined),
    });
}

function createDefaultImportDecision() {
    return { ...getDefaultSharedDatasetImportDecision() };
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
</script>
