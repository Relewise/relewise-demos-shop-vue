<template>
  <div class="space-y-6">
    <SettingsStickyActions
      v-model:element="saveBarElement"
      :errors="errors"
      :pinned="isSaveBarPinned"
    >
      <template #content>
        <p
          :class="isDirty ? 'text-sm font-semibold text-amber-700' : 'text-sm text-slate-600'"
        >
          {{ isDirty ? 'You have unsaved changes.' : 'No unsaved changes.' }}
        </p>
      </template>

      <template #actions>
        <button
          :disabled="!isDirty"
          :class="!isDirty ? 'cursor-not-allowed opacity-60' : ''"
          @click="saveChanges"
        >
          Save changes
        </button>
      </template>
    </SettingsStickyActions>

    <SettingsAccordionSection
      title="General"
      :open="openSections.general"
      @toggle="toggleSection('general')"
    >
      <div class="grid gap-8 xl:grid-cols-2">
        <div class="space-y-5">
          <SettingsField label="Name">
            <input
              v-model="editableDataset.displayName"
              type="text"
              class="lp-ignore-field"
              name="rw-display-name"
              placeholder="Name"
              autocomplete="new-password"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
            >
          </SettingsField>

          <SettingsField label="Dataset ID">
            <input
              v-model="editableDataset.datasetId"
              type="text"
              class="lp-ignore-field disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              name="dataset-id"
              placeholder="Dataset ID"
              disabled
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              data-form-type="other"
              data-lpignore="true"
            >
          </SettingsField>

          <SettingsField label="API Key">
            <SecretInput
              v-model="editableDataset.apiKey"
              name="dataset-api-key"
              placeholder="API Key"
              :reveal-on-change-key="props.dataset.datasetId"
              show-label="Show API key"
              hide-label="Hide API key"
            />
          </SettingsField>

          <SettingsField label="Server URL">
            <input
              v-model="editableDataset.serverUrl"
              type="text"
              placeholder="Server URL"
            >
          </SettingsField>
        </div>

        <div class="space-y-5">
          <DismissibleBadgeInput
            :items="languageItems"
            label="Languages"
            placeholder="Add language"
            @update:items="setLanguages"
          />

          <DismissibleBadgeInput
            :items="currencyItems"
            label="Currencies"
            placeholder="Add currency"
            uppercase
            @update:items="setCurrencies"
          />

          <SettingsField label="Tracking">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label class="flex items-start justify-between gap-4">
                <div>
                  <span class="block font-semibold text-slate-900">Tracking enabled</span>
                  <span class="mt-1 block text-sm text-slate-600">
                    Enables tracking of user behavior in the demo shop.
                  </span>
                </div>

                <span class="relative inline-flex shrink-0 items-center">
                  <input
                    v-model="trackingEnabled"
                    type="checkbox"
                    class="peer sr-only"
                  >
                  <span class="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-slate-900" />
                  <span class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                </span>
              </label>
            </div>
          </SettingsField>
        </div>
      </div>
    </SettingsAccordionSection>

    <SettingsAccordionSection
      title="Features"
      :open="openSections.features"
      @toggle="toggleSection('features')"
    >
      <template #badge>
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-600">
          {{ enabledFeatureCount }} enabled
        </span>
      </template>

      <div class="space-y-4">
        <div
          v-for="feature in featureFields"
          :key="feature.key"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <label class="flex items-start gap-3">
            <input
              v-model="editableDataset[feature.key]"
              class="mt-1 h-5 w-5 accent-brand-500"
              type="checkbox"
            >
            <span>
              <span class="block font-semibold text-slate-900">{{ feature.label }}</span>
              <span class="mt-1 block text-sm text-slate-600">{{ feature.description }}</span>
            </span>
          </label>
        </div>

        <SettingsField
          label="Recommendations lookback in minutes"
          help="Default is 20160 minutes, equivalent to 14 days."
        >
          <input
            v-model.number="editableDataset.recommendationsMinutesAgo"
            type="text"
          >
        </SettingsField>
      </div>
    </SettingsAccordionSection>

    <SettingsAccordionSection
      title="Personalization"
      :open="openSections.personalization"
      @toggle="toggleSection('personalization')"
    >
      <Personalisation :dataset="editableDataset" />
    </SettingsAccordionSection>
  </div>
</template>

<script lang="ts" setup>
 
import DismissibleBadgeInput from '@/components/DismissibleBadgeInput.vue';
import Personalisation from '@/components/Personalisation.vue';
import SecretInput from '@/components/SecretInput.vue';
import SettingsAccordionSection from '@/components/settings/SettingsAccordionSection.vue';
import SettingsField from '@/components/settings/SettingsField.vue';
import SettingsStickyActions from '@/components/settings/SettingsStickyActions.vue';
import { useDatasetConfigurationForm } from '@/composables/useDatasetConfigurationForm';
import type { IDataset } from '@/stores/context.store';
import { toRef } from 'vue';

const props = defineProps<{
    dataset: IDataset;
}>();

const {
    editableDataset,
    trackingEnabled,
    errors,
    saveBarElement,
    isSaveBarPinned,
    openSections,
    enabledFeatureCount,
    languageItems,
    currencyItems,
    isDirty,
    featureFields,
    toggleSection,
    setLanguages,
    setCurrencies,
    saveChanges,
} = useDatasetConfigurationForm(toRef(props, 'dataset'));
</script>
