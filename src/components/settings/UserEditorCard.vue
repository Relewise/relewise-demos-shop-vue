<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div
      class="flex flex-col gap-4 bg-slate-50 px-6 py-4 md:flex-row md:items-start md:justify-between"
      :class="expanded ? 'border-b border-slate-200' : ''"
    >
      <button
        type="button"
        class="min-w-0 flex-1 !bg-transparent !px-0 !py-0 !text-left !text-slate-900 !shadow-none hover:!bg-transparent"
        :aria-label="expanded ? 'Collapse user details' : 'Expand user details'"
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
          title="Remove user"
          aria-label="Remove user"
          @click.stop="$emit('remove')"
        />

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          :title="expanded ? 'Collapse user details' : 'Expand user details'"
          :aria-label="expanded ? 'Collapse user details' : 'Expand user details'"
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
      <div class="grid gap-5 xl:grid-cols-3">
        <InlineActionInput
          :model-value="authenticatedId"
          label="Authenticated ID"
          placeholder="Authenticated ID"
          :action-label="authenticatedIdActionLabel"
          action-prefix="auth-"
          @update:model-value="setAuthenticatedId"
        />

        <InputText
          v-model="email"
          label="Email"
          placeholder="Email"
        />

        <InlineActionInput
          :model-value="temporaryId"
          label="Temporary ID"
          placeholder="Temporary ID"
          :action-label="temporaryIdActionLabel"
          action-prefix="temp-"
          @update:model-value="setTemporaryId"
        />
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <KeyValues
          v-model="identifiers"
          title="Identifiers"
        />
        <div class="hidden xl:block" />
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
import InlineActionInput from '@/components/InlineActionInput.vue';
import InputText from '@/components/form/InputText.vue';
import TrashCanButton from '@/components/form/TrashCanButton.vue';
import KeyValues, { type KeyValue } from '@/components/KeyValues.vue';
import { keyValueArrayToDataRecord, keyValueArrayToStringRecord, keyValuesFromDataRecord, keyValuesFromStringRecord, setUserMetadataDraft } from '@/helpers/keyValueMetadata';
import { displayUser } from '@/helpers/userHelper';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import type { User } from '@relewise/client';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    expanded: boolean;
    isActive: boolean;
    user: User;
}>();

defineEmits<{
    remove: [];
    toggleExpand: [];
}>();

const classifications = ref<KeyValue[]>([]);
const identifiers = ref<KeyValue[]>([]);
const data = ref<KeyValue[]>([]);
const temporaryId = ref('');
const authenticatedId = ref('');
const email = ref('');

const firstIdentifier = computed(() => {
    return identifiers.value.find((entry) => entry.key?.trim() || entry.value?.trim());
});

const identifierValues = computed(() => {
    return identifiers.value
        .filter((entry) => entry.key?.trim() || entry.value?.trim())
        .map((entry) => formatBadgeValue(entry.key, entry.value));
});

const headline = computed(() => {
    const preferredLabel = displayUser({
        email: email.value.trim() || undefined,
        authenticatedId: authenticatedId.value.trim() || undefined,
        temporaryId: temporaryId.value.trim() || undefined,
    } as User);

    if (preferredLabel !== 'Anonymous') {
        return preferredLabel;
    }

    if (identifierValues.value.length > 0) {
        return identifierValues.value.join(', ');
    }

    return 'Anonymous user';
});

const authenticatedIdActionLabel = computed(() => authenticatedId.value.trim() ? 'Regenerate' : 'Generate');
const temporaryIdActionLabel = computed(() => temporaryId.value.trim() ? 'Regenerate' : 'Generate');

const summaryBadges = computed(() => {
    const badges: string[] = [];

    if (authenticatedId.value.trim()) {
        badges.push(`Authenticated ID: ${authenticatedId.value.trim()}`);
    }

    if (email.value.trim()) {
        badges.push(`Email: ${email.value.trim()}`);
    }

    if (temporaryId.value.trim()) {
        badges.push(`Temporary ID: ${temporaryId.value.trim()}`);
    }

    badges.push(...identifierValues.value);

    return badges;
});

watch(
    () => props.user,
    (nextUser) => {
        temporaryId.value = nextUser?.temporaryId ?? '';
        authenticatedId.value = nextUser?.authenticatedId ?? '';
        email.value = nextUser?.email ?? '';
        classifications.value = keyValuesFromStringRecord(nextUser?.classifications);
        identifiers.value = keyValuesFromStringRecord(nextUser?.identifiers);
        data.value = keyValuesFromDataRecord(nextUser?.data);
    },
    { immediate: true },
);

watch(
    [temporaryId, authenticatedId, email, classifications, identifiers, data],
    () => {
        syncUserMetadata();
    },
    { deep: true },
);

function syncUserMetadata() {
    setUserMetadataDraft(props.user, {
        classifications: classifications.value,
        identifiers: identifiers.value,
        data: data.value,
    });

    props.user.temporaryId = temporaryId.value || undefined;
    props.user.authenticatedId = authenticatedId.value || undefined;
    props.user.email = email.value || undefined;
    props.user.classifications = keyValueArrayToStringRecord(classifications.value);
    props.user.identifiers = keyValueArrayToStringRecord(identifiers.value);
    props.user.data = keyValueArrayToDataRecord(data.value);
}

function setAuthenticatedId(value: string) {
    authenticatedId.value = value;
}

function setTemporaryId(value: string) {
    temporaryId.value = value;
}

function formatBadgeValue(key?: string | null, value?: string | null) {
    const trimmedKey = key?.trim() ?? '';
    const trimmedValue = value?.trim() ?? '';

    if (trimmedKey && trimmedValue) {
        return `${trimmedKey}: ${trimmedValue}`;
    }

    return trimmedValue || trimmedKey;
}

</script>
