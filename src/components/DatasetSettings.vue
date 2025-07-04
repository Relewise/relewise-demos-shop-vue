<template>
    <div class="bg-white rounded py-6">
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

        <ListValues label="Languages"
                    :items="context.allLanguages"
                    :single-item="context.language"
                    input-placeholder="LanguageCode"
                    new-item-placeholder="New Language"/>

        <ListValues label="Currencies"
                    :items="context.allCurrencies"
                    :single-item="context.currencyCode"
                    input-placeholder="CurrencyCode"
                    new-item-placeholder="New Currency"/>

        <label class="text-sm block mt-6">Server url</label>
        <input v-model="context.serverUrl" type="text" placeholder="Server Url">

        <hr class="my-8">

        <h2 class="text-2xl mb-6">
            Features
        </h2>

        <div class="pl-8 flex flex-col gap-6">
            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.allowThirdLevelCategories"
                           class="accent-brand-500 mr-3 h-5 w-5"
                           type="checkbox">
                    Third level categories</label>

                <p class="text-gray-500 text-sm mt-1">
                    When third level categories are enabled, category links will also be rendered on the PLP's of
                    categories
                    with parents.<br>
                    This will allow users to navigate to a PLP of third level category.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.hideSoldOutProducts" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
                    Hide <span class="font-medium px-1">Sold out</span> in recommendations</label>

                <p class="text-gray-500 text-sm mt-1">
                    Hide Products with a 'SoldOut' datakey in recommendations.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.userClassificationFilters" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
                    Hide products not available for the user's <code class="px-1">country</code> or <code class="px-1">channel</code> classification
                </label>
                <p class="text-gray-500 text-sm mt-1">
                    We base the filters on the product's <code>AvailableInMarkets</code> and <code>AvailableInChannels</code> data keys.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.showProductRelevanceScore" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
                    Show Product Relevance Score in Search</label>

                <p class="text-gray-500 text-sm mt-1">
                    This will show the product relevance score in search. This can be helpful when showcasing Quality Score Thresholds for Retail Media, as it allows you to see the score and it's therefore easier to set the correct threshold.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.B2bRecommendations" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
                    Enable B2B recommendations</label>

                <p class="text-gray-500 text-sm mt-1">
                    This will replace the recommendation on the cart page with popular products for category with id '3_5'.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.showVariantsBadge" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
                    Show variants badge</label>

                <p class="text-gray-500 text-sm mt-1">
                    This will add a badge to product tiles when the product has variants available.
                </p>
            </div>
            
            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.similarProductsOnPdp" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
                    Similar products recommendation on PDP</label>

                <p class="text-gray-500 text-sm mt-1">
                    This will replace the recommendation on the PDP with a similar products recommendation with a specific category id filter when the product is sold out.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.switchOnVariantBasedSearchDisplay"
                           class="accent-brand-500 mr-3 h-5 w-5"
                           type="checkbox">
                    Turn on the variant based search overlay</label>

                <p class="text-gray-500 text-sm mt-1">
                    When this overlay is enabled, a different UI will be used. This overlay is focused on the display of variants in the search result. 
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    <input v-model="context.contentSearch"
                           class="accent-brand-500 mr-3 h-5 w-5"
                           type="checkbox">
                    Content Search</label>

                <p class="text-gray-500 text-sm mt-1">
                    When this is enabled content will be able to be searched for on the search overlay. 
                </p>
            </div>

            <div>
                <label class="text-sm block mt-6">Set 'Minutes ago' used for recommendations</label>
                <input v-model="context.recommendationsMinutesAgo" type="text">
                <p class="text-gray-500 text-sm mt-1">
                    Default is 14 days.
                </p>
            </div>

            <div>
                <label class="flex mt-2 items-center">
                    UTM-based Product Boosting
                </label>

                <p class="text-gray-500 text-sm mt-1">
                    Automatically boosts specific products in search results and product listings based on UTM parameters in the URL:
                    <br><br>
                    • When UTM value is <code>promoted</code>: Products with the Data Key "Promoted" as <code>true</code> will receive a 50% relevance boost
                    <br>
                    • For all other UTM values: Products with matching campaign IDs in Data Key <code>campaignIds</code> will receive a 50% relevance boost
                    <br><br>
                    Supported UTM parameters: <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_term</code>, <code>utm_content</code>
                </p>
            </div>
        </div>

        <hr class="my-8">

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
import ListValues from './ListValues.vue';

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
        allowThirdLevelCategories: context.value.allowThirdLevelCategories,
        hideSoldOutProducts: context.value.hideSoldOutProducts,
        userClassificationFilters: context.value.userClassificationFilters,
        recommendationsMinutesAgo: context.value.recommendationsMinutesAgo,
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

</script>