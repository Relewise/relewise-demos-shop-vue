<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section class="overflow-hidden rounded-[2rem] bg-gradient p-[1px] shadow-lg">
      <div class="rounded-[calc(2rem-1px)] bg-slate-950/85 px-6 py-8 text-white backdrop-blur md:px-8">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-brand-100">
          Demo Shop
        </p>
        <h1 class="mt-3 text-4xl md:text-5xl">
          App settings
        </h1>
        <p class="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
          Manage datasets, configure each dataset, and maintain personalization data in one place.
        </p>
      </div>
    </section>

    <div class="mt-8">
      <SettingsDatasetsWorkspace />
    </div>
  </div>
</template>

<script lang="ts" setup>
import router from '@/router';
import SettingsDatasetsWorkspace from '@/components/settings/SettingsDatasetsWorkspace.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';

void init();

async function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('share')) {
        return;
    }

    let settings: IDataset;
    try {
        settings = JSON.parse(atob(params.get('share')!)) as IDataset;
    } catch {
        notificationsStore.push({ title: 'Invalid share link', text: 'The shared dataset could not be imported.' });
        return;
    }

    if (contextStore.datasets.value.every((dataset) => dataset.datasetId !== settings.datasetId)) {
        contextStore.addDataset(settings);
    } else {
        const dataset = contextStore.datasets.value.find((entry) => entry.datasetId === settings.datasetId);
        if (dataset) {
            Object.assign(dataset, settings);
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
