<template>
    <div class="bg-white rounded p-6">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                Settings
            </h1>
        </div>

        <template v-if="datasets.length > 1">
            <div class="flex gap-3 items-center">
                <button class="bg-gray-500 text-white" @click="addEmptyDataset">
                    Add new dataset
                </button>
                <div class="flex-grow">
                    <label class="text-sm block">Select dataset</label>
                    <select :value="context.datasetId"
                            class="mb-6"
                            @change="setDataset(($event.target as HTMLInputElement).value)">
                        <option v-for="dataset in datasets" :key="dataset.datasetId" :value="dataset.datasetId">
                            {{ dataset.displayName }} ({{ dataset.datasetId }})
                        </option>
                    </select>
                </div>

                <div>
                    <button v-if="datasets.length > 1" class="bg-gray-500 text-white" @click="deleteDataset">
                        Delete selected dataset
                    </button>
                </div>
            </div>

            <hr class="mb-6">
        </template>
        <template v-else>
            <button class="bg-gray-500 text-white" @click="addEmptyDataset">
                Add new dataset
            </button>
        </template>

        <label class="text-sm block">Name</label>
        <input v-model="context.displayName" type="text" placeholder="Name">

        <label class="text-sm block mt-6">Dataset Id</label>
        <input v-model="context.datasetId" type="text" placeholder="Dataset id">

        <label class="text-sm  block mt-6">API Key</label>
        <input v-model="context.apiKey" type="text" placeholder="Api key">

        <label class="text-sm  block mt-6">Language</label>
        <input v-model="context.language" type="text" placeholder="LanguageCode">

        <label class="text-sm block mt-6">Currency</label>
        <input v-model="context.currencyCode" type="text" placeholder="CurrencyCode">

        <label class="text-sm block mt-6">Server url</label>
        <input v-model="context.serverUrl" type="text" placeholder="Server Url">

        <div class="flex mt-4 gap-3">
            <button class="bg-gray-500 text-white" @click="shareLink">
                Get share link
            </button>

            <span v-if="copied" class="ml-4 text-green-600">
                Copied!
            </span>
        </div>

        <hr class="my-10">

        <div>
            <button class="" @click="save">
                Save
            </button>

            <span v-if="saved" class="ml-4 text-green-600">
                Settings have been saved.
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import router from '@/router';
import basketService from '@/services/basket.service';
import contextStore, { type IDataset } from '@/stores/context.store';
import { ref } from 'vue';

const saved = ref(false);
const copied = ref(false);
const context = contextStore.context;
const datasets = contextStore.datasets;

async function init() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('share')) {
        const parsedFromUrl = atob(params.get('share')!);
        const settings = JSON.parse(parsedFromUrl);

        if (datasets.value.every(x => x.datasetId !== settings.datasetId)) {
            contextStore.addDataset(settings);
            contextStore.persistState();
        }
        else {
            contextStore.setDataset(settings.datasetId);
        }

        const url = new URL(window.location.href);
        url.searchParams.delete('share');
        history.replaceState(null, '', url);

        // reload to get navigation
        await router.push('/');
        window.location.reload();
    }
}

init();

function setDataset(datasetId: string) {
    contextStore.setDataset(datasetId);
    basketService.clear();

    window.location.reload();
}

function save() {
    contextStore.persistState();

    saved.value = true;
    setTimeout(() => saved.value = false, 3000);
}

function addEmptyDataset() {
    contextStore.addDataset({
        displayName: '',
        apiKey: '',
        datasetId: '',
        currencyCode: '',
        language: '',
        users: [],
        companies: [],
        selectedUserIndex: 0,
        selectedCompanyIndex: 0,
    });

    contextStore.setDataset('');
}

function shareLink() {

    const model: IDataset = {
        displayName: context.value.displayName,
        apiKey: context.value.apiKey,
        datasetId: context.value.datasetId,
        currencyCode: context.value.currencyCode,
        language: context.value.language,
        serverUrl: context.value.serverUrl,
        users: context.value.users,
        companies: context.value.companies,
        selectedUserIndex: context.value.selectedUserIndex,
        selectedCompanyIndex: context.value.selectedCompanyIndex,
    };

    navigator.clipboard.writeText(window.location.href + '?share=' + btoa(JSON.stringify(model)));
    copied.value = true;
    setTimeout(() => copied.value = false, 3000);
}

function deleteDataset() {
    const confirmed = confirm('delete dataset?');

    if (confirmed) {
        contextStore.deleteSelected();
    }
}

</script>
