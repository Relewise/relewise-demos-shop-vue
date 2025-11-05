import router from '@/router';
import contextStore from '@/stores/context.store';
import type { RetailMediaResultPlacementResultEntityDisplayAd } from '@relewise/client';

export async function handleClick(displayAd: RetailMediaResultPlacementResultEntityDisplayAd) {
    const tracker = contextStore.getTracker();

    await tracker.trackDisplayAdClick({
        displayAdId: displayAd.result.displayAdId!,
        campaignId: displayAd.campaignId,
        user: contextStore.user.value,
    });

    if (isExternalUrl(displayAd)) {
        window.location.href = displayAd.result.data?.Link?.value;
        return;
    } else {
        router.push(displayAd.result.data?.Link?.value || '/');
    }
}

const isExternalUrl = (displayAd: RetailMediaResultPlacementResultEntityDisplayAd) => {
    const url = displayAd.result.data?.Link?.value || '/';
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {

        new URL(url);
        return true;
    } catch {
        return false;
    }
};
