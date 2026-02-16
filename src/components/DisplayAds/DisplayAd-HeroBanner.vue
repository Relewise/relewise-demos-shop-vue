<template>
    <div v-if="model.result?.data?.ImageUrl?.value"
        class="rounded shadow overflow-hidden mb-4 cursor-pointer hover:shadow-lg" @click="clicked">
        <img :src="model.result?.data.ImageUrl.value"></img>
    </div>
</template>

<script setup lang="ts">
import type { RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';
import { handleClick } from './handleClick';

const model = defineModel<RetailMediaResultPlacementResultEntityDisplayAd>({
    required: true
});

const clicked = () => {
    handleClick(model.value);
};
</script>