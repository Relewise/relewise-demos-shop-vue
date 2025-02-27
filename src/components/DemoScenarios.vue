<template>
    <div class="bg-white rounded py-6">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                Demo Scenarios
            </h1>
        </div>

        <div>
            <h2>
                Demo handling
            </h2>

            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white" @click="generateSearchTermPredictions">
                    Generate Search Term predictions
                </button>
            </div>
            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white" @click="generateSearchImpactScenario">
                    Generate Search impact scenario
                </button>
            </div>
            <!-- <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white"
                        @click="generateSearchImpactScenario">
                        Setup and configure demo
                </button>
            </div>
            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white"
                        @click="generateSearchImpactScenario">
                        Refresh demo order data
                </button>
            </div>
            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white"
                        @click="generateSearchImpactScenario">
                        Refresh demo product data
                </button>
            </div>                         -->
        </div>

    </div>

</template>

<script lang="ts" setup>
import router from '@/router';
import contextStore, { type IDataset } from '@/stores/context.store';
import { ProductSearchBuilder, UserFactory } from '@relewise/client';
import type { ClassificationType } from 'typescript';
import { ref } from 'vue';

const saved = ref(false);
const copied = ref(false);
const context = contextStore.context;
const datasets = contextStore.datasets;



async function init() {
}

async function generateSearchTermPredictions() {

    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();
    const userClassifications = [{ "country": "dk", "channel": "B2C" }, { "country": "gb", "channel": "B2C" }];


    userClassifications.forEach(classification => {
        for (let index = 0; index < 30; index++) {
            //generate user, temporary ID + classifications
            const userClassifications = { "country": "dk", "channel": "B2C" }
            const user = UserFactory.byTemporaryId(crypto.randomUUID());
            user.classifications = classification;

            const settings = {
                language: 'da-dk',
                currency: 'DKK',
                displayedAtLocation: '',
                user: user
            };

            const builder = new ProductSearchBuilder(settings)
                .setSelectedProductProperties({ displayName: true })
                .setTerm('philips')
                .pagination(
                    p => p
                        .setPageSize(100)
                        .setPage(1)
                )

            searcher.searchProducts(builder.build());

            builder.setTerm("smart philips led")
            searcher.searchProducts(builder.build());
            tracker.trackProductView({ productId: 'ce8c88e5-3be1-4d58-b4b2-dbb67ae00965', user: user });

            builder.setTerm("fjernbetjent led philips")
            searcher.searchProducts(builder.build());
            tracker.trackProductView({ productId: '56e901b1-e052-4997-86b0-5f338fe5a836', user: user });

            builder.setTerm("remote led philips")
            searcher.searchProducts(builder.build());
            tracker.trackProductView({ productId: '56e901b1-e052-4997-86b0-5f338fe5a836', user: user });

        }
    });
    await refreshPredictions();

}

async function generateSearchImpactScenario() {
    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();
    const userClassifications = [{ "country": "dk", "channel": "B2C" }, { "country": "gb", "channel": "B2C" }];

    userClassifications.forEach(classification => {
        for (let index = 0; index < 30; index++) {
            const user = UserFactory.byTemporaryId(crypto.randomUUID());
            user.classifications = classification;

            const settings = {
                language: 'da-dk',
                currency: 'DKK',
                displayedAtLocation: '',
                user: user
            };

            const builder = new ProductSearchBuilder(settings)
                .setSelectedProductProperties({ displayName: true })
                .setTerm('belysning')
                .pagination(
                    p => p
                        .setPageSize(100)
                        .setPage(1)
                )

            searcher.searchProducts(builder.build());

            tracker.trackProductView({ productId: 'd812cd4d-6798-4a67-9da9-1714006f7936', user: user });
            tracker.trackProductView({ productId: '23cdeaf0-d406-4c83-bc36-065d12aedd46', user: user });
        }
    });
}


const refreshPredictions = async () => {
    const url = `https://sandbox-api.relewise.com/${contextStore.context.value.datasetId}/tools/RebuildSearchPredictionCaches?datasetId=${contextStore.context.value.datasetId}&rebuildEvenIfNotStale=true`;

    try {
        const response = await fetch(url, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // const data = await response.json();
        // console.log(data);
    } catch (error) {
        console.error('Error calling API:', error);
    }
};

// init();

</script>
