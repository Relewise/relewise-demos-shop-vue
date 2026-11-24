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

interface StoredSessionCockpitState extends SessionCockpitState {
    identitySalt?: string;
    identityMarker?: string;
}

const storageKey = 'demoShopSessionCockpit';
const dataset = contextStore.context;
const selectedUserIndex = contextStore.selectedUserIndex;
const selectedCompany = contextStore.selectedCompanyId;
const user = contextStore.user;
const scope = computed(() => JSON.stringify([dataset.value?.datasetId, selectedUserIndex.value, selectedCompany.value]));
const userIdentity = computed(() => {
    const { authenticatedId, temporaryId, email, fingerprint, identifiers } = user.value;
    return JSON.stringify([authenticatedId, temporaryId, email, fingerprint, Object.entries(identifiers ?? {}).sort()]);
});
const savedState = readStoredState();
const identitySalt = savedState?.identitySalt || globalThis.crypto?.randomUUID?.();
const state = shallowRef<SessionCockpitState>({ open: savedState?.open === true, scope: scope.value, signals: [] });
let generation = 0;
let identityMarker: string | undefined;
let identityReady = refreshIdentity(savedState);

watch([scope, userIdentity], ([nextScope]) => {
    // Invalidate requests immediately so a response accepted after a context switch cannot repopulate the timeline.
    generation += 1;
    identityMarker = undefined;
    update({ ...state.value, scope: nextScope, signals: [] });
    identityReady = refreshIdentity();
}, { flush: 'sync' });

export const sessionCockpit = readonly(state);

export function setSessionCockpitOpen(open: boolean) {
    update({ ...state.value, open });
}

export function getSessionTrackingGeneration() {
    return generation;
}

export async function recordSessionTrackingSignal(signal: SessionTrackingSignal, requestGeneration: number) {
    // Restore saved signals first so a new event arriving during verification gets the next ID.
    await identityReady;
    if (requestGeneration !== generation || signal.datasetId !== dataset.value?.datasetId) return;

    const previous = state.value.signals;
    const id = (previous[0]?.id ?? 0) + 1;
    update({ ...state.value, signals: [{ ...signal, id }, ...previous] });
}

function readStoredState(): Partial<StoredSessionCockpitState> | undefined {
    try {
        return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') ?? undefined;
    }
    catch {
        // A browser that blocks session storage can still show signals during this page visit.
        return undefined;
    }
}

async function refreshIdentity(saved?: Partial<StoredSessionCockpitState>) {
    const currentGeneration = generation;
    const marker = await digestIdentity(userIdentity.value);
    if (currentGeneration !== generation) return;

    identityMarker = marker;
    // Another tab can replace the saved user without changing their index in the dataset.
    if (marker && saved?.identityMarker === marker && saved.scope === state.value.scope && Array.isArray(saved.signals)) {
        update({ ...state.value, signals: saved.signals });
    }
    else if (saved) {
        persist(state.value);
    }
}

async function digestIdentity(identity: string) {
    try {
        if (!identitySalt || !globalThis.crypto?.subtle) return undefined;

        // Salt the marker per tab so storage can verify identity without copying shopper identifiers.
        const bytes = new TextEncoder().encode(identitySalt + identity);
        const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    }
    catch {
        return undefined;
    }
}

function update(next: SessionCockpitState) {
    state.value = next;
    persist(next);
}

function persist(next: SessionCockpitState) {
    try {
        // Only save signals when a subsequent page load can verify which shopper they belong to.
        sessionStorage.setItem(storageKey, JSON.stringify({
            ...next,
            identitySalt,
            identityMarker,
            signals: identityMarker ? next.signals : [],
        } satisfies StoredSessionCockpitState));
    }
    catch {
        // The in-memory state still updates if storage is unavailable or full.
    }
}
