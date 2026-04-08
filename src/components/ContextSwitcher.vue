<script setup lang="ts">
import { createSessionSelectionsForDataset } from '@/helpers/contextSession';
import { computed, ref, watch } from 'vue';
import contextStore from '@/stores/context.store';
import { displayUserOption } from '@/helpers/userHelper';
import { Cog6ToothIcon } from '@heroicons/vue/24/outline';
import router from '@/router';
import InputSelect from '@/components/form/InputSelect.vue';

const datasets = contextStore.datasets;
const draftDatasetId = ref('');
const draftLanguage = ref('');
const draftCurrencyCode = ref('');
const draftSelectedUserOption = ref('');
const draftSelectedCompanyOption = ref('');

const draftDataset = computed(() => {
    return datasets.value.find((dataset) => dataset.datasetId === draftDatasetId.value);
});
const configureDemoRoute = computed(() => {
    if (!contextStore.hasActiveDataset.value) {
        return { name: 'settings' as const };
    }

    return {
        name: 'settings-dataset' as const,
        params: { datasetId: contextStore.context.value.datasetId },
    };
});

const hasUsers = computed(() => (draftDataset.value?.users?.length ?? 0) > 0);
const hasCompanies = computed(() => (draftDataset.value?.companies?.length ?? 0) > 0);

watch(
    () => contextStore.activeContextRevision.value,
    () => {
        syncDraftWithContext();
    },
    { immediate: true },
);

watch(
    draftDatasetId,
    (nextDatasetId) => {
        const nextDataset = datasets.value.find((dataset) => dataset.datasetId === nextDatasetId);
        if (!nextDataset) {
            draftLanguage.value = '';
            draftCurrencyCode.value = '';
            draftSelectedUserOption.value = '';
            draftSelectedCompanyOption.value = '';
            return;
        }

        const nextSelections = createSessionSelectionsForDataset(nextDataset);
        draftLanguage.value = nextSelections.selectedLanguage ?? '';
        draftCurrencyCode.value = nextSelections.selectedCurrencyCode ?? '';
        draftSelectedUserOption.value = nextSelections.selectedUserIndex === undefined ? '' : String(nextSelections.selectedUserIndex);
        draftSelectedCompanyOption.value = nextSelections.selectedCompanyId ?? '';
    },
);

function syncDraftWithContext() {
    if (!contextStore.hasActiveDataset.value) {
        draftDatasetId.value = '';
        draftLanguage.value = '';
        draftCurrencyCode.value = '';
        draftSelectedUserOption.value = '';
        draftSelectedCompanyOption.value = '';
        return;
    }

    draftDatasetId.value = contextStore.context.value.datasetId;
    draftLanguage.value = contextStore.language.value;
    draftCurrencyCode.value = contextStore.currencyCode.value;
    draftSelectedUserOption.value = contextStore.selectedUserIndex.value === undefined ? '' : String(contextStore.selectedUserIndex.value);
    draftSelectedCompanyOption.value = contextStore.selectedCompanyId.value || '';
}

function setDataset(datasetId: string) {
    draftDatasetId.value = datasetId;
}

function setUser(selectedIndex: string) {
    draftSelectedUserOption.value = selectedIndex;
}

function setCompany(companyToSet: string) {
    draftSelectedCompanyOption.value = companyToSet;
}

function changeLanguage(language: string) {
    draftLanguage.value = language;
}

function changeCurrency(currency: string) {
    draftCurrencyCode.value = currency;
}

async function applyContextChanges() {
    if (!draftDataset.value) {
        return;
    }

    const activeDatasetId = contextStore.hasActiveDataset.value ? contextStore.context.value.datasetId : '';
    const datasetChanged = activeDatasetId !== draftDataset.value.datasetId;

    contextStore.applySessionContext({
        datasetId: draftDataset.value.datasetId,
        language: draftLanguage.value,
        currencyCode: draftCurrencyCode.value,
        selectedUserIndex: draftSelectedUserOption.value === '' ? undefined : Number(draftSelectedUserOption.value),
        selectedCompanyId: draftSelectedCompanyOption.value || undefined,
    });

    if (datasetChanged) {
        await router.push({ name: 'home' });
    }
}
</script>

<template>
  <div class="flex flex-col">
    <div class="bg-gray-100 px-2 py-2 font-semibold">
      Switch Context
    </div>
    <hr class="my-0 p-0">
    <div class="flex flex-col gap-4 p-2">
      <div class="flex-grow">
        <InputSelect
          label="Dataset"
          :model-value="draftDatasetId"
          @update:model-value="setDataset"
        >
          <option
            v-for="dataset in datasets"
            :key="dataset.datasetId"
            :value="dataset.datasetId"
          >
            {{ dataset.displayName }}
          </option>
        </InputSelect>
      </div>
      <div class="flex items-end gap-2">
        <div class="flex w-1/2 flex-grow flex-col">
          <InputSelect
            label="Language"
            name="Language"
            :model-value="draftLanguage"
            class="w-full"
            @update:model-value="changeLanguage"
          >
            <option
              v-for="(language, index) in draftDataset?.allLanguages ?? []"
              :key="index"
              :value="language"
            >
              {{ language }}
            </option>
          </InputSelect>
        </div>
        <div class="flex w-1/2 flex-grow flex-col">
          <InputSelect
            label="Currency"
            name="Currency"
            :model-value="draftCurrencyCode"
            class="w-full"
            @update:model-value="changeCurrency"
          >
            <option
              v-for="(currencyCode, index) in draftDataset?.allCurrencies ?? []"
              :key="index"
              :value="currencyCode"
            >
              {{ currencyCode }}
            </option>
          </InputSelect>
        </div>
      </div>
      <div class="flex-grow">
        <InputSelect
          label="User"
          :disabled="!hasUsers"
          :model-value="draftSelectedUserOption"
          @update:model-value="setUser"
        >
          <option value="">
            (None)
          </option>
          <option
            v-for="(userOption, index) in draftDataset?.users ?? []"
            :key="index"
            :value="String(index)"
          >
            {{ displayUserOption(userOption, index) }}
          </option>
        </InputSelect>
      </div>
      <div
        v-if="hasCompanies"
        class="flex-grow"
      >
        <InputSelect
          label="Company"
          :model-value="draftSelectedCompanyOption"
          @update:model-value="setCompany"
        >
          <option value="">
            (None)
          </option>
          <option
            v-for="(companyOption, index) in draftDataset?.companies ?? []"
            :key="index"
            :value="companyOption.id"
          >
            {{ companyOption.id }}
          </option>
        </InputSelect>
      </div>
      <div class="flex items-center justify-between">
        <RouterLink
          v-close-popper
          :to="configureDemoRoute"
          class="mr-auto inline-flex w-fit items-center whitespace-nowrap text-slate-600 hover:text-brand-500"
        >
          <div class="flex items-center justify-center">
            <Cog6ToothIcon class="mr-1 h-5 w-5" /> Configure Demo
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
