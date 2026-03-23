<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Tracking
      </p>
      <h2 class="mt-2 text-3xl text-slate-900">
        Behavioral tracking
      </h2>
      <p class="mt-2 text-sm text-slate-600">
        Toggle whether the demo tracks user behavior.
      </p>

      <label class="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          v-model="tracking.enabled"
          class="h-5 w-5 accent-brand-500"
          type="checkbox"
        >
        <span>
          <span class="block font-semibold text-slate-900">Tracking enabled</span>
          <span class="mt-1 block text-sm text-slate-600">
            When enabled, interactions are tracked to Relewise for personalized experiences.
          </span>
        </span>
      </label>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Users
          </p>
          <h2 class="mt-2 text-3xl text-slate-900">
            User profiles
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
        No users created yet.
      </div>

      <div
        v-else
        class="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"
      >
        <div class="space-y-3">
          <button
            v-for="(userOption, index) in users"
            :key="userKey(userOption, index)"
            type="button"
            class="w-full rounded-2xl border p-4 text-left transition"
            :class="index === selectedUserIndex
              ? 'border-brand-500 bg-brand-50'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
            @click="selectUser(index)"
          >
            <p class="font-semibold text-slate-900">
              {{ displayUser(userOption) }}
            </p>
            <p class="mt-1 truncate font-mono text-xs text-slate-500">
              {{ userOption.authenticatedId || userOption.temporaryId || userOption.email || 'Unnamed user' }}
            </p>
          </button>
        </div>

        <div
          v-if="activeUser"
          class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="text-sm block">Temporary Id</label>
              <div class="mt-1 flex gap-2">
                <input
                  v-model="activeUser.temporaryId"
                  type="text"
                  placeholder="Temporary Id"
                >
                <button
                  class="outline shrink-0"
                  @click="generateUserId('temporary')"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label class="text-sm block">Authenticated Id</label>
              <div class="mt-1 flex gap-2">
                <input
                  v-model="activeUser.authenticatedId"
                  type="text"
                  placeholder="Authenticated Id"
                >
                <button
                  class="outline shrink-0"
                  @click="generateUserId('authenticated')"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="text-sm block">Email</label>
            <input
              v-model="activeUser.email"
              class="mt-1"
              type="text"
              placeholder="Email"
            >
          </div>

          <div>
            <label class="text-sm block">Company</label>
            <select
              :value="activeUser.company?.id ?? ''"
              class="mt-1"
              :disabled="companies.length === 0"
              @change="setUserCompany(($event.target as HTMLInputElement).value)"
            >
              <option value="">
                {{ companies.length > 0 ? 'No company assigned' : 'No companies exist' }}
              </option>
              <option
                v-for="companyOption in companies"
                :key="companyOption.id"
                :value="companyOption.id"
              >
                {{ companyOption.id }}
              </option>
            </select>
          </div>

          <KeyValues
            v-model="classifications"
            title="Classifications"
          />
          <KeyValues
            v-model="identifiers"
            title="Identifiers"
          />
          <KeyValues
            v-model="data"
            title="Data"
          />

          <div class="flex items-center justify-end">
            <button
              class="bg-red-600 hover:bg-red-700"
              @click="deleteUser"
            >
              Remove user
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Companies
          </p>
          <h2 class="mt-2 text-3xl text-slate-900">
            Company profiles
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
        No companies created yet.
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
              ? 'border-brand-500 bg-brand-50'
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
            <label class="text-sm block">Company Id</label>
            <div class="mt-1 flex gap-2">
              <input
                v-model="activeCompany.id"
                type="text"
                placeholder="Company Id"
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
              class="bg-red-600 hover:bg-red-700"
              @click="deleteCompany"
            >
              Remove company
            </button>
          </div>
        </div>
      </div>
    </section>

    <ul
      v-if="errors.length > 0"
      class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <li
        v-for="error in errors"
        :key="error"
      >
        {{ error }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
/* eslint-disable vue/no-mutating-props */
import KeyValues, { type KeyValue } from '@/components/KeyValues.vue';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { displayUser } from '@/helpers/userHelper';
import { DataValueFactory, UserFactory, type Company, type DataValue, type User } from '@relewise/client';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    dataset: IDataset;
}>();

const tracking = contextStore.tracking;
const users = computed(() => props.dataset.users ?? []);
const companies = computed(() => props.dataset.companies ?? []);
const selectedUserIndex = computed(() => props.dataset.selectedUserIndex ?? 0);
const selectedCompanyId = ref(companies.value[0]?.id ?? '');

const activeUser = computed<User | undefined>(() => users.value[selectedUserIndex.value]);
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

const classifications = ref<KeyValue[]>([]);
const identifiers = ref<KeyValue[]>([]);
const data = ref<KeyValue[]>([]);
const errors = ref<string[]>([]);

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSavedNotificationAt = 0;
let isApplyingAutosave = false;
let lastPersistedSnapshot = JSON.stringify({
    trackingEnabled: tracking.value.enabled,
    users: users.value,
    companies: companies.value,
    selectedUserIndex: selectedUserIndex.value,
});

