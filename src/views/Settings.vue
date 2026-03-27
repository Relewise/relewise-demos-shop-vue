<template>
  <div class="container mx-auto p-2 xl:p-0">
    <Breadcrumb :items="breadcrumbItems" />

    <h1
      v-if="!selectedDataset"
      class="text-xl lg:text-4xl font-semibold my-6 underline--yellow inline-block"
    >
      App Settings
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
</template>

<script lang="ts" setup>
import router from '@/router';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { decodeSharePayload } from '@/helpers/shareEncoding';
import SettingsDatasetsWorkspace from '@/components/settings/SettingsDatasetsWorkspace.vue';
import SettingsDatasetConfiguration from '@/components/settings/SettingsDatasetConfiguration.vue';
import contextStore, { sanitizeDatasetConfiguration, type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';

const route = useRoute();
const datasetIdParam = computed(() => typeof route.params.datasetId === 'string' ? route.params.datasetId : '');
const settingsViewKey = computed(() => datasetIdParam.value || 'datasets-list');
const selectedDataset = computed(() => datasetIdParam.value
    ? contextStore.datasets.value.find((dataset) => dataset.datasetId === datasetIdParam.value)
    : undefined);
const breadcrumbItems = computed(() => {
    if (!selectedDataset.value) {
        return [{ name: 'App Settings', route: { name: 'settings' } }];
    }

    return [
        { name: 'App Settings', route: { name: 'settings' } },
        { name: selectedDataset.value.displayName || selectedDataset.value.datasetId, route: { name: 'settings-dataset', params: { datasetId: selectedDataset.value.datasetId } } },
    ];
});

void init();

async function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('share')) {
        return;
    }

    let settings: IDataset;
    try {
        settings = JSON.parse(decodeSharePayload(params.get('share')!)) as IDataset;
    } catch {
        notificationsStore.push({ title: 'Invalid share link', text: 'The shared dataset could not be imported.' });
        return;
    }

    if (contextStore.datasets.value.every((dataset) => dataset.datasetId !== settings.datasetId)) {
        contextStore.addDataset(settings);
    } else {
        const dataset = contextStore.datasets.value.find((entry) => entry.datasetId === settings.datasetId);
        if (dataset) {
            Object.assign(dataset, sanitizeDatasetConfiguration(settings as IDataset & { language?: string; currencyCode?: string; selectedUserIndex?: number }));
        }
        contextStore.setDataset(settings.datasetId);
    }

    contextStore.persistState();

    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    history.replaceState(null, '', url);

    notificationsStore.push({ title: 'Dataset imported', text: `${settings.displayName || settings.datasetId} was added.` });
    await router.replace('/app-settings');
}
</script>
