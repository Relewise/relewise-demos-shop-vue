import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/helpers/contextApi', () => ({ initializeWebComponentsForDataset: vi.fn() }));

const dataset = {
    datasetId: 'demo', apiKey: 'local-test', allLanguages: ['en', 'da'], allCurrencies: ['EUR'],
    users: [{ temporaryId: 'first' }, { temporaryId: 'second' }],
};
const signal = { datasetId: 'demo', label: 'Product viewed', timestamp: '2026-11-24T08:00:00Z' };

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
});

describe('session cockpit shopper context', () => {
    it('discards late responses after switching shoppers, even when switching back', async() => {
        const { default: context } = await import('@/stores/context.store');
        context.addDataset(dataset);
        const cockpit = await import('@/stores/sessionCockpit');
        const firstShopperRequest = cockpit.getSessionTrackingGeneration();
        cockpit.setSessionCockpitOpen(true);
        cockpit.recordSessionTrackingSignal(signal, firstShopperRequest);
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(1);

        context.applySessionContext({ datasetId: 'demo', language: 'da', currencyCode: 'EUR', selectedUserIndex: 0 });
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(1);

        context.setUserSelection(1);
        expect(cockpit.sessionCockpit.value).toMatchObject({ open: true, signals: [] });
        cockpit.recordSessionTrackingSignal(signal, firstShopperRequest);
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(0);
        cockpit.recordSessionTrackingSignal(signal, cockpit.getSessionTrackingGeneration());
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(1);

        context.setUserSelection(0);
        cockpit.recordSessionTrackingSignal(signal, firstShopperRequest);
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(0);
    });

    it('keeps history on reload only when the selected context matches', async() => {
        const { default: context } = await import('@/stores/context.store');
        context.addDataset(dataset);
        const original = await import('@/stores/sessionCockpit');
        original.recordSessionTrackingSignal(signal, original.getSessionTrackingGeneration());

        vi.resetModules();
        const sameContext = await import('@/stores/sessionCockpit');
        expect(sameContext.sessionCockpit.value.signals).toHaveLength(1);

        // Simulate another tab saving the shop context while leaving this tab's session history alone.
        const savedContext = JSON.parse(localStorage.getItem('shopContext')!);
        localStorage.setItem('shopContext', JSON.stringify({ ...savedContext, selectedUserIndex: 1 }));
        vi.resetModules();
        const differentContext = await import('@/stores/sessionCockpit');
        expect(differentContext.sessionCockpit.value.signals).toHaveLength(0);
        expect(JSON.parse(sessionStorage.getItem('demoShopSessionCockpit')!).signals).toHaveLength(0);
    });
});
