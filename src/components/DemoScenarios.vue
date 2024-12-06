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
            <div class="flex items-center mb-8">
                <button class="bg-gray-500 text-white" @click="generateNullSearcScenario">
                    Generate Null Search scenario
                </button>
            </div>
        </div>

    </div>

</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { ProductSearchBuilder, UserFactory } from '@relewise/client';

const localeMap: Record<string, { language: string; currency: string; term: string }> = {
    dk: { language: 'da-dk', currency: 'DKK', term:'belysning' },
    gb: { language: 'en-gb', currency: 'GBP', term:'lighting' },
};
const userClassifications = [{ "country": "dk", "channel": "B2C" }, { "country": "gb", "channel": "B2C" }];

async function generateSearchTermPredictions() {

    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();

    userClassifications.forEach(classification => {
        console.log(classification);
        for (let index = 0; index < 30; index++) {

            const { user, settings } = createUserAndSettings(classification);

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

    userClassifications.forEach(classification => {
        for (let index = 0; index < 30; index++) {
            const { user, settings, term } = createUserAndSettings(classification);

            const builder = new ProductSearchBuilder(settings)
                .setSelectedProductProperties({ displayName: true })
                .setTerm(term)
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

async function generateNullSearcScenario() {
    const searcher = contextStore.getSearcher();
    const tracker = contextStore.getTracker();

    const baseTerm = "somethings";
    const termVariants = Array.from({ length: baseTerm.length - 2 }, (_, i) => baseTerm.slice(0, i + 3));

    userClassifications.forEach(classification => {
        termVariants.forEach(term => {
            for (let index = 0; index < 100; index++) {
                const { user, settings } = createUserAndSettings(classification);

                const builder = new ProductSearchBuilder(settings)
                    .setSelectedProductProperties({ displayName: true })
                    .setTerm(term)
                    .pagination(
                        p => p
                            .setPageSize(100)
                            .setPage(1)
                    );

                searcher.searchProducts(builder.build());

                tracker.trackProductView({ productId: 'b2f4d740-2d93-4b5b-afb1-209e4c74a1e0', user: user }); //Dell UltraVision 4K
                tracker.trackProductView({ productId: 'ab30db73-b70f-4e31-b0d9-62a5fe22c087', user: user }); //Canon EOS M50 Mark II 
                tracker.trackProductView({ productId: 'bd7bbc98-f3cf-4205-8d24-2ae4c3fdf40a', user: user }); //Samsung SoundBooster Mini 
                tracker.trackProductView({ productId: 'a6d2f764-90b5-4cfc-a030-9e5fa0dcb6e4', user: user }); //Bose Smartband 1
                tracker.trackProductView({ productId: 'f98b4d52-8ba9-42a1-9d76-5a5abb5b1d09', user: user }); //Samsung DW60R8070BB 
                tracker.trackProductView({ productId: 'de208aea-cb04-4dd5-a290-4ef78d9829b5', user: user }); //Pro-Ject Essential III
                tracker.trackProductView({ productId: '3771701a-ef82-4a05-bc15-d83e25a7378b', user: user }); //Canon PIXMA TR8620
                tracker.trackProductView({ productId: 'e6c8d3b0-ff48-4934-97e8-dde0b6c7buns', user: user }); //Logitech MX Vertical
            }
        });
    });
}

const refreshPredictions = async () => {
    const url = "";
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


function createUserAndSettings(classification: { country: string; channel: string }) {
    const user = UserFactory.byTemporaryId(crypto.randomUUID());
    user.classifications = classification;

    const { country } = classification;
    const { language, currency, term } = localeMap[country] ?? { language: 'da-dk', currency: 'DKK', term:'belysning' };

    const settings = {
        language,
        currency,
        displayedAtLocation: '',
        user: user
    };

    return { user, settings, term };
}

// init();

</script>
