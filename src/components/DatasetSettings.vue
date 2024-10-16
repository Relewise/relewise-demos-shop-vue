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

        <label class="text-sm block mt-6">Languages</label>
        <template v-if="!context.allLanguages && context.language">
            <div class="flex mt-2 gap-2">
                <input v-model="context.language" type="text" placeholder="LanguageCode">
                <button class="bg-gray-500 text-white" @click="() => removeLanguage(0)">
                    Remove
                </button>
            </div>
        </template>
        <template v-else>
            <div v-for="(_, index) in context.allLanguages"
                 :key="index"
                 class="flex mt-2 gap-2">
                <input v-model="context.allLanguages[index]"
                       type="text"
                       placeholder="LanguageCode">
                <button class="bg-gray-500 text-white" @click="() => removeLanguage(index)">
                    Remove
                </button>
            </div>
        </template>
        <div class="flex mt-2 gap-2">
            <input v-model="newLanguage" type="text" placeholder="New Language">
            <button class="outline" @click="addLanguage">
                Add
            </button>
        </div>

        <label class="text-sm block mt-6">Currencies</label>
        <template v-if="!context.allCurrencies && context.currencyCode">
            <div class="flex mt-2 gap-2">
                <input v-model="context.currencyCode" type="text" placeholder="CurrencyCode">
                <button class="bg-gray-500 text-white" @click="() => removeCurrencyCode(0)">
                    Remove
                </button>
            </div>
        </template>
        <template v-else>
            <div v-for="(_, index) in context.allCurrencies"
                 :key="index"
                 class="flex mt-2 gap-2">
                <input v-model="context.allCurrencies[index]"
                       type="text"
                       placeholder="CurrencyCode">
                <button class="bg-gray-500 text-white" @click="() => removeCurrencyCode(index)">
                    Remove
                </button>
            </div>
        </template>
        <div class="flex mt-2 gap-2">
            <input v-model="newCurrencyCode" type="text" placeholder="New Currency">
            <button class="outline" @click="addCurrencyCode">
                Add
            </button>
        </div>

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
import contextStore, { type IDataset } from '@/stores/context.store';
import { ref } from 'vue';

const saved = ref(false);
const copied = ref(false);
const context = contextStore.context;
const datasets = contextStore.datasets;
const newLanguage = ref('');
const newCurrencyCode = ref('');

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
        allCurrencies: [],
        language: '',
        allLanguages: [],
        users: [],
        companies: [],
        selectedUserIndex: 0,
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
        allLanguages: context.value.allLanguages,
        allCurrencies: context.value.allCurrencies,
        serverUrl: context.value.serverUrl,
        users: context.value.users,
        companies: context.value.companies,
        selectedUserIndex: context.value.selectedUserIndex,
    };

    navigator.clipboard.writeText(window.location.href + '?share=' + encodeURIComponent(btoa(JSON.stringify(model))));
    copied.value = true;
    setTimeout(() => copied.value = false, 3000);
}

function deleteDataset() {
    const confirmed = confirm('delete dataset?');

    if (confirmed) {
        contextStore.deleteSelected();
    }
}

function addLanguage() {
    if (!newLanguage.value) return;
   
    if (!context.value.allLanguages) {
        context.value.allLanguages = context.value.language ? [context.value.language] : [];
    }

    if (!context.value.language) {
        context.value.language = newLanguage.value;
    }

    context.value.allLanguages.push(newLanguage.value);
    newLanguage.value = '';
    contextStore.persistState();
}

function addCurrencyCode() {
    if (!newCurrencyCode.value) return;
   
    if (!context.value.allCurrencies) {
        context.value.allCurrencies = context.value.currencyCode ? [context.value.currencyCode] : [];
    }

    if (!context.value.currencyCode) {
        context.value.currencyCode = newCurrencyCode.value;
    }

    context.value.allCurrencies.push(newCurrencyCode.value);
    newCurrencyCode.value = '';
    contextStore.persistState();
}

function removeLanguage(index: number) {
    if (!context.value.allLanguages) {
        context.value.allLanguages = [];
        context.value.language = '';
        contextStore.persistState();
        return;
    }

    context.value.allLanguages.splice(index, 1);
    contextStore.persistState();
}

function removeCurrencyCode(index: number) {
    if (!context.value.allCurrencies) {
        context.value.allCurrencies = [];
        context.value.currencyCode = '';
        return;
    }
    
    context.value.allCurrencies.splice(index, 1);
    contextStore.persistState();
}

</script>
