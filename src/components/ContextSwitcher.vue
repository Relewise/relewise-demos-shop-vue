<script setup lang="ts">
import { computed } from 'vue';
import contextStore from '@/stores/context.store';
import { displayUserOption } from '@/helpers/userHelper';
import { Cog6ToothIcon } from '@heroicons/vue/24/outline';

const user = contextStore.user;
const context = contextStore.context;
const datasets = contextStore.datasets;
const hasUsers = computed(() => (context.value.users?.length ?? 0) > 0);
const selectedUserOption = computed(() => {
    const users = context.value.users ?? [];
    const selectedUserIndex = context.value.selectedUserIndex;

    if (selectedUserIndex === undefined || selectedUserIndex < 0 || selectedUserIndex >= users.length) {
        return '';
    }

    return String(selectedUserIndex);
});

function setDataset(datasetId: string) {
    contextStore.setDataset(datasetId);
}

function setUser(selectedIndex: string) {
    const nextUser = context.value.users?.[Number(selectedIndex)];
    if (!nextUser) {
        return;
    }

    contextStore.setUser(nextUser);
}

function setUserCompany(companyToSet: string) {
    const selectedCompany = context.value.companies?.find(x => x.id === companyToSet);
    user.value.company = selectedCompany;
}

function changeLanguage(language: string) {
    context.value.language = language;
}

function changeCurrency(currency: string) {
    context.value.currencyCode = currency;
}

function applyContextChanges() {
    contextStore.refreshActiveContext();
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
        <select
          :value="context.datasetId"
          @change="setDataset(($event.target as HTMLInputElement).value)"
        >
          <option
            v-for="dataset in datasets"
            :key="dataset.datasetId"
            :value="dataset.datasetId"
          >
            {{ dataset.displayName }}
          </option>
        </select>
      </div>
      <div class="flex gap-2 items-end">
        <div class="flex flex-col flex-grow w-1/2">
          <label class="text-sm block">Language</label>
          <select
            name="Language"
            :value="context.language"
            class="w-full"
            @change="changeLanguage(($event.target as HTMLInputElement).value)"
          >
            <template v-if="Array.isArray(context.allLanguages)">
              <option
                v-for="(language, index) in context.allLanguages"
                :key="index"
                :value="language"
                :selected="context.language == language"
              >
                {{ language }} 
              </option>
            </template>
            <template v-else>
              <option :value="context.language">
                {{ context.language }}
              </option>
            </template>
          </select>
        </div>
        <div class="flex flex-col flex-grow w-1/2">
          <label class="text-sm block">Currency</label>
          <select
            name="Currency"
            :value="context.currencyCode"
            class="w-full"
            @change="changeCurrency(($event.target as HTMLInputElement).value)"
          >
            <template v-if="Array.isArray(context.allCurrencies)">
              <option
                v-for="(currencyCode, index) in context.allCurrencies"
                :key="index"
                :value="currencyCode"
                :selected="context.currencyCode == currencyCode"
              >
                {{ currencyCode }} 
              </option>
            </template>
            <template v-else>
              <option :value="context.currencyCode">
                {{ context.currencyCode }}
              </option>
            </template>
          </select>
        </div>
      </div>
      <div class="flex-grow">
        <label class="text-sm block">User</label>
        <select
          :disabled="!hasUsers || context.users?.length === 1"
          :value="selectedUserOption"
          @change="setUser(($event.target as HTMLInputElement).value)"
        >
          <option
            v-if="!hasUsers"
            value=""
          >
            (None)
          </option>
          <option
            v-for="(userOption, index) in context.users"
            :key="index"
            :value="String(index)"
          >
            {{ displayUserOption(userOption, index) }}
          </option>
        </select>
      </div>
      <div
        v-if="hasUsers && (context.companies?.length ?? 0) > 0"
        class="flex-grow"
      >
        <label class="text-sm block">Company</label>
        <select
          :value="user.company?.id"
          :disabled="!context.companies || context.companies.length < 1"
          @change="setUserCompany(($event.target as HTMLInputElement).value)"
        >
          <option value="">
            {{ context.companies && context.companies.length > 0 ? "No company assigned" : "No companies exist" }}
          </option>
          <option
            v-for="(userCompanyOption, index) in context.companies"
            :key="index"
            :value="userCompanyOption.id"
          >
            {{ userCompanyOption.id }}
          </option>
        </select>
      </div>
      <div class="flex items-center justify-between">
        <RouterLink 
          v-close-popper
          to="/app-settings"
          class="text-slate-600 inline-flex items-center whitespace-nowrap hover:text-brand-500 right-0 w-fit mr-auto"
        >
          <div class="flex items-center justify-center">
            <Cog6ToothIcon class="w-5 h-5 mr-1" /> Configure Demo 
          </div>
        </RouterLink>
        <button
          class="ml-auto"
          @click="applyContextChanges"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</template>
