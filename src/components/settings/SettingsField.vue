<template>
  <div>
    <label
      v-if="label"
      class="text-sm block"
      :for="forId"
    >
      {{ label }}
    </label>
    <div :class="label ? 'mt-1' : ''">
      <slot />
    </div>
    <p
      v-if="help"
      class="mt-2 text-sm text-slate-600"
    >
      {{ help }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
    label?: string;
    help?: string;
    forId?: string;
}>();
</script>
