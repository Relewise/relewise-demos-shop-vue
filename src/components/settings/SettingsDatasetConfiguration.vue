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
          class="brand-action"
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
          <InputText
            v-model="editableDataset.displayName"
            label="Name"
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
          />

          <InputText
            v-model="editableDataset.datasetId"
            label="Dataset ID"
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
          />

          <SecretInput
            v-model="editableDataset.apiKey"
            label="API Key"
            name="dataset-api-key"
            placeholder="API Key"
            :reveal-on-change-key="props.dataset.datasetId"
            show-label="Show API Key"
            hide-label="Hide API Key"
          />

          <InputText
            v-model="editableDataset.serverUrl"
            label="Server URL"
            placeholder="Server URL"
          />
        </div>

        <div class="space-y-5">
          <FormTags
            v-model="languageItems"
            label="Languages"
            placeholder="Add language"
          />

          <FormTags
            v-model="currencyItems"
            label="Currencies"
            placeholder="Add currency"
            uppercase
          />

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <InputToggle
              v-model="trackingEnabled"
              label="Tracking enabled"
              help="Enables tracking of user behavior in the demo shop."
            />
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 class="mb-4 text-base font-semibold text-slate-900">
          Placeholder images
        </h3>
        <div class="grid gap-5 xl:grid-cols-2">
          <InputText
            id="product-placeholder-image-url"
            v-model="editableDataset.productPlaceholderImageUrl"
            label="Product placeholder image URL"
            help="Used when a product or variant image is unavailable. Leave blank to use the default."
          />
          <InputText
            id="category-placeholder-image-url"
            v-model="editableDataset.categoryPlaceholderImageUrl"
            label="Category placeholder image URL"
            help="Used when a category image is unavailable. Leave blank to use the default."
          />
        </div>
      </div>
    </SettingsAccordionSection>

    <SettingsAccordionSection
      title="Branding"
      :open="openSections.branding"
      @toggle="toggleSection('branding')"
    >
      <SettingsDatasetBranding v-model="editableDataset.branding" />
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
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="mb-4 text-base font-semibold text-slate-900">
            Stock availability
          </h3>
          <div class="grid gap-5 xl:grid-cols-2">
            <InputText
              id="store-quantity-data-key"
              v-model="editableDataset.storeQuantityDataKey"
              label="Stock data key"
              help="Use a Boolean, a number, or an Object of counts by store ID. Leave blank to hide stock availability."
              spellcheck="false"
            />
            <InputText
              id="store-name-data-key"
              v-model="editableDataset.storeNameDataKey"
              label="Store name data key"
              help="Optional for stock Objects. Names must use the same store IDs. Leave blank to display the IDs."
              spellcheck="false"
            />
          </div>
        </div>

        <template
          v-for="feature in featureFields"
          :key="feature.key"
        >
          <div
            class="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100"
            @click="toggleFeatureFromCard(feature.key, $event)"
          >
            <InputCheckbox
              v-model="editableDataset[feature.key]"
              class="pointer-events-none"
              :label="feature.label"
              :help="feature.description"
            />
          </div>
        </template>

        <section
          aria-labelledby="variant-settings-heading"
          class="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <h3
            id="variant-settings-heading"
            class="text-sm font-semibold text-slate-900"
          >
            Variants
          </h3>

          <div class="grid gap-x-5 gap-y-4 xl:grid-cols-2">
            <InputText
              id="max-variants-per-product"
              :model-value="editableDataset.maxVariantsPerProduct ?? defaultMaxVariantsPerProduct"
              label="Max variants per product"
              help="Defaults to 1 for requests that use this setting."
              type="number"
              min="1"
              step="1"
              class="block w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-xs transition focus:border-brand-link focus:outline-hidden focus:ring-2 focus:ring-brand-focus-ring"
              @update:model-value="editableDataset.maxVariantsPerProduct = Number($event)"
            />

            <InputSelect
              id="variant-sorting"
              v-model="editableDataset.variantRequestSorting"
              label="Variant sorting"
              help="Controls how variants are sorted in product search responses."
            >
              <option value="GroupedByProduct">
                Grouped by product
              </option>
              <option value="ByRelevance">
                By relevance
              </option>
            </InputSelect>

            <FormTags
              :model-value="editableDataset.variantDimensionKeys ?? []"
              label="Additional variant data keys"
              placeholder="Add a variant data key and press Enter"
              help="Product pages always use variant specifications. Add case-sensitive variant data keys in the order they should appear after the specifications."
              class="xl:col-span-2"
              :min-items="0"
              case-sensitive
              @update:model-value="editableDataset.variantDimensionKeys = $event"
            />
          </div>
        </section>

        <section
          aria-labelledby="recommendation-settings-heading"
          class="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <h3
            id="recommendation-settings-heading"
            class="text-sm font-semibold text-slate-900"
          >
            Recommendations
          </h3>

          <div class="grid gap-x-5 gap-y-4 xl:grid-cols-2">
            <InputText
              id="recommendations-lookback"
              :model-value="editableDataset.recommendationsMinutesAgo"
              label="Lookback (minutes)"
              help="Defaults to 14 days (20,160 minutes)."
              type="text"
              @update:model-value="editableDataset.recommendationsMinutesAgo = Number($event)"
            />
          </div>
        </section>
      </div>
    </SettingsAccordionSection>

    <SettingsAccordionSection
      title="Personalization"
      :open="openSections.personalization"
      @toggle="toggleSection('personalization')"
    >
      <Personalization :dataset="editableDataset" />
    </SettingsAccordionSection>
  </div>
</template>

<script lang="ts" setup>
 
import FormTags from '@/components/form/FormTags.vue';
import InputCheckbox from '@/components/form/InputCheckbox.vue';
import InputSelect from '@/components/form/InputSelect.vue';
import InputText from '@/components/form/InputText.vue';
import InputToggle from '@/components/form/InputToggle.vue';
import type { DatasetBooleanKey } from '@/helpers/datasetFeatures';
import Personalization from '@/components/Personalization.vue';
import SecretInput from '@/components/SecretInput.vue';
import SettingsAccordionSection from '@/components/settings/SettingsAccordionSection.vue';
import SettingsDatasetBranding from '@/components/settings/SettingsDatasetBranding.vue';
import SettingsStickyActions from '@/components/settings/SettingsStickyActions.vue';
import { useDatasetConfigurationForm } from '@/composables/useDatasetConfigurationForm';
import { defaultMaxVariantsPerProduct } from '@/helpers/productSearchRequest';
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
    saveChanges,
} = useDatasetConfigurationForm(toRef(props, 'dataset'));

function toggleFeatureFromCard(key: DatasetBooleanKey, event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return;
    }

    if (target.closest('a, button, input, label, select, textarea')) {
        return;
    }

    editableDataset.value[key] = !editableDataset.value[key];
}
</script>
