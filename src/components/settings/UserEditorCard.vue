<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div
      class="flex flex-col gap-4 bg-slate-50 px-6 py-4 md:flex-row md:items-start md:justify-between"
      :class="isExpanded ? 'border-b border-slate-200' : ''"
    >
      <button
        type="button"
        class="min-w-0 flex-1 !bg-transparent !px-0 !py-0 !text-left !text-slate-900 !shadow-none hover:!bg-transparent"
        :aria-label="isExpanded ? 'Collapse user details' : 'Expand user details'"
        @click="isExpanded = !isExpanded"
      >
        <span class="flex flex-wrap items-center gap-2">
          <h3 class="truncate text-xl text-slate-900">
            {{ displayUser(user) }}
          </h3>
          <span
            v-if="isActive"
            class="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Active
          </span>
        </span>
        <span class="mt-2 block truncate text-sm text-slate-500">
          {{ user.authenticatedId || user.temporaryId || user.email || 'No identifiers added yet' }}
        </span>
      </button>

      <div class="flex items-center gap-2 md:pl-4">
        <button
          v-if="!isActive"
          type="button"
          class="outline !px-3"
          @click.stop="$emit('setActive')"
        >
          Set active
        </button>

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          title="Remove user"
          aria-label="Remove user"
          @click.stop="$emit('remove')"
        >
          <TrashIcon
            class="shrink-0"
            style="width: 1.25rem; height: 1.25rem;"
          />
        </button>

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          :title="isExpanded ? 'Collapse user details' : 'Expand user details'"
          :aria-label="isExpanded ? 'Collapse user details' : 'Expand user details'"
          @click.stop="isExpanded = !isExpanded"
        >
          <ChevronDownIcon
            class="shrink-0 transition"
            :class="isExpanded ? 'rotate-180' : ''"
            style="width: 1.25rem; height: 1.25rem;"
          />
        </button>
      </div>
    </div>

    <div
      v-if="isExpanded"
      class="px-6 py-6"
      @click.stop
    >
      <div class="grid gap-5 xl:grid-cols-3">
        <div>
          <label class="text-sm block">Authenticated ID</label>
          <div class="mt-1 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-100 px-4 py-2.5 shadow-sm focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200">
            <input
              v-model="authenticatedId"
              type="text"
              placeholder="Authenticated ID"
              class="!mt-0 !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
            >
            <button
              type="button"
              class="shrink-0 !bg-transparent !px-0 !py-0 text-sm font-semibold !text-slate-600 !shadow-none transition hover:!text-slate-900"
              @click.stop="generateUserId('authenticated')"
            >
              Generate
            </button>
          </div>
        </div>

        <div>
          <label class="text-sm block">Email</label>
          <input
            v-model="email"
            class="mt-1"
            type="text"
            placeholder="Email"
          >
        </div>

        <div>
          <label class="text-sm block">Temporary ID</label>
          <div class="mt-1 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-100 px-4 py-2.5 shadow-sm focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200">
            <input
              v-model="temporaryId"
              type="text"
              placeholder="Temporary ID"
              class="!mt-0 !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
            >
            <button
              type="button"
              class="shrink-0 !bg-transparent !px-0 !py-0 text-sm font-semibold !text-slate-600 !shadow-none transition hover:!text-slate-900"
              @click.stop="generateUserId('temporary')"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <KeyValues
          v-model="identifiers"
          title="Identifiers"
        />

        <div>
          <label class="block text-sm">Company</label>
          <select
            :value="user.company?.id ?? ''"
            class="mt-3"
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
      </div>

      <div class="mt-6 border-t border-slate-200 pt-6" />

      <div class="grid gap-6 xl:grid-cols-2">
        <KeyValues
          v-model="classifications"
          title="Classifications"
        />
        <KeyValues
          v-model="data"
          title="Data"
        />
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
/* eslint-disable vue/no-mutating-props */
import KeyValues, { type KeyValue } from '@/components/KeyValues.vue';
import { displayUser } from '@/helpers/userHelper';
import { ChevronDownIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { DataValueFactory, type Company, type DataValue, type User } from '@relewise/client';
import { ref, watch } from 'vue';

const props = defineProps<{
    companies: Company[];
    isActive: boolean;
    user: User;
}>();

defineEmits<{
    remove: [];
    setActive: [];
}>();

const classifications = ref<KeyValue[]>([]);
const identifiers = ref<KeyValue[]>([]);
const data = ref<KeyValue[]>([]);
const temporaryId = ref('');
const authenticatedId = ref('');
const email = ref('');
const isExpanded = ref(false);

watch(
    () => props.user,
    (nextUser) => {
        temporaryId.value = nextUser?.temporaryId ?? '';
        authenticatedId.value = nextUser?.authenticatedId ?? '';
        email.value = nextUser?.email ?? '';
        classifications.value = Object.keys(nextUser?.classifications ?? {}).map((key) => ({ key, value: nextUser?.classifications?.[key] ?? null }));
        identifiers.value = Object.keys(nextUser?.identifiers ?? {}).map((key) => ({ key, value: nextUser?.identifiers?.[key] ?? null }));
        data.value = Object.keys(nextUser?.data ?? {}).map((key) => ({ key, value: nextUser?.data?.[key]?.type === 'String' ? String(nextUser.data[key].value) : null }));
    },
    { immediate: true, deep: true },
);

watch(
    [temporaryId, authenticatedId, email, classifications, identifiers, data],
    () => {
        syncUserMetadata();
    },
    { deep: true },
);

function keyValueArrayToRecord(items: KeyValue[]) {
    return items.reduce((acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
    }, {} as Record<string, string | null>);
}

function syncUserMetadata() {
    props.user.temporaryId = temporaryId.value || undefined;
    props.user.authenticatedId = authenticatedId.value || undefined;
    props.user.email = email.value || undefined;
    props.user.classifications = keyValueArrayToRecord(classifications.value);
    props.user.identifiers = keyValueArrayToRecord(identifiers.value);
    props.user.data = data.value.reduce((acc, entry) => {
        acc[entry.key] = DataValueFactory.string(entry.value ?? '');
        return acc;
    }, {} as Record<string, DataValue>);
}

function generateUserId(type: 'temporary' | 'authenticated') {
    const id = crypto.randomUUID();
    if (type === 'temporary') {
        temporaryId.value = id;
        return;
    }

    authenticatedId.value = id;
}

function setUserCompany(companyId: string) {
    props.user.company = props.companies.find((company) => company.id === companyId);
}
</script>
