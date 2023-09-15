import { WebComponentProductTemplate } from '@/components/WebComponentProductTemplate';
import { Searcher, type Settings, UserFactory, Recommender, type SelectedProductPropertiesSettings, Tracker } from '@relewise/client';
import { initializeRelewiseUI } from '@relewise/web-components';
import { computed, reactive } from 'vue';

export interface IDataset {
    datasetId: string;
    apiKey: string;
    displayName?: string|null;
    language: string;
    currencyCode: string;
    serverUrl?: string;
}

export interface ITracking {
    temporaryId?: string;
    enabled: boolean;
}

export interface IAppContext {
    tracking: ITracking;
    selectedDatasetIndex: number;
    datasets: IDataset[];

}

export interface IAppErrorContext {
    datasetIdError: boolean;
    apiKeyError: boolean;
}

class AppContext {
    private readonly localStorageName = 'shopContext';
    private state = reactive<IAppContext>({ datasets: [{datasetId: '', apiKey: '', language: '', currencyCode: ''}], selectedDatasetIndex: 0, tracking: { enabled: false } });
    private errorState = reactive<IAppErrorContext>({ datasetIdError: false, apiKeyError: false });

    constructor() {
        const storedContext = localStorage.getItem(this.localStorageName);

        if (storedContext) {
            Object.assign(this.state, JSON.parse(storedContext));
        }

        if (!this.state.tracking.temporaryId) {
            this.generateNewTemporaryId();
        }
    }

    public get context() {
        return computed(() => this.state.datasets[this.state.selectedDatasetIndex]);
    }

    public get datasets() {
        return computed(() => this.state.datasets);
    }

    public get tracking() {
        return computed(() => this.state.tracking);
    }

    public get apiKeyError() {
        return computed(() => this.errorState.apiKeyError);
    }

    public get datasetIdError() {
        return computed(() => this.errorState.datasetIdError);
    }

    public get defaultSettings(): Settings {
        if (this.state.selectedDatasetIndex < -1) {
            throw new Error('Missing language or currencycode');
        }

        return {
            language: this.context.value.language,
            currency: this.context.value.currencyCode,
            displayedAtLocation: 'Relewise Demo Store',
            user: this.getUser(),
        };
    }

    public get selectedProductProperties(): SelectedProductPropertiesSettings {
        return {
            displayName: true,
            allData: true,
            brand: true,
            categoryPaths: true,
            pricing: true,
        } as SelectedProductPropertiesSettings;
    }

    public getSearcher(): Searcher {
        if (!this.context.value.apiKey || !this.context.value.datasetId) {
            throw new Error('Missing apiKey or datasetId');
        }
        return new Searcher(this.context.value.datasetId, this.context.value.apiKey, { serverUrl: this.context.value.serverUrl });
    }

    public getRecommender(): Recommender {
        if (!this.context.value.apiKey || !this.context.value.datasetId) {
            throw new Error('Missing apiKey or datasetId');
        }
        return new Recommender(this.context.value.datasetId, this.context.value.apiKey, { serverUrl: this.context.value.serverUrl });
    }

    public getTracker(): Tracker {
        if (!this.context.value.apiKey || !this.context.value.datasetId) {
            throw new Error('Missing apiKey or datasetId');
        }
        return new Tracker(this.context.value.datasetId, this.context.value.apiKey, { serverUrl: this.context.value.serverUrl });
    }

    public persistState() {
        this.errorState.apiKeyError = false;
        this.errorState.datasetIdError = false;

        localStorage.setItem(this.localStorageName, JSON.stringify(this.state));
    }

    public isConfigured() {
        return this.context.value.datasetId && this.context.value.apiKey && this.context.value.currencyCode && this.context.value.language;
    }

    public addDataset(newDataset: IDataset) {
        if (!localStorage.getItem(this.localStorageName) || (this.state.datasets.length === 1 && !this.isConfigured())) {
            // when first coming here via share link we want to remove the default created dataset
            this.state.datasets = [];
        }

        this.state.datasets.push(newDataset);
        this.setDataset(newDataset.datasetId);
    }

    public setDataset(datasetId: string) {        
        this.state.selectedDatasetIndex = this.state.datasets.map(e => e.datasetId).indexOf(datasetId);
        this.generateNewTemporaryId();
        this.persistState();
    }

    public generateNewTemporaryId() {
        this.tracking.value.temporaryId = crypto.randomUUID();
        this.persistState();
    }

    public deleteSelected() {
        this.state.datasets.splice(this.state.selectedDatasetIndex, 1);

        this.state.selectedDatasetIndex = 0;

        this.persistState();
    }

    public assertApiCall(response: any|undefined) {
        if (response.status === 401) {
            this.errorState.datasetIdError = false;
            this.errorState.apiKeyError = true;
        }
        else if (response.status === 404) {
            this.errorState.datasetIdError = true;
            this.errorState.apiKeyError = false;
        }
        else {
            this.errorState.datasetIdError = false;
            this.errorState.apiKeyError = false;
        }
    }

    public getUser() {
        return this.state.tracking.enabled && this.state.tracking.temporaryId 
            ? UserFactory.byTemporaryId(this.state.tracking.temporaryId)
            : UserFactory.anonymous();
    }

    public initializeWebComponents() {
        initializeRelewiseUI(
            {
                contextSettings: {
                    getUser: () => {
                        return this.getUser();
                    },
                    language: this.context.value.language,
                    currency: this.context.value.currencyCode,
                },
                datasetId: this.context.value.datasetId,
                apiKey: this.context.value.apiKey,
                clientOptions: {
                    serverUrl: this.context.value.serverUrl,
                },
                selectedPropertiesSettings: {
                    product: this.selectedProductProperties,
                },
                templates: {
                    product: (product, extentions) => {
                        return WebComponentProductTemplate(product, extentions);
                    },
                },
            });
    }
}

export default new AppContext();