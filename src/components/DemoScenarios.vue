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
                <button class="bg-gray-500 text-white"
                    @click="() => runWithLoading('term', generateSearchTermPredictions)">
                    Generate Search Term predictions
                </button>
                <template v-if="hasRun.term">
                    <div v-if="loading.term" class="spinner"></div>
                    <span v-else-if="done.term" class="status">Done!</span>
                </template>
            </div>
            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white"
                    @click="() => runWithLoading('impact', generateSearchImpactScenario)">
                    Generate Search impact scenario
                </button>
                <template v-if="hasRun.impact">
                    <div v-if="loading.impact" class="spinner"></div>
                    <span v-else-if="done.impact" class="status">Done!</span>
                </template>
            </div>
            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white"
                    @click="() => runWithLoading('null', generateNullSearchScenario)">
                    Generate Null Search scenario
                </button>
                <template v-if="hasRun.null">
                    <div v-if="loading.null" class="spinner"></div>
                    <span v-else-if="done.null" class="status">Done!</span>
                </template>
            </div>
        </div>

    </div>

</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, UserFactory } from '@relewise/client';
import { ref } from 'vue';
import { reactive } from 'vue';

const localeMap: Record<string, { language: string; currency: string; term: string }> = {
    dk: { language: 'da-dk', currency: 'DKK', term: 'belysning' },
    gb: { language: 'en-gb', currency: 'GBP', term: 'lighting' },
};
const userClassifications = [{ "country": "dk", "channel": "B2C" }, { "country": "gb", "channel": "B2C" }];

async function generateSearchTermPredictions() {
    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();
    const promises: Promise<any>[] = [];

    userClassifications.forEach(classification => {
        for (let index = 0; index < 30; index++) {
            const { user, settings } = createUserAndSettings(classification);
            const builder = new ProductSearchBuilder(settings)
                .setSelectedProductProperties({ displayName: true })
                .pagination(p => p.setPageSize(100).setPage(1));

            builder.setTerm('philips');
            promises.push(searcher.searchProducts(builder.build()));

            builder.setTerm('smart philips led');
            promises.push(searcher.searchProducts(builder.build()));
            promises.push(tracker.trackProductView({ productId: 'ce8c88e5-3be1-4d58-b4b2-dbb67ae00965', user }));

            builder.setTerm('fjernbetjent led philips');
            promises.push(searcher.searchProducts(builder.build()));
            promises.push(tracker.trackProductView({ productId: '56e901b1-e052-4997-86b0-5f338fe5a836', user }));

            builder.setTerm('remote led philips');
            promises.push(searcher.searchProducts(builder.build()));
            promises.push(tracker.trackProductView({ productId: '56e901b1-e052-4997-86b0-5f338fe5a836', user }));
        }
    });

    await Promise.all(promises);
    await refreshPresortersAndCollections();
}

async function generateSearchImpactScenario() {
    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();

    const promises: Promise<any>[] = [];

    userClassifications.forEach(classification => {
        for (let index = 0; index < 30; index++) {
            const { user, settings, term } = createUserAndSettings(classification);

            const builder = new ProductSearchBuilder(settings)
                .setSelectedProductProperties({ displayName: true })
                .setTerm(term)
                .pagination(p => p.setPageSize(100).setPage(1));

            promises.push(searcher.searchProducts(builder.build()));
            promises.push(tracker.trackProductView({ productId: 'd812cd4d-6798-4a67-9da9-1714006f7936', user }));
            promises.push(tracker.trackProductView({ productId: '23cdeaf0-d406-4c83-bc36-065d12aedd46', user }));
        }
    });

    await Promise.all(promises);
    await refreshPresortersAndCollections();
}

async function generateNullSearchScenario() {
    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();
    const promises: Promise<any>[] = [];

    const baseTerm = "somethings";
    const termVariants = Array.from({ length: baseTerm.length - 2 }, (_, i) => baseTerm.slice(0, i + 3));

    userClassifications.forEach(classification => {
        termVariants.forEach(term => {
            for (let index = 0; index < 100; index++) {
                const { user, settings } = createUserAndSettings(classification);
                const builder = new ProductSearchBuilder(settings)
                    .setSelectedProductProperties({ displayName: true })
                    .setTerm(term)
                    .pagination(p => p.setPageSize(100).setPage(1));

                promises.push(searcher.searchProducts(builder.build()));

                [
                    'b2f4d740-2d93-4b5b-afb1-209e4c74a1e0',
                    'ab30db73-b70f-4e31-b0d9-62a5fe22c087',
                    'bd7bbc98-f3cf-4205-8d24-2ae4c3fdf40a',
                    'a6d2f764-90b5-4cfc-a030-9e5fa0dcb6e4',
                    'f98b4d52-8ba9-42a1-9d76-5a5abb5b1d09',
                    'de208aea-cb04-4dd5-a290-4ef78d9829b5',
                    '3771701a-ef82-4a05-bc15-d83e25a7378b',
                    'e6c8d3b0-ff48-4934-97e8-dde0b6c7buns'
                ].forEach(productId => {
                    promises.push(tracker.trackProductView({ productId, user }));
                });
            }
        });
    });

    await Promise.all(promises);
    await refreshPresortersAndCollections();
}

const refreshPresortersAndCollections = async () => {
    const url = "";
    try {
        const response = await fetch('https://cdn.relewise.com/relewisedemoshop-1131137e-b167-48e2-90a4-e7981e0dc391/production/tools/rebuild/' + contextStore.context.value.datasetId, { method: 'POST', body: null });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Error calling API:', error);
    }
};


function createUserAndSettings(classification: { country: string; channel: string }) {
    const user = UserFactory.byTemporaryId(crypto.randomUUID());
    user.classifications = classification;

    const { country } = classification;
    const { language, currency, term } = localeMap[country] ?? { language: 'da-dk', currency: 'DKK', term: 'belysning' };

    const settings = {
        language,
        currency,
        displayedAtLocation: '',
        user: user
    };

    return { user, settings, term };
}



const loading = reactive({
  term: false,
  impact: false,
  null: false,
});

const done = reactive({
  term: false,
  impact: false,
  null: false,
});

const hasRun = reactive({
  term: false,
  impact: false,
  null: false,
});

async function runWithLoading(type: 'term' | 'impact' | 'null', fn: () => Promise<void>) {
  loading[type] = true;
  done[type] = false;
  hasRun[type] = true;

  await fn();

  loading[type] = false;
  done[type] = true;
}

// init();

</script>

<style scoped>
.spinner {
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
    margin-left: 8px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.status {
    color: green;
    margin-left: 8px;
}
</style>