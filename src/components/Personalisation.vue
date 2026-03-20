<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Tracking
      </p>
      <h2 class="mt-2 text-3xl text-slate-900">
        Behavioral tracking
      </h2>
      <p class="mt-2 text-sm text-slate-600">
        Toggle tracking for the current demo context. Changes save automatically.
      </p>

      <label class="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 p-4">
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

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Users
            </p>
            <h2 class="mt-2 text-3xl text-slate-900">
              User profiles
            </h2>
            <p class="mt-2 text-sm text-slate-600">
              Manage the users available for the selected dataset.
            </p>
          </div>
          <button @click="addUser">
            New user
          </button>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="space-y-3">
            <button
              v-for="(userOption, index) in users"
              :key="index"
              type="button"
              class="w-full rounded-2xl border p-4 text-left transition"
              :class="index === selectedUserIndex
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
              @click="selectUser(index)"
            >
              <p class="font-semibold text-slate-900">
                {{ displayUser(userOption) }}
              </p>
              <p class="mt-1 truncate font-mono text-xs text-slate-500">
                {{ userOption.authenticatedId || userOption.temporaryId || 'Anonymous user' }}
              </p>
            </button>
          </div>

          <div
            v-if="activeUser"
            class="space-y-5"
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

            <div class="flex items-center justify-between gap-4">
              <p class="text-sm text-slate-500">
                Autosaves when all key/value pairs are complete.
              </p>
              <button
                class="bg-red-600 hover:bg-red-700"
                :disabled="users.length < 2"
                @click="deleteUser"
              >
                Delete user
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Companies
            </p>
            <h2 class="mt-2 text-3xl text-slate-900">
              Company profiles
            </h2>
            <p class="mt-2 text-sm text-slate-600">
              Manage companies and their parent-child relationships.
            </p>
          </div>
          <button @click="addCompany">
            New company
          </button>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="space-y-3">
            <button
              v-for="companyOption in companies"
              :key="companyOption.id"
              type="button"
              class="w-full rounded-2xl border p-4 text-left transition"
              :class="companyOption.id === selectedCompanyId
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
              @click="selectCompany(companyOption.id)"
            >
              <p class="font-semibold text-slate-900">
                {{ companyOption.id }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                {{ companyOption.parent?.id ? `Parent: ${companyOption.parent.id}` : 'No parent company' }}
              </p>
            </button>

            <div
              v-if="companies.length === 0"
              class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
            >
              No companies created yet.
            </div>
          </div>

          <div
            v-if="activeCompany"
            class="space-y-5"
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
                :disabled="companies.length < 2"
                @change="setParentCompany(($event.target as HTMLInputElement).value)"
              >
                <option value="">
                  {{ companies.length > 1 ? 'No parent company' : 'No other companies' }}
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

            <div class="flex items-center justify-between gap-4">
              <p class="text-sm text-slate-500">
                Company ids must be unique.
              </p>
              <button
                class="bg-red-600 hover:bg-red-700"
                @click="deleteCompany"
              >
                Delete company
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

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
import KeyValues, { type KeyValue } from '@/components/KeyValues.vue';
import contextStore from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { displayUser } from '@/helpers/userHelper';
import { DataValueFactory, UserFactory, type Company, type DataValue } from '@relewise/client';
import { computed, ref, watch } from 'vue';

const tracking = contextStore.tracking;
const dataset = computed(() => contextStore.context.value);
const activeUser = computed(() => contextStore.user.value);
const users = computed(() => dataset.value.users ?? []);
const companies = computed(() => dataset.value.companies ?? []);
const selectedUserIndex = computed(() => dataset.value.selectedUserIndex ?? 0);
const selectedCompanyId = ref(companies.value[0]?.id ?? '');

const classifications = ref<KeyValue[]>([]);
const identifiers = ref<KeyValue[]>([]);
const data = ref<KeyValue[]>([]);
const errors = ref<string[]>([]);

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSavedNotificationAt = 0;
let isApplyingAutosave = false;
let lastPersistedSnapshot = '';

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
    activeUser,
    () => {
        classifications.value = Object.keys(activeUser.value.classifications ?? {}).map((key) => ({ key, value: activeUser.value.classifications![key] ?? null }));
        identifiers.value = Object.keys(activeUser.value.identifiers ?? {}).map((key) => ({ key, value: activeUser.value.identifiers![key] ?? null }));
        data.value = Object.keys(activeUser.value.data ?? {}).map((key) => ({ key, value: activeUser.value.data?.[key]?.type === 'String' ? String(activeUser.value.data[key].value) : null }));
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
    () => activeCompany.value?.id,
    (nextId, previousId) => {
        if (previousId && selectedCompanyId.value === previousId && nextId) {
            selectedCompanyId.value = nextId;
        }
    },
);

watch(
    [tracking, dataset, classifications, identifiers, data],
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
            users: users.value,
            companies: companies.value,
            selectedUserIndex: selectedUserIndex.value,
            activeUser: {
                ...activeUser.value,
                classifications: nextClassifications,
                identifiers: nextIdentifiers,
                data: nextData,
            },
        });

        if (nextSnapshot === lastPersistedSnapshot) {
            return;
        }

        isApplyingAutosave = true;
        try {
            activeUser.value.classifications = nextClassifications;
            activeUser.value.identifiers = nextIdentifiers;
            activeUser.value.data = nextData;

            contextStore.persistState();
            lastPersistedSnapshot = nextSnapshot;
        } finally {
            isApplyingAutosave = false;
        }
        pushSavedNotification();
    }, 500);
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

function selectUser(index: number) {
    const selectedUser = users.value[index];
    if (!selectedUser) {
        return;
    }

    contextStore.setUser(selectedUser);
}

function addUser() {
    const user = UserFactory.anonymous();
    dataset.value.users = [...users.value, user];
    contextStore.setUser(user);
}

function deleteUser() {
    if (users.value.length < 2) {
        return;
    }

    const confirmed = confirm('Delete selected user?');
    if (!confirmed) {
        return;
    }

    contextStore.deleteSelectedUser();
}

function generateUserId(type: 'temporary' | 'authenticated') {
    const id = crypto.randomUUID();
    if (type === 'temporary') {
        activeUser.value.temporaryId = id;
        return;
    }

    activeUser.value.authenticatedId = id;
}

function setUserCompany(companyId: string) {
    activeUser.value.company = companies.value.find((company) => company.id === companyId);
}

function addCompany() {
    const newCompany = { id: `company-${crypto.randomUUID().slice(0, 8)}` };
    dataset.value.companies = [...companies.value, newCompany];
    selectedCompanyId.value = newCompany.id;
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

    const confirmed = confirm('Delete selected company?');
    if (!confirmed) {
        return;
    }

    const deletedCompanyId = activeCompany.value.id;
    dataset.value.companies = companies.value.filter((company) => company.id !== deletedCompanyId);
    users.value.forEach((user) => {
        if (user.company?.id === deletedCompanyId) {
            user.company = undefined;
        }
    });
    selectedCompanyId.value = dataset.value.companies?.[0]?.id ?? '';
}

function pushSavedNotification() {
    const now = Date.now();
    if (now - lastSavedNotificationAt < 2000) {
        return;
    }

    lastSavedNotificationAt = now;
    notificationsStore.push({ title: 'Settings saved', text: 'Personalization settings were saved.' });
}

lastPersistedSnapshot = JSON.stringify({
    trackingEnabled: tracking.value.enabled,
    users: users.value,
    companies: companies.value,
    selectedUserIndex: selectedUserIndex.value,
    activeUser: activeUser.value,
});
</script>
