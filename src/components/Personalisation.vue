<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-900">
            Users
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Manage users for this dataset. Authenticated id, temporary id, and email must remain unique when set.
          </p>
        </div>
        <button @click="addUser">
          Add user
        </button>
      </div>

      <div
        v-if="users.length === 0"
        class="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600"
      >
        No users added yet.
      </div>

      <div
        v-else
        class="mt-8 space-y-4"
      >
        <UserEditorCard
          v-for="(userOption, index) in users"
          :key="index"
          :expanded="expandedUserIndexes.includes(index)"
          :is-active="props.dataset.datasetId === activeDatasetId && index === activeUserIndex"
          :user="userOption"
          @remove="deleteUser(index)"
          @toggle-expand="toggleUserExpanded(index)"
        />
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-900">
            Companies
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Manage companies for this dataset. Company ids must remain unique.
          </p>
        </div>
        <button @click="addCompany">
          Add company
        </button>
      </div>

      <div
        v-if="companies.length === 0"
        class="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600"
      >
        No companies added yet.
      </div>

      <div
        v-else
        class="mt-8 space-y-4"
      >
        <CompanyEditorCard
          v-for="(companyOption, index) in companies"
          :key="companyOption.id || index"
          :companies="companies"
          :company="companyOption"
          :expanded="expandedCompanyIndexes.includes(index)"
          :is-active="props.dataset.datasetId === activeDatasetId && companyOption.id === activeContextCompanyId"
          @remove="deleteCompany(index)"
          @toggle-expand="toggleCompanyExpanded(index)"
        />
      </div>
    </section>

    <ConfirmationDialog
      v-model="isRemoveUserDialogOpen"
      title="Remove user"
      :description="removeUserDialogDescription"
      confirm-label="Remove user"
      @confirm="confirmRemoveUser"
    />

    <ConfirmationDialog
      v-model="isRemoveCompanyDialogOpen"
      title="Remove company"
      :description="removeCompanyDialogDescription"
      confirm-label="Remove company"
      @confirm="confirmRemoveCompany"
    />
  </div>
</template>

<script lang="ts" setup>
/* eslint-disable vue/no-mutating-props */
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
import CompanyEditorCard from '@/components/settings/CompanyEditorCard.vue';
import UserEditorCard from '@/components/settings/UserEditorCard.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import { UserFactory, type Company, type User } from '@relewise/client';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    dataset: IDataset;
}>();
const users = computed(() => props.dataset.users ?? []);
const companies = computed(() => props.dataset.companies ?? []);
const activeDatasetId = computed(() => contextStore.context.value?.datasetId ?? '');
const activeUserIndex = computed(() => contextStore.selectedUserIndex.value);
const expandedUserIndexes = ref<number[]>([]);
const expandedCompanyIndexes = ref<number[]>([]);
const userPendingRemovalIndex = ref<number | null>(null);
const companyPendingRemovalIndex = ref<number | null>(null);
const activeContextCompanyId = computed(() => contextStore.selectedCompanyId.value);

const isRemoveUserDialogOpen = computed({
    get: () => userPendingRemovalIndex.value !== null,
    set: (value: boolean) => {
        if (!value) {
            userPendingRemovalIndex.value = null;
        }
    },
});

const removeUserDialogDescription = computed(() => {
    if (userPendingRemovalIndex.value === null) {
        return '';
    }

    const user = users.value[userPendingRemovalIndex.value];
    return `Remove "${userKey(user, userPendingRemovalIndex.value)}" from this dataset? This cannot be undone.`;
});

const isRemoveCompanyDialogOpen = computed({
    get: () => companyPendingRemovalIndex.value !== null,
    set: (value: boolean) => {
        if (!value) {
            companyPendingRemovalIndex.value = null;
        }
    },
});

const removeCompanyDialogDescription = computed(() => {
    if (companyPendingRemovalIndex.value === null) {
        return '';
    }

    const company = companies.value[companyPendingRemovalIndex.value];
    return `Remove "${company?.id || `company-${companyPendingRemovalIndex.value + 1}`}" from this dataset? This cannot be undone.`;
});

