<template>
    <div class="shadow rounded overflow-hidden hover:shadow-lg transition duration-200 cursor-pointer flex flex-col"
        @click="handleClick">
        <div v-if="displayAd.result?.data?.ImageUrl?.value" class="w-full flex justify-center bg-gray-50">
            <img :src="displayAd.result?.data.ImageUrl.value"></img>
        </div>

        <div class="flex items-end gap-2 p-2 leading-none w-full grow " v-if="displayAd.result?.data?.Title?.value">
            <div class="flex items-center gap-2 w-full justify-between">
                <span class="font-semibold">
                    {{ displayAd.result?.data?.Title?.value }}
                </span>
                <ChevronRightIcon class="h-4 text-neutral-400"></ChevronRightIcon>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import router from '@/router';
import contextStore from '@/stores/context.store';
import { ChevronRightIcon } from '@heroicons/vue/24/outline';
import type { RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';

const props = defineProps<{ displayAd: RetailMediaResultPlacementResultEntityDisplayAd }>();

async function handleClick() {
    const tracker = contextStore.getTracker();

    await tracker.trackDisplayAdClick({
        displayAdId: props.displayAd.result.displayAdId!,
        campaignId: '512d82f6-8475-4098-b327-c9d3bbfca580',
        user: contextStore.user.value,
    });

    router.push(props.displayAd.result.data?.Link?.value || '/');
}

</script>