<template>
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <div class="space-y-4">
      <InputText
        id="branding-logo-url"
        :model-value="branding?.logoUrl"
        label="Logo URL"
        placeholder="https://…"
        help="Leave blank to use the Demo Shop logo."
        inputmode="url"
        spellcheck="false"
        @update:model-value="updateField('logoUrl', $event)"
      />

      <div
        v-for="{ key, label, defaultColor, previewColor } in colorFields"
        :key="key"
      >
        <label
          :for="'branding-' + key"
          class="block text-sm text-slate-700"
        >{{ label }}</label>
        <div class="mt-1 grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2">
          <input
            type="color"
            class="h-11 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
            :aria-label="'Pick ' + label.toLowerCase()"
            :value="previewColor"
            @input="updateField(key, ($event.target as HTMLInputElement).value)"
          >
          <InputText
            :id="'branding-' + key"
            :model-value="branding?.[key]"
            :placeholder="defaultColor"
            spellcheck="false"
            @update:model-value="updateField(key, $event)"
          />
        </div>
      </div>

      <button
        type="button"
        class="outline disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!branding?.logoUrl && !branding?.primaryColor && !branding?.secondaryColor"
        @click="branding = undefined"
      >
        Reset to defaults
      </button>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-slate-700">
        Storefront preview
      </p>
      <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="rounded-md bg-white p-3">
          <StorefrontLogo
            :logo-url="previewLogoUrl"
            image-class="h-8 max-w-full object-contain object-left"
          >
            <template #error>
              <p class="mt-2 text-sm text-red-700">
                The custom logo could not be loaded.
              </p>
            </template>
          </StorefrontLogo>
        </div>
        <div
          class="shop-branding-preview flex flex-wrap items-center gap-2 text-sm"
          :data-shop-primary="primaryColor ? '' : undefined"
          :data-shop-light-primary="onPrimary === '#000' ? '' : undefined"
          :data-shop-secondary="secondaryColor ? '' : undefined"
          :style="{
            '--shop-primary': primaryColor,
            '--shop-on-primary': onPrimary,
            '--shop-secondary': secondaryColor,
            '--shop-on-secondary': onSecondary,
          }"
        >
          <span
            class="shop-cart-action rounded-lg px-3 py-2 font-semibold"
          >Add to cart</span>
          <span
            class="shop-selected-filter inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
          >
            <CheckIcon
              class="size-3.5 shrink-0"
              aria-hidden="true"
            />
            Selected filter
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputText from '@/components/form/InputText.vue';
import StorefrontLogo from '@/components/StorefrontLogo.vue';
import { brandForeground, defaultPrimaryColor, defaultSecondaryColor, normalizeBrandColor, normalizeLogoUrl, type DatasetBranding } from '@/helpers/datasetBranding';
import { CheckIcon } from '@heroicons/vue/24/outline';
import { computed, ref, watch } from 'vue';

const branding = defineModel<DatasetBranding | undefined>();
const primaryColor = computed(() => normalizeBrandColor(branding.value?.primaryColor));
const secondaryColor = computed(() => normalizeBrandColor(branding.value?.secondaryColor));
const onPrimary = computed(() => primaryColor.value ? brandForeground(primaryColor.value) : undefined);
const onSecondary = computed(() => secondaryColor.value ? brandForeground(secondaryColor.value) : undefined);
const colorFields = computed(() => [
    { key: 'primaryColor', label: 'Primary color', defaultColor: defaultPrimaryColor, previewColor: primaryColor.value ?? defaultPrimaryColor },
    { key: 'secondaryColor', label: 'Secondary color', defaultColor: defaultSecondaryColor, previewColor: secondaryColor.value ?? defaultSecondaryColor },
] as const);
const previewLogoUrl = ref(normalizeLogoUrl(branding.value?.logoUrl));

watch(() => branding.value?.logoUrl, (value, _, onCleanup) => {
    const nextUrl = normalizeLogoUrl(value);
    if (!nextUrl) {
        previewLogoUrl.value = undefined;
        return;
    }

    // Wait until typing pauses to avoid loading a new image for each keystroke.
    const timeout = setTimeout(() => { previewLogoUrl.value = nextUrl; }, 350);
    onCleanup(() => clearTimeout(timeout));
});

function updateField(key: keyof DatasetBranding, value: string) {
    branding.value = { ...branding.value, [key]: value };
}
</script>
