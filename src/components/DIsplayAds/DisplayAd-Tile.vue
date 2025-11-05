<template>
    <div>
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
    </div>
</template>

<script setup lang="ts">
import router from '@/router';
import contextStore from '@/stores/context.store';
import { ChevronRightIcon } from '@heroicons/vue/24/outline';
import type { RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';
import { computed } from 'vue';

const props = defineProps<{ displayAd: RetailMediaResultPlacementResultEntityDisplayAd }>();

const isExternalUrl = computed(() => {
    const url = props.displayAd.result.data?.Link?.value || '/';
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {

        new URL(url);
        return true;
    } catch {
        return false;
    }
});

async function handleClick() {
    const tracker = contextStore.getTracker();

    await tracker.trackDisplayAdClick({
        displayAdId: props.displayAd.result.displayAdId!,
        campaignId: props.displayAd.campaignId,
        user: contextStore.user.value,
    });

    if (isExternalUrl.value) {
        window.location.href = props.displayAd.result.data?.Link?.value;
        return;
    } else {
        router.push(props.displayAd.result.data?.Link?.value || '/');
    }
}
</script>