watch(
    users,
    (nextUsers) => {
        expandedUserIndexes.value = expandedUserIndexes.value
            .filter((index) => index >= 0 && index < nextUsers.length);

        if (nextUsers.length === 1 && isBlankAnonymousUser(nextUsers[0])) {
            expandedUserIndexes.value = [0];
        }
    },
    { immediate: true, deep: true },
);

watch(
    companies,
    (nextCompanies) => {
        expandedCompanyIndexes.value = expandedCompanyIndexes.value
            .filter((index) => index >= 0 && index < nextCompanies.length);

        if (nextCompanies.length === 1 && isBlankCompany(nextCompanies[0])) {
            expandedCompanyIndexes.value = [0];
        }
    },
    { immediate: true, deep: true },
);

function createUser() {
    return UserFactory.anonymous();
}

function addUser() {
    props.dataset.users = [...users.value, createUser()];
    expandedUserIndexes.value = [...new Set([...expandedUserIndexes.value, props.dataset.users.length - 1])];
}

function deleteUser(index: number) {
    userPendingRemovalIndex.value = index;
}

function confirmRemoveUser() {
    if (userPendingRemovalIndex.value === null) {
        return;
    }

    const index = userPendingRemovalIndex.value;
    props.dataset.users = users.value.filter((_, userIndex) => userIndex !== index);
    expandedUserIndexes.value = expandedUserIndexes.value
        .filter((expandedIndex) => expandedIndex !== index)
        .map((expandedIndex) => expandedIndex > index ? expandedIndex - 1 : expandedIndex);
    userPendingRemovalIndex.value = null;
}

function addCompany() {
    const nextCompany = { id: `company-${crypto.randomUUID().slice(0, 8)}` };
    props.dataset.companies = [...companies.value, nextCompany];
    expandedCompanyIndexes.value = [...new Set([...expandedCompanyIndexes.value, props.dataset.companies.length - 1])];
}

function deleteCompany(index: number) {
    companyPendingRemovalIndex.value = index;
}

function confirmRemoveCompany() {
    if (companyPendingRemovalIndex.value === null) {
        return;
    }

    const index = companyPendingRemovalIndex.value;
    const companyToRemove = companies.value[index];
    const companyIdToRemove = companyToRemove?.id?.trim();

    props.dataset.companies = companies.value
        .filter((_, companyIndex) => companyIndex !== index)
        .map((company) => {
            if (companyIdToRemove && company.parent?.id === companyIdToRemove) {
                company.parent = undefined;
            }

            return company;
        });

    expandedCompanyIndexes.value = expandedCompanyIndexes.value
        .filter((expandedIndex) => expandedIndex !== index)
        .map((expandedIndex) => expandedIndex > index ? expandedIndex - 1 : expandedIndex);
    companyPendingRemovalIndex.value = null;
}

function userKey(user: User, index: number) {
    return user.authenticatedId || user.temporaryId || user.email || `user-${index}`;
}

function toggleUserExpanded(index: number) {
    if (expandedUserIndexes.value.includes(index)) {
        expandedUserIndexes.value = expandedUserIndexes.value.filter((expandedIndex) => expandedIndex !== index);
        return;
    }

    expandedUserIndexes.value = [...expandedUserIndexes.value, index];
}

function toggleCompanyExpanded(index: number) {
    if (expandedCompanyIndexes.value.includes(index)) {
        expandedCompanyIndexes.value = expandedCompanyIndexes.value.filter((expandedIndex) => expandedIndex !== index);
        return;
    }

    expandedCompanyIndexes.value = [...expandedCompanyIndexes.value, index];
}

function isBlankAnonymousUser(user: User | undefined) {
    if (!user) {
        return false;
    }

    return !user.authenticatedId
        && !user.email
        && !user.temporaryId
        && Object.keys(user.identifiers ?? {}).length === 0
        && Object.keys(user.classifications ?? {}).length === 0
        && Object.keys(user.data ?? {}).length === 0;
}

function isBlankCompany(company: Company | undefined) {
    if (!company) {
        return false;
    }

    return !company.id?.trim()
        && !company.parent?.id?.trim()
        && Object.keys(company.data ?? {}).length === 0;
}
</script>
