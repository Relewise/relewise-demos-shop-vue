<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section class="overflow-hidden rounded-[2rem] bg-gradient p-[1px] shadow-lg">
      <div class="rounded-[calc(2rem-1px)] bg-slate-950/85 px-6 py-8 text-white backdrop-blur md:px-8">
        <div>
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-brand-100">
              Demo Shop
            </p>
            <h1 class="mt-3 text-4xl md:text-5xl">
              App settings
            </h1>
            <p class="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
              Manage datasets, dataset behavior, and personalization in one place without mixing creation, selection, and editing flows.
            </p>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <button
            v-for="workspace in workspaces"
            :key="workspace.id"
            type="button"
            class="rounded-full border px-5 py-2 text-sm font-semibold transition"
            :disabled="workspace.requiresDataset && !hasActiveDataset"
            :class="workspace.requiresDataset && !hasActiveDataset
              ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500 opacity-60'
              : activeWorkspace === workspace.id
                ? 'border-brand-300 bg-brand-500 text-white'
                : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10'"
            @click="openWorkspace(workspace.id)"
          >
            {{ workspace.label }}
          </button>

          <button
            class="ml-auto"
            :disabled="!hasActiveDataset"
            :class="!hasActiveDataset ? 'cursor-not-allowed opacity-60' : ''"
            @click="shareDataset"
          >
            Share dataset
          </button>

          <span
            v-if="copied"
            class="text-sm text-brand-100"
          >
            Share link copied.
          </span>
        </div>
      </div>
    </section>

    <div class="mt-8">
      <SettingsDatasetsWorkspace
        v-if="activeWorkspace === 'datasets'"
        @dataset-selected="handleDatasetSelected"
      />
      <SettingsDatasetConfiguration v-else-if="activeWorkspace === 'configuration'" />
      <Personalisation v-else-if="hasActiveDataset" />
      <SettingsDatasetsWorkspace
        v-else
        @dataset-selected="handleDatasetSelected"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import router from '@/router';
import Personalisation from '@/components/Personalisation.vue';
import SettingsDatasetConfiguration from '@/components/settings/SettingsDatasetConfiguration.vue';
import SettingsDatasetsWorkspace from '@/components/settings/SettingsDatasetsWorkspace.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import { computed, ref, watch } from 'vue';

type WorkspaceId = 'datasets' | 'configuration' | 'personalization';

const context = computed(() => contextStore.context.value);
const hasActiveDataset = computed(() => contextStore.hasActiveDataset.value);
const tracking = contextStore.tracking;
const copied = ref(false);
const activeWorkspace = ref<WorkspaceId>('datasets');
const workspaces: Array<{ id: WorkspaceId; label: string; requiresDataset: boolean }> = [
    { id: 'datasets', label: 'Datasets', requiresDataset: false },
    { id: 'configuration', label: 'Dataset Configuration', requiresDataset: true },
    { id: 'personalization', label: 'Personalization', requiresDataset: true },
];

void init();

watch(hasActiveDataset, (nextHasActiveDataset) => {
    if (!nextHasActiveDataset) {
        activeWorkspace.value = 'datasets';
    }
});

async function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('share')) {
        return;
    }

    let settings: IDataset;
    try {
        const parsedFromUrl = atob(params.get('share')!);
        settings = JSON.parse(parsedFromUrl) as IDataset;
    } catch {
        return;
    }

    if (contextStore.datasets.value.every((dataset) => dataset.datasetId !== settings.datasetId)) {
        contextStore.addDataset(settings);
        contextStore.persistState();
    } else {
        contextStore.setDataset(settings.datasetId);
        if (context.value) {
            context.value.apiKey = settings.apiKey;
            Object.assign(context.value, settings);
        }
        contextStore.persistState();
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    history.replaceState(null, '', url);

    activeWorkspace.value = 'configuration';
    await router.push('/app-settings');
    window.location.reload();
}

function shareDataset() {
    if (!context.value) {
        return;
    }

    const model: IDataset = {
        ...context.value,
    };

    const shareUrl = new URL('/app-settings', window.location.origin);
    shareUrl.searchParams.set('share', btoa(JSON.stringify(model)));
    navigator.clipboard.writeText(shareUrl.toString());
    copied.value = true;
    setTimeout(() => {
        copied.value = false;
    }, 3000);
}

function handleDatasetSelected() {
    activeWorkspace.value = 'configuration';
}

function openWorkspace(workspaceId: WorkspaceId) {
    const workspace = workspaces.find((entry) => entry.id === workspaceId);
    if (!workspace) {
        return;
    }

    if (workspace.requiresDataset && !hasActiveDataset.value) {
        activeWorkspace.value = 'datasets';
        return;
    }

    activeWorkspace.value = workspaceId;
}
</script>
