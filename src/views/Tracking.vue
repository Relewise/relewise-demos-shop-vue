<template>
    <div class="bg-white rounded p-6">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                Behavioral tracking
            </h1>
        </div>

        <label class="block mb-6 flex items-center">
            <input v-model="tracking.enabled" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
            Tracking enabled</label>

        <p>When tracking is enabled, all your actions are tracked to Relewise to give you a personal experience</p>


        <hr class="my-10">

        <label class="text-sm block">Temporary Id</label>
        <div class="flex gap-2">
            <input v-model="user.temporaryId" type="text" placeholder="Name">
            <button @click="generateId('temporary')">
                Generate
            </button>
        </div>

        <label class="text-sm block">Authenticated Id</label>
        <div class="flex gap-2">
            <input v-model="user.authenticatedId" type="text" placeholder="Name">
            <button @click="generateId('authenticated')">
                Generate
            </button>
        </div>
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
import contextStore from '@/stores/context.store';
import { UserFactory } from '@relewise/client';
import { ref } from 'vue';

const saved = ref(false);

const tracking = contextStore.tracking;
const user = ref(tracking.value.user ?? UserFactory.anonymous());

async function init() {
}

init();

function save() {
    contextStore.setUser(user.value);

    saved.value = true;
    setTimeout(() => saved.value = false, 3000);
}

function generateId(type: 'temporary' | 'authenticated') {
    const id = crypto.randomUUID();
    switch (type) {
    case 'temporary': {
        user.value.temporaryId = id;
        break;
    }
    case 'authenticated': {
        user.value.authenticatedId = id;
        break;
    }
    }
}

</script>
