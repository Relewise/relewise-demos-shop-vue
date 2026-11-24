import { readonly, shallowRef } from 'vue';

export interface SessionTrackingSignal {
    datasetId: string;
    label: string;
    subject?: string;
    detail?: string;
    timestamp: string;
}

interface SessionCockpitState {
    open: boolean;
    signals: (SessionTrackingSignal & { id: number })[];
}

const storageKey = 'demoShopSessionCockpit';
const state = shallowRef<SessionCockpitState>(load());

export const sessionCockpit = readonly(state);

export function setSessionCockpitOpen(open: boolean) {
    update({ ...state.value, open });
}

export function recordSessionTrackingSignal(signal: SessionTrackingSignal) {
    const previous = state.value.signals;
    const id = (previous[0]?.id ?? 0) + 1;
    update({ ...state.value, signals: [{ ...signal, id }, ...previous] });
}

function load(): SessionCockpitState {
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Partial<SessionCockpitState> | null;
        return { open: saved?.open === true, signals: Array.isArray(saved?.signals) ? saved.signals : [] };
    }
    catch {
        // A browser that blocks session storage can still show signals during this page visit.
    }
    return { open: false, signals: [] };
}

function update(next: SessionCockpitState) {
    state.value = next;
    try {
        // Recommendation links can reload the storefront. Keep the cockpit in this tab across navigation.
        sessionStorage.setItem(storageKey, JSON.stringify(next));
    }
    catch {
        // The in-memory state still updates if storage is unavailable or full.
    }
}
