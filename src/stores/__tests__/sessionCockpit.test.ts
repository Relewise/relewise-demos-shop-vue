import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.stubGlobal('crypto', webcrypto);
});

afterEach(() => vi.unstubAllGlobals());

describe('session cockpit shopper context', () => {
    it('discards late responses after switching shoppers, even when switching back', async() => {
        const { default: context } = await import('@/stores/context.store');
        context.addDataset(dataset);
        const cockpit = await import('@/stores/sessionCockpit');
        const firstShopperRequest = cockpit.getSessionTrackingGeneration();
        cockpit.setSessionCockpitOpen(true);
        await cockpit.recordSessionTrackingSignal(signal, firstShopperRequest);
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(1);

        context.applySessionContext({ datasetId: 'demo', language: 'da', currencyCode: 'EUR', selectedUserIndex: 0 });
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(1);

        context.setUserSelection(1);
        expect(cockpit.sessionCockpit.value).toMatchObject({ open: true, signals: [] });
        await cockpit.recordSessionTrackingSignal(signal, firstShopperRequest);
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(0);
        await cockpit.recordSessionTrackingSignal(signal, cockpit.getSessionTrackingGeneration());
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(1);

        context.setUserSelection(0);
        await cockpit.recordSessionTrackingSignal(signal, firstShopperRequest);
        expect(cockpit.sessionCockpit.value.signals).toHaveLength(0);
    });

    it('keeps history on reload only when the selected context matches', async() => {
        const { default: context } = await import('@/stores/context.store');
        context.addDataset(dataset);
        const original = await import('@/stores/sessionCockpit');
        await original.recordSessionTrackingSignal(signal, original.getSessionTrackingGeneration());

        vi.resetModules();
        const sameContext = await import('@/stores/sessionCockpit');
        await vi.waitFor(() => expect(sameContext.sessionCockpit.value.signals).toHaveLength(1));

        // Simulate another tab saving the shop context while leaving this tab's session history alone.
        const savedContext = JSON.parse(localStorage.getItem('shopContext')!);
        localStorage.setItem('shopContext', JSON.stringify({ ...savedContext, selectedUserIndex: 1 }));
        vi.resetModules();
        const differentContext = await import('@/stores/sessionCockpit');
        expect(differentContext.sessionCockpit.value.signals).toHaveLength(0);
        await vi.waitFor(() => expect(JSON.parse(sessionStorage.getItem('demoShopSessionCockpit')!).signals).toHaveLength(0));
    });

    it('discards saved history when the user at the same index changes in another tab', async() => {
        const { default: context } = await import('@/stores/context.store');
        context.addDataset(dataset);
        const original = await import('@/stores/sessionCockpit');
        original.setSessionCockpitOpen(true);
        await original.recordSessionTrackingSignal(signal, original.getSessionTrackingGeneration());
        expect(original.sessionCockpit.value.signals).toHaveLength(1);

        const savedContext = JSON.parse(localStorage.getItem('shopContext')!);
        const userIndex = savedContext.selectedUserIndex;
        savedContext.datasets[0].users[userIndex].temporaryId = 'replacement';
        localStorage.setItem('shopContext', JSON.stringify(savedContext));

        vi.resetModules();
        const reloaded = await import('@/stores/sessionCockpit');
        expect(reloaded.sessionCockpit.value).toMatchObject({ open: true, signals: [] });
        await vi.waitFor(() => expect(JSON.parse(sessionStorage.getItem('demoShopSessionCockpit')!).signals).toHaveLength(0));
    });
});
