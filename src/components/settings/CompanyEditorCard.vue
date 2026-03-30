<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div
      class="flex flex-col gap-4 bg-slate-50 px-6 py-4 md:flex-row md:items-start md:justify-between"
      :class="expanded ? 'border-b border-slate-200' : ''"
    >
      <button
        type="button"
        class="min-w-0 flex-1 !bg-transparent !px-0 !py-0 !text-left !text-slate-900 !shadow-none hover:!bg-transparent"
        :aria-label="expanded ? 'Collapse company details' : 'Expand company details'"
        @click="$emit('toggleExpand')"
      >
        <span class="flex flex-wrap items-center gap-2">
          <h3 class="truncate text-xl text-slate-900">
            {{ headline }}
          </h3>
          <span
            v-if="isActive"
            class="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Active
          </span>
        </span>
        <span
          v-if="summaryBadges.length > 0"
          class="mt-3 flex flex-wrap items-center gap-2"
        >
          <span
            v-for="badge in summaryBadges"
            :key="badge"
            class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
          >
            {{ badge }}
          </span>
        </span>
      </button>

      <div class="flex items-center gap-2 md:pl-4">
        <TrashCanButton
          title="Remove company"
          aria-label="Remove company"
          @click.stop="$emit('remove')"
        />

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          :title="expanded ? 'Collapse company details' : 'Expand company details'"
          :aria-label="expanded ? 'Collapse company details' : 'Expand company details'"
          @click.stop="$emit('toggleExpand')"
        >
          <ChevronDownIcon
            class="shrink-0 transition"
            :class="expanded ? 'rotate-180' : ''"
            style="width: 1.25rem; height: 1.25rem;"
          />
        </button>
      </div>
    </div>

    <div
      v-if="expanded"
      class="px-6 py-6"
      @click.stop
    >
      <div class="grid gap-6 xl:grid-cols-2">
        <InlineActionInput
          :model-value="companyId"
          label="Company ID"
          placeholder="Company ID"
          :action-label="companyIdActionLabel"
          action-prefix="company-"
          @update:model-value="setCompanyId"
          @action="commitCompanyIdChange"
          @blur="commitCompanyIdChange"
        />

        <InputSelect
          :model-value="parentCompanyId"
          label="Parent company"
          :disabled="isParentSelectionDisabled"
          @update:model-value="setParentCompany"
        >
          <option value="">
            {{ parentPlaceholder }}
          </option>
          <option
            v-for="companyOption in availableParentCompanies"
            :key="companyOption.id"
            :value="companyOption.id"
          >
            {{ companyOption.id }}
          </option>
        </InputSelect>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <KeyValues
          v-model="data"
          title="Data"
        />
        <div class="hidden xl:block" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */
import InlineActionInput from '@/components/InlineActionInput.vue';
import InputSelect from '@/components/form/InputSelect.vue';
import TrashCanButton from '@/components/form/TrashCanButton.vue';
import KeyValues, { type KeyValue } from '@/components/KeyValues.vue';
import contextStore from '@/stores/context.store';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import { DataValueFactory, type Company, type DataValue } from '@relewise/client';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    companies: Company[];
    company: Company;
    expanded: boolean;
    isActive: boolean;
}>();

defineEmits<{
    remove: [];
    toggleExpand: [];
}>();

const companyId = ref('');
const parentCompanyId = ref('');
const data = ref<KeyValue[]>([]);

const companyIdActionLabel = computed(() => companyId.value.trim() ? 'Regenerate' : 'Generate');
const hasChildCompanies = computed(() => {
    const currentCompanyId = props.company.id?.trim();
    if (!currentCompanyId) {
        return false;
    }

    return props.companies.some((company) => company.parent?.id === currentCompanyId);
});

const availableParentCompanies = computed(() => {
    if (hasChildCompanies.value) {
        return [];
    }

    return props.companies.filter((company) => {
        if (company.id === props.company.id?.trim()) {
            return false;
        }

        return !company.parent?.id;
    });
});

const isParentSelectionDisabled = computed(() => hasChildCompanies.value || availableParentCompanies.value.length === 0);
const parentPlaceholder = computed(() => {
    if (hasChildCompanies.value) {
        return 'No parent company';
    }

    return availableParentCompanies.value.length > 0 ? 'No parent company' : 'No available parent companies';
});

const headline = computed(() => companyId.value.trim() || 'New company');
const summaryBadges = computed(() => {
    const badges: string[] = [];

    if (parentCompanyId.value.trim()) {
        badges.push(`Parent: ${parentCompanyId.value.trim()}`);
    }

    const dataBadges = data.value
        .filter((entry) => entry.key?.trim() && entry.value?.trim())
        .slice(0, 2)
        .map((entry) => `${entry.key.trim()}: ${entry.value?.trim()}`);

    badges.push(...dataBadges);

    return badges;
});

watch(
    () => props.company,
    (nextCompany) => {
        companyId.value = nextCompany?.id ?? '';
        parentCompanyId.value = nextCompany?.parent?.id ?? '';
        data.value = Object.keys(nextCompany?.data ?? {}).map((key) => ({
            key,
            value: nextCompany?.data?.[key]?.type === 'String' ? String(nextCompany.data[key].value) : null,
        }));
    },
    { immediate: true },
);

watch(
    () => props.company.id,
    (nextCompanyId) => {
        companyId.value = nextCompanyId ?? '';
    },
);

watch(
    () => props.company.parent?.id,
    (nextParentCompanyId) => {
        parentCompanyId.value = nextParentCompanyId ?? '';
    },
);

watch(
    [companyId, parentCompanyId, data],
    () => {
        syncCompanyMetadata();
    },
    { deep: true },
);

function syncCompanyMetadata() {
    props.company.parent = props.companies.find((company) => company.id === parentCompanyId.value);
    props.company.data = data.value.reduce((acc, entry) => {
        acc[entry.key] = DataValueFactory.string(entry.value ?? '');
        return acc;
    }, {} as Record<string, DataValue>);
}

function setCompanyId(value: string) {
    companyId.value = value;
}

function setParentCompany(value: string) {
    parentCompanyId.value = value;
}

function commitCompanyIdChange() {
    const previousCompanyId = props.company.id?.trim() ?? '';
    const nextCompanyId = companyId.value.trim();

    if (previousCompanyId === nextCompanyId) {
        return;
    }

    props.company.id = nextCompanyId;

    props.companies.forEach((company) => {
        if (company === props.company || company.parent?.id !== previousCompanyId) {
            return;
        }

        company.parent = nextCompanyId ? props.company : undefined;
    });

    if (props.isActive && contextStore.selectedCompanyId.value === previousCompanyId) {
        contextStore.setCompany(nextCompanyId);
    }
}
</script>
