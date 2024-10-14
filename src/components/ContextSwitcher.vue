<script setup lang="ts">
import contextStore from '@/stores/context.store';
import { displayUser } from '@/helpers/userHelper';
import type { User } from '@relewise/client';
import { ref } from 'vue';
import { Cog6ToothIcon } from '@heroicons/vue/24/outline';

const user = contextStore.user;
const context = contextStore.context;
const datasets = contextStore.datasets;

const language = ref(context.value.language);
const currency = ref(context.value.currencyCode);

function setDataset(datasetId: string) {
    contextStore.setDataset(datasetId);
    window.location.reload();
}

function setUser(userToSet: User) {
    contextStore.setUser(userToSet);
    window.location.reload();
}

function saveLanguageAndCurrency(language: string, currency: string) {
    context.value.language = language;
    context.value.currencyCode = currency;

    contextStore.persistState();
    window.location.reload();
}

function setUserCompany(companyToSet: string) {
    const selectedCompany = context.value.companies?.find(x => x.id === companyToSet);
    user.value.company = selectedCompany;
}
</script>

<template>
    <div class="flex flex-col">
        <div class="font-semibold px-2 bg-gray-100 py-2">
            Switch Context
        </div>
        <hr class="p-0 my-0">
        <div class="p-2 flex flex-col gap-4">
            <div class="flex-grow">
                <label class="text-sm block">Dataset</label>
                <select :value="context.datasetId"
                        @change="setDataset(($event.target as HTMLInputElement).value)">
                    <option v-for="dataset in datasets" :key="dataset.datasetId" :value="dataset.datasetId">
                        {{ dataset.displayName }}
                    </option>
                </select>
            </div>
            <div class="flex gap-2 items-end">
                <div class="flex flex-col">
                    <label class="text-sm block">Language</label>
                    <input v-model="language" class="flex-grow h-10" type="text" placeholder="LanguageCode">
                </div>
                <div class="flex flex-col">
                    <label class="text-sm block">Currency</label>
                    <input v-model="currency" class="flex-grow h-10" type="text" placeholder="CurrencyCode">
                </div>
                <button :disabled="context.currencyCode === currency && context.language === language"
                        class="disabled:bg-gray-300 h-10 px-4"
                        @click="saveLanguageAndCurrency(language, currency)">
                    Save
                </button>
            </div>
            <div class="flex-grow">
                <label class="text-sm block">User</label>
                <select :disabled="context.users?.length === 1"
                        :value="JSON.stringify(user)"
                        @change="setUser((JSON.parse(($event.target as HTMLInputElement).value) as User))">
                    <option v-for="(userOption, index) in context.users"
                            :key="index"
                            :value="JSON.stringify(userOption)">
                        {{ displayUser(userOption) }}
                    </option>
                </select>
            </div>
            <div v-if="context.companies?.length ?? 0 > 0" class="flex-grow">
                <label class="text-sm block">Company</label>
                <select :value="user.company?.id"
                        :disabled="!context.companies || context.companies.length < 1"
                        @change="setUserCompany(($event.target as HTMLInputElement).value)">
                    <option value="">
                        {{ context.companies && context.companies.length > 0 ? "No company assigned" : "No companies exist" }}
                    </option>
                    <option v-for="(userCompanyOption, index) in context.companies" :key="index" :value="userCompanyOption.id">
                        {{ userCompanyOption.id }}
                    </option>
                </select>
            </div>
            <hr>
            <RouterLink to="/app-settings"
                        class="text-zinc-600 inline-flex items-center whitespace-nowrap hover:text-brand-500 right-0 w-fit ml-auto mb-2">
                <div class="flex items-center justify-center">
                    <Cog6ToothIcon class="w-5 h-5 mr-1"/> Configure Demo 
                </div>
            </RouterLink>
        </div>
    </div>
</template>
