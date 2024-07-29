<template>
    <div class="bg-white rounded p-6">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                Behavioral tracking
            </h1>
        </div>

        <label class="flex mb-2 items-center">
            <input v-model="tracking.enabled" class="accent-brand-500 mr-3 h-5 w-5" type="checkbox">
            Tracking enabled</label>

        <p class="text-gray-400">
            When tracking is enabled, all your actions are tracked to Relewise to give you a personal experience
        </p>
    </div>

    <div class="bg-white rounded p-6 mt-6">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                User
            </h1>
        </div>

        <template v-if="dataset.users && dataset.users?.length > 1">
            <div class="flex gap-3 items-center">
                <button class="bg-gray-500 text-white" @click="addEmptyUser">
                    Add new user
                </button>
                <div class="flex-grow">
                    <label class="text-sm block">Select user</label>
                    <select :value="JSON.stringify(user)"
                            class="mb-6"
                            @change="setUser((JSON.parse(($event.target as HTMLInputElement).value) as User))">
                        <option v-for="(userOption, index) in dataset.users"
                                :key="index"
                                :value="JSON.stringify(userOption)">
                            {{ displayUser(userOption) }}
                        </option>
                    </select>
                </div>

                <div>
                    <button class="bg-gray-500 text-white" @click="deleteUser">
                        Delete selected user
                    </button>
                </div>
            </div>
            <hr class="mb-6">
        </template>
        <template v-else>
            <div class="flex gap-3 items-center">
                <button class="bg-gray-500 text-white" @click="addEmptyUser">
                    Add new user
                </button>
            </div>
        </template>


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

        <template v-if="user">
            <KeyValues v-model="classifications" title="Classifications"/>

            <KeyValues v-model="identifiers" title="Identifiers"/>

            <KeyValues v-model="data" title="Data"/>
        </template>

        <label class="text-sm block mt-6">Select company</label>
        <select :value="user.company?.id"
                class="mb-6"
                :disabled="!dataset.companies || dataset.companies.length < 1"
                @change="setUserCompany(($event.target as HTMLInputElement).value)">
            <option value="">
                {{ dataset.companies && dataset.companies.length > 0 ? "No company assigned" : "No companies exist" }}
            </option>
            <option v-for="(userCompanyOption, index) in dataset.companies" :key="index" :value="userCompanyOption.id">
                {{ userCompanyOption.id }}
            </option>
        </select>

        <div v-if="errors.length > 0">
            <ul class="bg-red-100 text-red-900 px-3 py-1.5 rounded">
                <li v-for="msg in errors" :key="msg">
                    {{ msg }}
                </li>
            </ul>
        </div>

        <div class="mt-6">
            <button @click="saveUser">
                Save user
            </button>

            <span v-if="savedUser" class="ml-4 text-green-600">
                User has been saved.
            </span>
        </div>
    </div>

    <div class="bg-white rounded p-6 mt-4">
        <div class="flex items-center mb-8">
            <h1 class="text-4xl">
                Company
            </h1>
        </div>

        <div class="flex gap-3 items-center">
            <button v-if="dataset.companies && dataset.companies.length > 0"
                    class="bg-gray-500 text-white"
                    @click="addEmptyCompany">
                Add new company
            </button>
            <template v-if="dataset.companies && dataset.companies?.length > 0">
                <div class="flex-grow">
                    <label class="text-sm block">Select company</label>
                    <select :value="company?.id"
                            class="mb-6"
                            @change="setCompany(($event.target as HTMLInputElement).value)">
                        <option v-for="(companyOption, index) in dataset.companies"
                                :key="index"
                                :value="companyOption.id">
                            {{ companyOption.id }}
                        </option>
                    </select>
                </div>

                <div>
                    <button class="bg-gray-500 text-white" @click="deleteCompany">
                        Delete selected company
                    </button>
                </div>
            </template>
        </div>

        <hr class="mb-6">

        <label class="text-sm block">Id</label>
        <div class="flex gap-2">
            <input v-if="company" v-model="company.id" type="text" placeholder="Id">
            <button class="bg-gray-500 text-white" @click="generateId('companyId')">
                Generate
            </button>
        </div>

        <div class="mt-6">
            <label class="text-sm block">Select parent company</label>
            <select :value="company?.parent?.id"
                    :disabled="!dataset.companies || dataset.companies.length < 2"
                    class="mb-6"
                    @change="setParentCompany(($event.target as HTMLInputElement).value)">
                <option value="" disabled selected>
                    {{ dataset.companies && dataset.companies.length > 1 ? "Select a company" : "No other companies" }}
                </option>
                <option v-for="(parentCompanyOption, index) in dataset.companies?.filter(x => x.id !== company.id)"
                        :key="index"
                        :value="parentCompanyOption.id">
                    {{ parentCompanyOption.id }}
                </option>
            </select>
        </div>

        <div>
            <button @click="saveCompany">
                Save company
            </button>

            <span v-if="savedCompany" class="ml-4 text-green-600">
                Company has been saved.
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import contextStore from '@/stores/context.store';
import { DataValueFactory, UserFactory, type Company, type DataValue, type User } from '@relewise/client';
import { ref } from 'vue';
import basketService from '@/services/basket.service';
import KeyValues from '@/components/KeyValues.vue';
import { displayUser } from '@/helpers/userHelper';

