<template>
    <div class="bg-white rounded p-6">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                Behavioral tracking
            </h1>
        </div>

        <label class="block mb-6 items-center">
            <input v-model="tracking.enabled" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
            Tracking enabled</label>

        <p>When tracking is enabled, all your actions are tracked to Relewise to give you a personal experience</p>

        <hr class="mb-6">

        <div class="flex gap-3 items-center">
            <button class="bg-gray-500 text-white" @click="addEmptyUser">
                Add new user
            </button>
            <template v-if="dataset.users && dataset.users?.length > 1">
                <div class="flex-grow">
                    <label class="text-sm block">Select user</label>
                    <select :value="JSON.stringify(user)"
                            class="mb-6"
                            @change="setUser((JSON.parse(($event.target as HTMLInputElement).value) as User))">
                        <option v-for="(userOption, index) in dataset.users" :key="index" :value="JSON.stringify(userOption)">
                            {{ userOption.temporaryId }} ({{ userOption.email }})
                        </option>
                    </select>
                </div>

                <div>
                    <button class="bg-gray-500 text-white" @click="deleteUser">
                        Delete selected user
                    </button>
                </div>
            </template>
        </div>

        <label class="text-sm block">Temporary Id</label>
        <div class="flex gap-2">
            <input v-if="user" v-model="user.temporaryId" type="text" placeholder="Temporary Id">
            <button class="bg-gray-500 text-white" @click="generateId('temporary')">
                Generate
            </button>
        </div>

        <label class="text-sm block mt-6">Authenticated Id</label>
        <div class="flex gap-2">
            <input v-if="user" v-model="user.authenticatedId" type="text" placeholder="Authenticated Id">
            <button class="bg-gray-500 text-white" @click="generateId('authenticated')">
                Generate
            </button>
        </div>

        <label class="text-sm block mt-6">Email</label>
        <div class="flex gap-2">
            <input v-if="user" v-model="user.email" type="text" placeholder="Email">
        </div>

        <label class="text-sm block mt-6">Classifications</label>
        <div v-if="user" class="flex flex-col gap-4">
            <div v-for="(value, key) in user.classifications" :key="key" class="flex gap-4">
                <input :value="key" type="text" placeholder="Key" disabled>
                <input :value="value" type="text" placeholder="Value" disabled>
                <button class="bg-gray-500 text-white" @click="removeClassification(key)">
                    x
                </button>
            </div>
            <div class="flex gap-4">
                <input v-model="newClassificationKey" type="text" placeholder="Key">
                <input v-model="newClassificationValue" type="text" placeholder="Value">
                <button class="bg-gray-500 text-white" @click="addClassification">
                    +
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
    </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { UserFactory, type User } from '@relewise/client';
import { ref } from 'vue';
import basketService from '@/services/basket.service';

const saved = ref(false);

const tracking = contextStore.tracking;
const dataset = contextStore.context;
const user = contextStore.user;
const newClassificationKey = ref('');
const newClassificationValue = ref('');


function save() {
    contextStore.persistState();

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

function setUser(userToSet: User) {
    contextStore.setUser(userToSet);
    basketService.clear();

    window.location.reload();
}

function addEmptyUser() {
    const newEmptyUser = UserFactory.anonymous();

    if (!dataset.value.users)
        dataset.value.users = [];

    dataset.value.users.push(newEmptyUser);

    setUser(newEmptyUser);
}

function deleteUser() {
    const confirmed = confirm('delete user?');

    if (confirmed) {
        contextStore.deleteSelectedUser();
    }
}

function addClassification() {
    if (!user.value.classifications) 
        user.value.classifications = {};

    user.value.classifications[newClassificationKey.value] = newClassificationValue.value;

    newClassificationKey.value = '';
    newClassificationValue.value = '';
}

function removeClassification(key: string) {
    if (!user.value.classifications) 
        return;

    delete user.value.classifications[key];
}

</script>
