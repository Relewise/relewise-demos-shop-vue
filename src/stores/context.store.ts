import { WebComponentProductTemplate } from '@/components/WebComponentProductTemplate';
import { Searcher, type Settings, Recommender, type SelectedProductPropertiesSettings, Tracker, type User, type Company, UserFactory, ConditionBuilder, DataValueFactory } from '@relewise/client';
import { initializeRelewiseUI } from '@relewise/web-components';
import { computed, reactive } from 'vue';
import { addAssortmentFilters } from './customFilters';

export interface IDataset {
    datasetId: string;
    apiKey: string;
    displayName?: string | null;
    language: string;
    currencyCode: string;
    serverUrl?: string;
    users?: User[];
    selectedUserIndex?: number;
    companies?: Company[];
}

export interface ITracking {
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
    private state = reactive<IAppContext>({ datasets: [{ datasetId: '', apiKey: '', language: '', currencyCode: '', users: [UserFactory.anonymous()], selectedUserIndex: 0, companies: [] }], selectedDatasetIndex: 0, tracking: { enabled: false } });
    private errorState = reactive<IAppErrorContext>({ datasetIdError: false, apiKeyError: false });

    constructor() {
        const storedContext = localStorage.getItem(this.localStorageName);

        if (storedContext) {
            Object.assign(this.state, JSON.parse(storedContext));
            this.initializeWebComponents();
        }
    }

    public get isConfigured() {
        return computed(() => this.context.value.datasetId && this.context.value.apiKey && this.context.value.currencyCode && this.context.value.language);
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

    public get user() {
        return computed(() => {
            this.ensureUsers();

            return this.context.value.users![this.context.value.selectedUserIndex!];
        });
    }

    public get defaultSettings(): Settings {
        if (this.state.selectedDatasetIndex < -1) {
            throw new Error('Missing language or currencycode');
        }

        return {
            language: this.context.value.language,
            currency: this.context.value.currencyCode,
            displayedAtLocation: 'Relewise Demo Store',
            user: this.user.value,
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

    public addDataset(newDataset: IDataset) {
        if (!localStorage.getItem(this.localStorageName) || (this.state.datasets.length === 1 && !this.isConfigured)) {
            // when first coming here via share link we want to remove the default created dataset
            this.state.datasets = [];
        }

        this.state.datasets.push(newDataset);
        this.setDataset(newDataset.datasetId);
    }

    public setDataset(datasetId: string) {
        this.state.selectedDatasetIndex = this.state.datasets.map(e => e.datasetId).indexOf(datasetId);
        this.persistState();
        this.initializeWebComponents();
    }

    public deleteSelected() {
        this.state.datasets.splice(this.state.selectedDatasetIndex, 1);

        this.state.selectedDatasetIndex = 0;

        this.initializeWebComponents();
        this.persistState();
    }

    public setUser(user: User) {
        this.ensureUsers();

        this.context.value.selectedUserIndex = this.context.value.users!.map(e => JSON.stringify(e)).indexOf(JSON.stringify(user));
        this.persistState();
    }

    public deleteSelectedUser() {
        if (!this.context.value.users || this.context.value.selectedUserIndex === undefined) {
            return;
        }

        this.context.value.users.splice(this.context.value.selectedUserIndex, 1);

        this.context.value.selectedUserIndex = 0;

        this.initializeWebComponents();
        this.persistState();
    }

    private ensureUsers() {
        if (!this.context.value.users || this.context.value.users.length === 0) {
            this.context.value.users = [UserFactory.anonymous()];
        }

        if (!this.context.value.selectedUserIndex) {
            this.context.value.selectedUserIndex = 0;
        }
    }

    public deleteCompanyById(id: string) {
        this.context.value.companies = this.context.value.companies?.filter(x => x.id !== id);
        this.persistState();
    }

    public assertApiCall(response: any | undefined) {
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

    public initializeWebComponents() {
        initializeRelewiseUI(
            {
                contextSettings: {
                    getUser: () => {
                        return this.user.value;
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
                    variant: { allData: true },
                },
                filters: {
                     product(builder) { addAssortmentFilters(builder); 
                     builder.addProductDataFilter("soldOut", (c:ConditionBuilder) => c.addEqualsCondition(DataValueFactory.string("true"), true), true, false, false);
                    }
                    
                },
                templates: {
                    product: (product, extentions) => {
                        return WebComponentProductTemplate(product, extentions);
                    },
                },
            }).useRecommendations(

            );
    }
}

export default new AppContext();