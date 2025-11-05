<template>
    <div>
        <div class="shadow rounded overflow-hidden hover:shadow-lg transition duration-200 cursor-pointer flex flex-col"
            @click="clicked">
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
import { ChevronRightIcon } from '@heroicons/vue/24/outline';
import type { RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';
import { handleClick } from './handleClick';

const props = defineProps<{ displayAd: RetailMediaResultPlacementResultEntityDisplayAd }>();

const clicked = () => {
    handleClick(props.displayAd);
};
</script>