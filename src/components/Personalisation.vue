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
          :companies="companies"
          :is-active="index === selectedUserIndex"
          :user="userOption"
          @remove="deleteUser(index)"
          @set-active="selectUser(index)"
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
        class="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"
      >
        <div class="space-y-3">
          <button
            v-for="companyOption in companies"
            :key="companyOption.id"
            type="button"
            class="w-full rounded-2xl border p-4 text-left transition"
            :class="companyOption.id === selectedCompanyId
              ? 'border-slate-900 bg-slate-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
            @click="selectCompany(companyOption.id)"
          >
            <p class="font-semibold text-slate-900">
              {{ companyOption.id }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ companyOption.parent?.id ? `Parent: ${companyOption.parent.id}` : 'No parent company' }}
            </p>
          </button>
        </div>

        <div
          v-if="activeCompany"
          class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div>
            <label class="text-sm block">Company ID</label>
            <div class="mt-1 flex gap-2">
              <input
                v-model="activeCompany.id"
                type="text"
                placeholder="Company ID"
              >
              <button
                class="outline shrink-0"
                @click="generateCompanyId"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label class="text-sm block">Parent company</label>
            <select
              :value="activeCompany.parent?.id ?? ''"
              class="mt-1"
              :disabled="availableParentCompanies.length === 0"
              @change="setParentCompany(($event.target as HTMLInputElement).value)"
            >
              <option value="">
                {{ availableParentCompanies.length > 0 ? 'No parent company' : 'No other companies' }}
              </option>
              <option
                v-for="companyOption in availableParentCompanies"
                :key="companyOption.id"
                :value="companyOption.id"
              >
                {{ companyOption.id }}
              </option>
            </select>
          </div>

          <div class="flex items-center justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              @click="deleteCompany"
            >
              <TrashIcon class="h-4 w-4 shrink-0" />
              Remove company
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
/* eslint-disable vue/no-mutating-props */
import UserEditorCard from '@/components/settings/UserEditorCard.vue';
import { type IDataset } from '@/stores/context.store';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { UserFactory, type Company, type User } from '@relewise/client';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    dataset: IDataset;
}>();
const users = computed(() => props.dataset.users ?? []);
const companies = computed(() => props.dataset.companies ?? []);
const selectedUserIndex = computed(() => props.dataset.selectedUserIndex ?? 0);
const selectedCompanyId = ref(companies.value[0]?.id ?? '');
const activeCompany = computed<Company | undefined>(() => {
    if (!selectedCompanyId.value) {
        return companies.value[0];
    }

    return companies.value.find((company) => company.id === selectedCompanyId.value);
});

const availableParentCompanies = computed(() => {
    if (!activeCompany.value) {
        return [];
    }

    return companies.value.filter((company) => company.id !== activeCompany.value?.id);
});

watch(
    companies,
    (nextCompanies) => {
        if (!nextCompanies.length) {
            selectedCompanyId.value = '';
            return;
        }

        if (!nextCompanies.some((company) => company.id === selectedCompanyId.value)) {
            selectedCompanyId.value = nextCompanies[0]!.id;
        }
    },
    { immediate: true, deep: true },
);

function createUser() {
    const user = UserFactory.anonymous();
    user.temporaryId = crypto.randomUUID();
    return user;
}

function selectUser(index: number) {
    props.dataset.selectedUserIndex = index;
}

function addUser() {
    props.dataset.users = [...users.value, createUser()];
    props.dataset.selectedUserIndex = props.dataset.users.length - 1;
}

function deleteUser(index: number) {
    const user = users.value[index];
    const confirmed = confirm(`Remove user "${userKey(user, index)}"?`);
    if (!confirmed) {
        return;
    }

    props.dataset.users = users.value.filter((_, userIndex) => userIndex !== index);
    props.dataset.selectedUserIndex = Math.max(0, Math.min(selectedUserIndex.value, props.dataset.users.length - 1));
}

function addCompany() {
    const nextCompany = { id: `company-${crypto.randomUUID().slice(0, 8)}` };
    props.dataset.companies = [...companies.value, nextCompany];
    selectedCompanyId.value = nextCompany.id;
}

function selectCompany(companyId: string) {
    selectedCompanyId.value = companyId;
}

function generateCompanyId() {
    if (!activeCompany.value) {
        return;
    }

    activeCompany.value.id = `company-${crypto.randomUUID().slice(0, 8)}`;
    selectedCompanyId.value = activeCompany.value.id;
}

function setParentCompany(companyId: string) {
    if (!activeCompany.value) {
        return;
    }

    activeCompany.value.parent = companies.value.find((company) => company.id === companyId);
}

function deleteCompany() {
    if (!activeCompany.value) {
        return;
    }

    const confirmed = confirm('Remove selected company?');
    if (!confirmed) {
        return;
    }

    const deletedCompanyId = activeCompany.value.id;
    props.dataset.companies = companies.value.filter((company) => company.id !== deletedCompanyId);
    users.value.forEach((user) => {
        if (user.company?.id === deletedCompanyId) {
            user.company = undefined;
        }
    });
    selectedCompanyId.value = props.dataset.companies?.[0]?.id ?? '';
}

function userKey(user: User, index: number) {
    return user.authenticatedId || user.temporaryId || user.email || `user-${index}`;
}
</script>
