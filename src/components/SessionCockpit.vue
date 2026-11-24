<script setup lang="ts">
import { ChartBarIcon, SignalIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { computed, nextTick, ref } from 'vue';
import contextStore from '@/stores/context.store';
import { sessionCockpit, setSessionCockpitOpen } from '@/stores/sessionCockpit';

const dataset = contextStore.context;
const tracking = contextStore.tracking;
const trigger = ref<HTMLButtonElement>();
const closeButton = ref<HTMLButtonElement>();
const signals = computed(() => sessionCockpit.value.signals.filter(signal => signal.datasetId === dataset.value?.datasetId));
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });

async function toggle() {
    if (sessionCockpit.value.open) {
        await close();
        return;
    }

    setSessionCockpitOpen(true);
    await nextTick();
    // The teleported panel follows the storefront in tab order. Move focus only on explicit open.
    closeButton.value?.focus({ preventScroll: true });
}

async function close() {
    setSessionCockpitOpen(false);
    await nextTick();
    // Restore keyboard focus without scrolling the storefront back to the header.
    trigger.value?.focus({ preventScroll: true });
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="relative flex shrink-0 flex-col items-center rounded-none bg-transparent p-0 text-base font-normal text-slate-600 shadow-none aria-expanded:text-brand-700"
    aria-label="Session cockpit"
    :aria-expanded="sessionCockpit.open"
    aria-controls="session-cockpit"
    @click="toggle"
  >
    <ChartBarIcon class="h-8 w-8" />
    <span class="mt-1 text-[9px] font-bold">COCKPIT</span>
  </button>

  <Teleport to="body">
    <aside
      v-if="sessionCockpit.open"
      id="session-cockpit"
      aria-labelledby="session-cockpit-title"
      class="fixed inset-x-3 bottom-12 z-[1500] flex max-h-[min(36rem,70dvh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:right-4 sm:left-auto sm:w-96"
      @keydown.esc.stop="close"
    >
      <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2
            id="session-cockpit-title"
            class="text-lg font-semibold text-slate-900"
          >
            Session cockpit
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            Tracking signals accepted by Relewise in this tab.
          </p>
        </div>
        <button
          ref="closeButton"
          type="button"
          aria-label="Close session cockpit"
          class="rounded-lg bg-transparent p-1 text-slate-600 shadow-none hover:bg-slate-100"
          @click="close"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>

      <div class="flex items-center justify-between gap-3 px-5 pt-4 text-sm">
        <h3 class="font-semibold text-slate-900">
          Signals &amp; tracking
        </h3>
        <span :class="tracking.enabled ? 'text-emerald-700' : 'text-slate-500'">
          {{ tracking.enabled ? 'Storefront tracking on' : 'Storefront tracking off' }}
        </span>
      </div>

      <div
        role="region"
        aria-label="Session tracking activity"
        aria-live="polite"
        tabindex="0"
        class="overflow-y-auto px-5 py-4"
      >
        <p
          v-if="!signals.length"
          class="text-sm text-slate-600"
        >
          {{ tracking.enabled ? 'Browse the shop to see tracking signals here.' : 'Enable storefront tracking in dataset settings to see more signals.' }}
        </p>
        <ol
          v-else
          class="space-y-2"
        >
          <li
            v-for="signal in signals"
            :key="signal.id"
            class="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
          >
            <SignalIcon class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-slate-500">
                <span class="font-semibold text-slate-900">{{ signal.label }}</span>
                <time :datetime="signal.timestamp">{{ timeFormat.format(new Date(signal.timestamp)) }}</time>
              </div>
              <p
                v-if="signal.subject"
                class="wrap-break-word text-sm text-slate-700"
              >
                {{ signal.subject }}
              </p>
              <p
                v-if="signal.detail"
                class="wrap-break-word text-xs text-slate-600"
              >
                {{ signal.detail }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </aside>
  </Teleport>
</template>
