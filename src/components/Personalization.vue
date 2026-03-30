<template>
  <div class="space-y-6">
    <SettingsPanel
      title="Users"
      description="Manage the users available in this dataset."
    >
      <template #actions>
        <button @click="addUser">
          Add user
        </button>
      </template>

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
        <div
          v-for="(userOption, index) in users"
          :key="index"
          :ref="(element) => setUserCardRef(element, index)"
        >
          <UserEditorCard
            :expanded="expandedUserIndexes.includes(index)"
            :is-active="props.dataset.datasetId === activeDatasetId && index === activeUserIndex"
            :user="userOption"
            @remove="deleteUser(index)"
            @toggle-expand="toggleUserExpanded(index)"
          />
        </div>
      </div>
    </SettingsPanel>

    <SettingsPanel
      title="Companies"
      description="Manage companies for this dataset. Company IDs must remain unique."
    >
      <template #actions>
        <button @click="addCompany">
          Add company
        </button>
      </template>

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
        <div
          v-for="(companyOption, index) in companies"
          :key="companyOption.id || index"
          :ref="(element) => setCompanyCardRef(element, index)"
        >
          <CompanyEditorCard
            :companies="companies"
            :company="companyOption"
            :expanded="expandedCompanyIndexes.includes(index)"
            :is-active="props.dataset.datasetId === activeDatasetId && companyOption.id === activeContextCompanyId"
            @remove="deleteCompany(index)"
            @toggle-expand="toggleCompanyExpanded(index)"
          />
        </div>
      </div>
    </SettingsPanel>

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
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import CompanyEditorCard from '@/components/settings/CompanyEditorCard.vue';
import UserEditorCard from '@/components/settings/UserEditorCard.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import { UserFactory, type Company, type User } from '@relewise/client';
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{
    dataset: IDataset;
}>();
const users = computed(() => props.dataset.users ?? []);
const companies = computed(() => props.dataset.companies ?? []);
const activeDatasetId = computed(() => contextStore.context.value?.datasetId ?? '');
const activeUserIndex = computed(() => contextStore.selectedUserIndex.value);
const expandedUserIndexes = ref<number[]>([]);
const expandedCompanyIndexes = ref<number[]>([]);
const userCardRefs = ref<Array<HTMLElement | null>>([]);
const companyCardRefs = ref<Array<HTMLElement | null>>([]);
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
        userCardRefs.value.length = nextUsers.length;
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
        companyCardRefs.value.length = nextCompanies.length;
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

async function addUser() {
    props.dataset.users = [...users.value, createUser()];
    const newIndex = props.dataset.users.length - 1;
    expandedUserIndexes.value = [newIndex];
    await scrollToCard(userCardRefs.value[newIndex]);
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

async function addCompany() {
    const nextCompany = { id: `company-${crypto.randomUUID().slice(0, 8)}` };
    props.dataset.companies = [...companies.value, nextCompany];
    const newIndex = props.dataset.companies.length - 1;
    expandedCompanyIndexes.value = [newIndex];
    await scrollToCard(companyCardRefs.value[newIndex]);
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

function setUserCardRef(element: Element | { $el?: Element } | null, index: number) {
    userCardRefs.value[index] = resolveElement(element);
}

function setCompanyCardRef(element: Element | { $el?: Element } | null, index: number) {
    companyCardRefs.value[index] = resolveElement(element);
}

async function scrollToCard(element: HTMLElement | null | undefined) {
    await nextTick();

    const target = element;
    if (!target) {
        return;
    }

    requestAnimationFrame(() => {
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    });
}

function resolveElement(element: Element | { $el?: Element } | null) {
    if (!element) {
        return null;
    }

    if ('$el' in element) {
        return (element.$el as HTMLElement | null) ?? null;
    }

    return element as HTMLElement;
}
</script>
