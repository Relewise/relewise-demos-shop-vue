import type { IDataset } from '@/stores/context.store';

type DatasetCoreFields = Pick<IDataset, 'displayName' | 'datasetId' | 'apiKey' | 'serverUrl'>;

export function validateDatasetCoreFields(dataset: DatasetCoreFields) {
    const errors: string[] = [];

    if (!dataset.displayName?.trim()) {
        errors.push('A dataset name is required.');
    }

    if (!dataset.datasetId?.trim()) {
        errors.push('A dataset ID is required.');
    }

    if (!dataset.apiKey?.trim()) {
        errors.push('An API Key is required.');
    }

    const serverUrl = dataset.serverUrl?.trim() ?? '';
    if (!serverUrl) {
        errors.push('A Server URL is required.');
    }
    else if (!isValidServerUrl(serverUrl)) {
        errors.push('Server URL must be a valid absolute http:// or https:// URL.');
    }

    return errors;
}

function isValidServerUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