const tracking = contextStore.tracking;
const dataset = contextStore.context;
const user = contextStore.user;

const savedUser = ref(false);
const savedCompany = ref(false);

const classifications = ref(Object.keys(user.value.classifications ?? {}).map(x => ({ key: x, value: user.value.classifications![x] ?? null })));
const identifiers = ref(Object.keys(user.value.identifiers ?? {}).map(x => ({ key: x, value: user.value.identifiers![x] ?? null })));
const data = ref(Object.keys(user.value.data ?? {}).map(x => ({ key: x, value: (user.value.data && user.value.data[x].type === 'String')  ? user.value.data[x].value as string : null })));
const errors = ref<string[]>([]);
const company = ref<Company>(dataset.value.companies?.length === 1 ? dataset.value.companies[0] : { id: '' });

function generateId(type: 'temporary' | 'authenticated' | 'companyId') {
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
    case 'companyId': {
        if (!company.value)
            company.value = { id: '' };

        company.value.id = id;
        break;
    }
    }
}

function saveUser() {
    errors.value = [];
    if (classifications.value.some(x => !x.key || !x.value)) {
        errors.value.push('You must provide a key and value for all classifications');
    }
    if (identifiers.value.some(x => !x.key || !x.value)) {
        errors.value.push('You must provide a key and value for all identifiers');
    }
    if (data.value.some(x => !x.key || !x.value)) {
        errors.value.push('You must provide a key and value for all data elements');
    }
    if (errors.value.length > 0) {
        return;
    }

    user.value.classifications = classifications.value.reduce((a, b) => {
        a[b.key] = b.value;
        return a;
    }, {} as Record<string, string | null>);

    user.value.identifiers = identifiers.value.reduce((a, b) => {
        a[b.key] = b.value;
        return a;
    }, {} as Record<string, string | null>);

    user.value.data = data.value.reduce((a, b) => {
        a[b.key] = DataValueFactory.string(b.value ?? '');
        return a;
    }, {} as Record<string, DataValue>);

    contextStore.persistState();
    savedUser.value = true;
    setTimeout(() => savedUser.value = false, 3000);
}

function setUser(userToSet: User) {
    contextStore.setUser(userToSet);

    classifications.value = Object.keys(user.value.classifications ?? {}).map(x => ({ key: x, value: user.value.classifications![x] ?? null }));
    identifiers.value = Object.keys(user.value.identifiers ?? {}).map(x => ({ key: x, value: user.value.identifiers![x] ?? null }));
    data.value = Object.keys(user.value.data ?? {}).map(x => ({ key: x, value: (user.value.data && user.value.data[x].type === 'String')  ? user.value.data[x].value as string : null }));

    basketService.clear();
}

function addEmptyUser() {
    const newEmptyUser = UserFactory.anonymous();

    if (!dataset.value.users)
        dataset.value.users = [];

    dataset.value.users.push(newEmptyUser);

    setUser(newEmptyUser);
}

function deleteUser() {
    const confirmed = confirm('Delete user?');

    if (confirmed) {
        contextStore.deleteSelectedUser();
    }
}

function setUserCompany(companyToSet: string) {
    const selectedCompany = dataset.value.companies?.find(x => x.id === companyToSet);
    user.value.company = selectedCompany;
}

function setCompany(companyToSet: string) {
    const selectedCompany = dataset.value.companies?.find(x => x.id === companyToSet);

    if (selectedCompany)
        company.value = selectedCompany;
}

function setParentCompany(companyToSet: string) {
    const selectedCompany = dataset.value.companies?.find(x => x.id === companyToSet);

    if (selectedCompany)
        company.value.parent = selectedCompany;
}

function saveCompany() {
    if (!dataset.value.companies)
        dataset.value.companies = [];

    if (!company.value || !company.value.id) {
        alert('A company id is required.');
        return;
    }

    dataset.value.companies = dataset.value.companies.filter(x => x.id !== company.value.id);

    dataset.value.companies.push(company.value);

    contextStore.persistState();

    savedCompany.value = true;
    setTimeout(() => savedCompany.value = false, 3000);
}

function addEmptyCompany() {
    company.value = { id: '' };
}

function deleteCompany() {
    const confirmed = confirm('Delete company?');

    if (confirmed && company.value) {
        contextStore.deleteCompanyById(company.value.id);
        addEmptyCompany();
    }
}

</script>
