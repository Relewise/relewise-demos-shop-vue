<template>
    <div v-if="model.result?.data?.ImageUrl?.value"
        class="rounded shadow overflow-hidden mb-4 cursor-pointer hover:shadow-lg" @click="handleClick">
        <img :src="model.result?.data.ImageUrl.value"></img>
    </div>
</template>

<script setup lang="ts">
import router from '@/router';
import contextStore from '@/stores/context.store';
import type { RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';

const model = defineModel<RetailMediaResultPlacementResultEntityDisplayAd>({
    required: true
});

async function handleClick() {
    const tracker = contextStore.getTracker();

    await tracker.trackDisplayAdClick({
        displayAdId: model.value.result.displayAdId!,
        campaignId: '512d82f6-8475-4098-b327-c9d3bbfca580',
        user: contextStore.user.value,
    });
    router.push(model.value.result.data?.Link?.value || '/');
}

</script>