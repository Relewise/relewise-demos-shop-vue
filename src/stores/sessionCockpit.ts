import { computed, readonly, shallowRef, watch } from 'vue';
import contextStore from '@/stores/context.store';

export interface SessionTrackingSignal {
    datasetId: string;
    label: string;
    subject?: string;
    detail?: string;
    timestamp: string;
}

interface SessionCockpitState {
    open: boolean;
    scope: string;
    signals: (SessionTrackingSignal & { id: number })[];
}

const storageKey = 'demoShopSessionCockpit';
const dataset = contextStore.context;
const selectedUserIndex = contextStore.selectedUserIndex;
const selectedCompany = contextStore.selectedCompanyId;
const user = contextStore.user;
const scope = computed(() => JSON.stringify([dataset.value?.datasetId, selectedUserIndex.value, selectedCompany.value]));
const userIdentity = computed(() => {
    const { authenticatedId, temporaryId, email, fingerprint, identifiers } = user.value;
    // Detect identity edits within a selected slot without duplicating the user's identifiers in storage.
    return JSON.stringify([authenticatedId, temporaryId, email, fingerprint, Object.entries(identifiers ?? {}).sort()]);
});
const state = shallowRef<SessionCockpitState>(load(scope.value));
let generation = 0;

watch([scope, userIdentity], ([nextScope]) => {
    // Invalidate requests immediately so a response accepted after a context switch cannot repopulate the timeline.
    generation += 1;
    update({ ...state.value, scope: nextScope, signals: [] });
}, { flush: 'sync' });

export const sessionCockpit = readonly(state);

export function setSessionCockpitOpen(open: boolean) {
    update({ ...state.value, open });
}

export function getSessionTrackingGeneration() {
    return generation;
}

export function recordSessionTrackingSignal(signal: SessionTrackingSignal, requestGeneration: number) {
    if (requestGeneration !== generation || signal.datasetId !== dataset.value?.datasetId) return;

    const previous = state.value.signals;
    const id = (previous[0]?.id ?? 0) + 1;
    update({ ...state.value, signals: [{ ...signal, id }, ...previous] });
}

function load(scope: string): SessionCockpitState {
    const empty: SessionCockpitState = { open: false, scope, signals: [] };
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Partial<SessionCockpitState> | null;
        if (!saved) return empty;
        if (saved.scope === scope && Array.isArray(saved.signals)) {
            return { open: saved.open === true, scope, signals: saved.signals };
        }

        // A different tab can change the saved shop context before this tab reloads.
        const reset = { ...empty, open: saved.open === true };
        persist(reset);
        return reset;
    }
    catch {
        // A browser that blocks session storage can still show signals during this page visit.
    }
    return empty;
}

function update(next: SessionCockpitState) {
    state.value = next;
    persist(next);
}

function persist(next: SessionCockpitState) {
    try {
        // Recommendation links can reload the storefront. Keep the cockpit in this tab across navigation.
        sessionStorage.setItem(storageKey, JSON.stringify(next));
    }
    catch {
        // The in-memory state still updates if storage is unavailable or full.
    }
}
