import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import type { IAppContext, IDataset } from '@/stores/context.store';

export function loadStoredContext(storageKey: string): IAppContext | null {
    const storedContext = localStorage.getItem(storageKey);
    if (!storedContext) {
        return null;
    }

    try {
        const parsedContext = JSON.parse(storedContext) as Partial<IAppContext>;

        return {
            selectedDatasetIndex: Number.isInteger(parsedContext.selectedDatasetIndex) ? Number(parsedContext.selectedDatasetIndex) : 0,
            selectedLanguage: typeof parsedContext.selectedLanguage === 'string' && parsedContext.selectedLanguage ? parsedContext.selectedLanguage : undefined,
            selectedCurrencyCode: typeof parsedContext.selectedCurrencyCode === 'string' && parsedContext.selectedCurrencyCode ? parsedContext.selectedCurrencyCode : undefined,
            selectedUserIndex: Number.isInteger(parsedContext.selectedUserIndex) ? Number(parsedContext.selectedUserIndex) : undefined,
            selectedCompanyId: typeof parsedContext.selectedCompanyId === 'string' && parsedContext.selectedCompanyId ? parsedContext.selectedCompanyId : undefined,
            datasets: Array.isArray(parsedContext.datasets)
                ? parsedContext.datasets.map((dataset) => normalizeDatasetConfiguration(dataset as Partial<IDataset>))
                : [],
        };
    }
    catch (error) {
        console.error('Failed to parse stored demo shop context.', error);
        return null;
    }
}

export function persistStoredContext(storageKey: string, context: IAppContext) {
    localStorage.setItem(storageKey, JSON.stringify({
        ...context,
        datasets: context.datasets.map((dataset) => normalizeDatasetConfiguration(dataset)),
    }));
}
