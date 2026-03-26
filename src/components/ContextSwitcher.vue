<script setup lang="ts">
import { computed } from 'vue';
import contextStore from '@/stores/context.store';
import { displayUserOption } from '@/helpers/userHelper';
import { Cog6ToothIcon } from '@heroicons/vue/24/outline';

const context = contextStore.context;
const datasets = contextStore.datasets;
const hasUsers = computed(() => (context.value.users?.length ?? 0) > 0);
const hasCompanies = computed(() => (context.value.companies?.length ?? 0) > 0);
const selectedUserOption = computed(() => {
    const users = context.value.users ?? [];
    const selectedUserIndex = contextStore.selectedUserIndex.value;

    if (selectedUserIndex === undefined || selectedUserIndex < 0 || selectedUserIndex >= users.length) {
        return '';
    }

    return String(selectedUserIndex);
});
const selectedCompanyOption = computed(() => contextStore.selectedCompanyId.value || '');

function setDataset(datasetId: string) {
    contextStore.setDataset(datasetId);
}

function setUser(selectedIndex: string) {
    if (!selectedIndex) {
        contextStore.setUserSelection(undefined);
        return;
    }

    const nextUser = context.value.users?.[Number(selectedIndex)];
    if (!nextUser) {
        return;
    }

    contextStore.setUser(nextUser);
}

function setCompany(companyToSet: string) {
    contextStore.setCompany(companyToSet);
}

function changeLanguage(language: string) {
    contextStore.setLanguage(language);
}

function changeCurrency(currency: string) {
    contextStore.setCurrency(currency);
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
            :value="contextStore.language.value"
            class="w-full"
            @change="changeLanguage(($event.target as HTMLInputElement).value)"
          >
            <template v-if="Array.isArray(context.allLanguages)">
              <option
                v-for="(language, index) in context.allLanguages"
                :key="index"
                :value="language"
                :selected="contextStore.language.value == language"
              >
                {{ language }} 
              </option>
            </template>
            <template v-else>
              <option :value="contextStore.language.value">
                {{ contextStore.language.value }}
              </option>
            </template>
          </select>
        </div>
        <div class="flex flex-col flex-grow w-1/2">
          <label class="text-sm block">Currency</label>
          <select
            name="Currency"
            :value="contextStore.currencyCode.value"
            class="w-full"
            @change="changeCurrency(($event.target as HTMLInputElement).value)"
          >
            <template v-if="Array.isArray(context.allCurrencies)">
              <option
                v-for="(currencyCode, index) in context.allCurrencies"
                :key="index"
                :value="currencyCode"
                :selected="contextStore.currencyCode.value == currencyCode"
              >
                {{ currencyCode }} 
              </option>
            </template>
            <template v-else>
              <option :value="contextStore.currencyCode.value">
                {{ contextStore.currencyCode.value }}
              </option>
            </template>
          </select>
        </div>
      </div>
      <div class="flex-grow">
        <label class="text-sm block">User</label>
        <select
          :disabled="!hasUsers"
          :value="selectedUserOption"
          @change="setUser(($event.target as HTMLInputElement).value)"
        >
          <option
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
        v-if="hasCompanies"
        class="flex-grow"
      >
        <label class="text-sm block">Company</label>
        <select
          :value="selectedCompanyOption"
          :disabled="!context.companies || context.companies.length < 1"
          @change="setCompany(($event.target as HTMLInputElement).value)"
        >
          <option value="">
            {{ context.companies && context.companies.length > 0 ? "(None)" : "No companies exist" }}
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
