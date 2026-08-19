<template>
  <dl :class="nested ? 'nested' : 'mt-2 border border-solid border-neutral-100 border-b-0 shadow-xs'">
    <template
      v-for="[key, value] in entries"
      :key="key"
    >
      <dt :title="value.type">
        {{ key }}
      </dt>
      <dd class="break-all">
        <slot
          :name="key"
          :value="value"
        >
          <DataValueList
            v-if="value.type === 'Object'"
            :entries="objectEntries(value)"
            nested
          />
          <template v-else-if="value.value?.$values">
            {{ value.value.$values.join(', ') }}
          </template>
          <a
            v-else-if="isUrl(value.value)"
            :href="value.value"
            target="_blank"
            rel="noopener noreferrer"
            class="text-brand-500 hover:underline"
          >
            {{ value.value }}
          </a>
          <template v-else>
            {{ value.value }}
          </template>
        </slot>
      </dd>
    </template>
  </dl>
</template>

<script lang="ts" setup>
import type { DataValue } from '@relewise/client';

export type DataValueEntry = [key: string, value: DataValue];

defineProps<{
  entries: DataValueEntry[];
  nested?: boolean;
}>();

function objectEntries(value: DataValue): DataValueEntry[] {
  return Object.entries(value.value?.data ?? {});
}

function isUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
</script>

<style lang="scss" scoped>
dl {
  display: grid;
  grid-template-columns: max-content auto;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

dl.nested {
  margin: -0.5rem;
  border-radius: 0;
}

dt {
  background-color: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
  font-weight: 500;
  grid-column-start: 1;
  padding: 0.5rem 1rem;
  text-transform: capitalize;
}

dd {
  border-bottom: 1px solid var(--color-neutral-100);
  grid-column-start: 2;
  padding: 0.5rem;
}
</style>