watch(
    activeUser,
    (nextUser) => {
        classifications.value = Object.keys(nextUser?.classifications ?? {}).map((key) => ({ key, value: nextUser?.classifications?.[key] ?? null }));
        identifiers.value = Object.keys(nextUser?.identifiers ?? {}).map((key) => ({ key, value: nextUser?.identifiers?.[key] ?? null }));
        data.value = Object.keys(nextUser?.data ?? {}).map((key) => ({ key, value: nextUser?.data?.[key]?.type === 'String' ? String(nextUser.data[key].value) : null }));
    },
    { immediate: true },
);

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

watch(
    [tracking, users, companies, classifications, identifiers, data, selectedUserIndex],
    () => {
        if (isApplyingAutosave) {
            return;
        }

        queueSave();
    },
    { deep: true },
);

function queueSave() {
    errors.value = [];
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        if (!activeUser.value) {
            const nextSnapshot = JSON.stringify({
                trackingEnabled: tracking.value.enabled,
                users: users.value,
                companies: companies.value,
                selectedUserIndex: selectedUserIndex.value,
            });

            if (nextSnapshot === lastPersistedSnapshot) {
                return;
            }

            contextStore.persistState();
            lastPersistedSnapshot = nextSnapshot;
            pushSavedNotification();
            return;
        }

        if (!validateBeforePersist()) {
            return;
        }

        const nextClassifications = keyValueArrayToRecord(classifications.value);
        const nextIdentifiers = keyValueArrayToRecord(identifiers.value);
        const nextData = data.value.reduce((acc, entry) => {
            acc[entry.key] = DataValueFactory.string(entry.value ?? '');
            return acc;
        }, {} as Record<string, DataValue>);
        const nextSnapshot = JSON.stringify({
            trackingEnabled: tracking.value.enabled,
            users: users.value.map((user, index) => index === selectedUserIndex.value
                ? { ...user, classifications: nextClassifications, identifiers: nextIdentifiers, data: nextData }
                : user),
            companies: companies.value,
            selectedUserIndex: selectedUserIndex.value,
        });

        if (nextSnapshot === lastPersistedSnapshot) {
            return;
        }

        isApplyingAutosave = true;
        try {
            activeUser.value.classifications = nextClassifications;
            activeUser.value.identifiers = nextIdentifiers;
            activeUser.value.data = nextData;
            props.dataset.selectedUserIndex = selectedUserIndex.value;

            contextStore.persistState();
            lastPersistedSnapshot = nextSnapshot;
        } finally {
            isApplyingAutosave = false;
        }

        pushSavedNotification();
    }, 400);
}

function validateBeforePersist() {
    if (classifications.value.some((entry) => !entry.key || !entry.value)) {
        errors.value.push('Every classification must include both a key and value.');
    }
    if (identifiers.value.some((entry) => !entry.key || !entry.value)) {
        errors.value.push('Every identifier must include both a key and value.');
    }
    if (data.value.some((entry) => !entry.key || !entry.value)) {
        errors.value.push('Every data value must include both a key and value.');
    }

    const temporaryIds = users.value.map((user) => user.temporaryId?.trim()).filter(Boolean);
    if (new Set(temporaryIds).size !== temporaryIds.length) {
        errors.value.push('Temporary ids must be unique.');
    }

    const authenticatedIds = users.value.map((user) => user.authenticatedId?.trim()).filter(Boolean);
    if (new Set(authenticatedIds).size !== authenticatedIds.length) {
        errors.value.push('Authenticated ids must be unique.');
    }

    const emails = users.value.map((user) => user.email?.trim().toLowerCase()).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
        errors.value.push('User emails must be unique.');
    }

    const invalidCompanies = companies.value.filter((company) => !company.id?.trim());
    if (invalidCompanies.length > 0) {
        errors.value.push('Each company must have an id.');
    }

    const companyIds = companies.value.map((company) => company.id?.trim()).filter(Boolean);
    if (new Set(companyIds).size !== companyIds.length) {
        errors.value.push('Company ids must be unique.');
    }

    return errors.value.length === 0;
}

function keyValueArrayToRecord(items: KeyValue[]) {
    return items.reduce((acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
    }, {} as Record<string, string | null>);
}

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

function deleteUser() {
    if (!activeUser.value) {
        return;
    }

    const confirmed = confirm('Remove selected user?');
    if (!confirmed) {
        return;
    }

    props.dataset.users = users.value.filter((_, index) => index !== selectedUserIndex.value);
    props.dataset.selectedUserIndex = Math.max(0, Math.min(selectedUserIndex.value, props.dataset.users.length - 1));
}

function generateUserId(type: 'temporary' | 'authenticated') {
    if (!activeUser.value) {
        return;
    }

    const id = crypto.randomUUID();
    if (type === 'temporary') {
        activeUser.value.temporaryId = id;
        return;
    }

    activeUser.value.authenticatedId = id;
}

function setUserCompany(companyId: string) {
    if (!activeUser.value) {
        return;
    }

    activeUser.value.company = companies.value.find((company) => company.id === companyId);
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

function pushSavedNotification() {
    const now = Date.now();
    if (now - lastSavedNotificationAt < 2000) {
        return;
    }

    lastSavedNotificationAt = now;
    notificationsStore.push({ title: 'Settings saved', text: 'Personalization settings were saved.' });
}
</script>
