<template>
  <ConfirmationDialog
    :model-value="modelValue"
    title="Review imported dataset changes"
    :description="dialogDescription"
    confirm-label="Apply selected changes"
    cancel-label="Cancel import"
    confirm-tone="primary"
    panel-class="max-h-[85vh] max-w-3xl flex flex-col"
    content-class="pb-1"
    scroll-content
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <template #content>
      <div
        v-if="pendingImport"
        class="space-y-4"
      >
        <div class="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dataset ID
          </p>
          <p class="mt-1 break-all font-mono text-sm text-slate-900">
            {{ pendingImport.incoming.datasetId }}
          </p>
        </div>

        <section
          v-if="coreFieldChanges.length > 0"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-900">
                Core Fields
              </h4>
              <p class="mt-1 text-sm text-slate-600">
                Name, API key, and server URL differ between the local dataset and the imported dataset.
              </p>
            </div>
            <div class="shrink-0">
              <button
                v-if="coreFieldChanges.some((change) => change.key === 'apiKey')"
                type="button"
                class="!bg-transparent !px-0 !py-0 text-sm font-semibold !text-slate-600 !shadow-none transition hover:!text-slate-900"
                @click="isApiKeyComparisonVisible = !isApiKeyComparisonVisible"
              >
                {{ isApiKeyComparisonVisible ? 'Hide values' : 'Show values' }}
              </button>
            </div>
          </div>

          <div class="mt-4">
            <div class="space-y-3">
              <div
                v-for="change in coreFieldChanges"
                :key="change.key"
                class="rounded-xl bg-white p-4 ring-1 ring-slate-200"
              >
                <p class="text-sm font-semibold text-slate-900">
                  {{ change.label }}
                </p>
                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Local
                    </p>
                    <p
                      class="mt-1 break-all font-mono text-sm text-slate-700"
                      :class="change.key === 'apiKey' && !isApiKeyComparisonVisible ? 'masked-secret' : ''"
                    >
                      {{ formatFieldValue(change.currentValue) }}
                    </p>
                  </div>
                  <div class="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200">
                    <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      Imported
                    </p>
                    <p
                      class="mt-1 break-all font-mono text-sm text-slate-900"
                      :class="change.key === 'apiKey' && !isApiKeyComparisonVisible ? 'masked-secret' : ''"
                    >
                      {{ formatFieldValue(change.nextValue) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 grid gap-3">
              <label
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="coreFieldsDecision === 'incoming' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
              >
                <div class="flex items-start gap-3">
                  <input
                    v-model="coreFieldsDecision"
                    type="radio"
                    value="incoming"
                    class="mt-1 h-4 w-4"
                  >
                  <div>
                    <p class="text-sm font-semibold text-slate-900">
                      Use imported core fields
                    </p>
                    <p class="mt-1 text-sm text-slate-600">
                      Replace the local name, API key, and server URL with the imported values.
                    </p>
                  </div>
                </div>
              </label>

              <label
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="coreFieldsDecision === 'local' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
              >
                <div class="flex items-start gap-3">
                  <input
                    v-model="coreFieldsDecision"
                    type="radio"
                    value="local"
                    class="mt-1 h-4 w-4"
                  >
                  <div>
                    <p class="text-sm font-semibold text-slate-900">
                      Keep local core fields
                    </p>
                    <p class="mt-1 text-sm text-slate-600">
                      Ignore the incoming name, API key, and server URL changes.
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section
          v-if="featureChanges.length > 0"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Features
          </h4>
          <p class="mt-1 text-sm text-slate-600">
            The imported dataset and your local dataset have different feature settings.
          </p>

          <div class="mt-4 grid gap-3">
            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="featuresDecision === 'replace' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="featuresDecision"
                  type="radio"
                  value="replace"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Replace with imported feature state
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Make the local feature toggles and tracking match the imported settings exactly.
                  </p>
                </div>
              </div>
            </label>

            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="featuresDecision === 'merge' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="featuresDecision"
                  type="radio"
                  value="merge"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Merge feature state
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Keep everything already enabled locally and also enable any imported features that are on.
                  </p>
                </div>
              </div>
            </label>

            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="featuresDecision === 'local' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="featuresDecision"
                  type="radio"
                  value="local"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Keep local feature state
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Ignore the incoming feature and tracking changes.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </section>

        <section
          v-if="userChanges.conflicts.length > 0"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Users
          </h4>
          <p class="mt-1 text-sm text-slate-600">
            {{ userChanges.conflicts.length }} imported user{{ userChanges.conflicts.length === 1 ? '' : 's' }} conflict with local users. Non-conflicting imported users will still be appended automatically.
          </p>

          <div class="mt-4 grid gap-3">
            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="usersDecision === 'shared' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="usersDecision"
                  type="radio"
                  value="shared"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Use imported users for conflicts
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Replace conflicting local users with the imported versions. Non-conflicting imported users are still appended.
                  </p>
                </div>
              </div>
            </label>

            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="usersDecision === 'local' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="usersDecision"
                  type="radio"
                  value="local"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Keep local users for conflicts
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Keep the local versions of conflicting users. Non-conflicting imported users are still appended.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </section>

        <section
          v-if="companyChanges.conflicts.length > 0"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-900">
            Companies
          </h4>
          <p class="mt-1 text-sm text-slate-600">
            {{ companyChanges.conflicts.length }} imported compan{{ companyChanges.conflicts.length === 1 ? 'y conflicts' : 'ies conflict' }} with local companies. Non-conflicting imported companies will still be appended automatically.
          </p>

          <div class="mt-4 grid gap-3">
            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="companiesDecision === 'shared' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="companiesDecision"
                  type="radio"
                  value="shared"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Use imported companies for conflicts
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Replace conflicting local companies with the imported versions. Non-conflicting imported companies are still appended.
                  </p>
                </div>
              </div>
            </label>

            <label
              class="cursor-pointer rounded-xl border p-4 transition"
              :class="companiesDecision === 'local' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'"
            >
              <div class="flex items-start gap-3">
                <input
                  v-model="companiesDecision"
                  type="radio"
                  value="local"
                  class="mt-1 h-4 w-4"
                >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Keep local companies for conflicts
                  </p>
                  <p class="mt-1 text-sm text-slate-600">
                    Keep the local versions of conflicting companies. Non-conflicting imported companies are still appended.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </section>
      </div>
    </template>
  </ConfirmationDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
import type { SharedDataset, SharedDatasetDiff, SharedDatasetImportDecision } from '@/helpers/sharedDataset';
import type { IDataset } from '@/stores/context.store';

type PendingSharedDatasetImport = {
    incoming: SharedDataset;
    existingDataset: IDataset;
    diff: SharedDatasetDiff;
};

const props = defineProps<{
    modelValue: boolean;
    pendingImport: PendingSharedDatasetImport | null;
    importDecision: SharedDatasetImportDecision;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'update:importDecision': [value: SharedDatasetImportDecision];
    confirm: [];
    cancel: [];
}>();

const isApiKeyComparisonVisible = ref(false);

const dialogDescription = computed(() => props.pendingImport
    ? 'Choose how to handle differences between your local dataset and the imported dataset.'
    : '');

const coreFieldChanges = computed(() => props.pendingImport?.diff.coreFieldChanges ?? []);
const featureChanges = computed(() => props.pendingImport?.diff.featureChanges ?? []);
const userChanges = computed(() => props.pendingImport?.diff.userChanges ?? {
    incomingCount: 0,
    matchedCount: 0,
    additions: [],
    conflicts: [],
});
const companyChanges = computed(() => props.pendingImport?.diff.companyChanges ?? {
    incomingCount: 0,
    matchedCount: 0,
    additions: [],
    conflicts: [],
});

const coreFieldsDecision = computed({
    get: () => props.importDecision.coreFields,
    set: (value: SharedDatasetImportDecision['coreFields']) => {
        emit('update:importDecision', { ...props.importDecision, coreFields: value });
    },
});

const featuresDecision = computed({
    get: () => props.importDecision.features,
    set: (value: SharedDatasetImportDecision['features']) => {
        emit('update:importDecision', { ...props.importDecision, features: value });
    },
});

const usersDecision = computed({
    get: () => props.importDecision.users,
    set: (value: SharedDatasetImportDecision['users']) => {
        emit('update:importDecision', { ...props.importDecision, users: value });
    },
});

const companiesDecision = computed({
    get: () => props.importDecision.companies,
    set: (value: SharedDatasetImportDecision['companies']) => {
        emit('update:importDecision', { ...props.importDecision, companies: value });
    },
});

function formatFieldValue(value: string) {
    return value || 'Empty';
}

watch(() => props.modelValue, (isOpen) => {
    if (!isOpen) {
        isApiKeyComparisonVisible.value = false;
    }
});
</script>

<style scoped>
.masked-secret {
    -webkit-text-security: disc;
    text-security: disc;
}
</style>
