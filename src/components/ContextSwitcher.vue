<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { displayUser } from '@/helpers/userHelper';
import type { User } from '@relewise/client';

const user = contextStore.user;
const context = contextStore.context;
const datasets = contextStore.datasets;

function setDataset(datasetId: string) {
    contextStore.setDataset(datasetId);
    window.location.reload();
}

function setUser(userToSet: User) {
    contextStore.setUser(userToSet);
}

</script>

<template>
    <div class="flex flex-col">
        <div class="font-semibold px-2 bg-gray-100 py-2">
            Switch Context
        </div>
        <hr class="p-0 my-0">
        <div class="p-2">
            <div class="flex-grow">
                <label class="text-sm block">Dataset</label>
                <select :value="context.datasetId"
                        class="mb-6"
                        @change="setDataset(($event.target as HTMLInputElement).value)">
                    <option v-for="dataset in datasets" :key="dataset.datasetId" :value="dataset.datasetId">
                        {{ dataset.displayName }}
                    </option>
                </select>
            </div>
            <div class="flex-grow">
                <label class="text-sm block">User</label>
                <select :value="JSON.stringify(user)"
                        class="mb-6"
                        @change="setUser((JSON.parse(($event.target as HTMLInputElement).value) as User))">
                    <option v-for="(userOption, index) in context.users"
                            :key="index"
                            :value="JSON.stringify(userOption)">
                        {{ displayUser(userOption) }}
                    </option>
                </select>
            </div>
        </div>
    </div>
</template>
