import { type Settings, type SelectedProductPropertiesSettings, type SelectedCategoryPropertiesSettings, type User, type Company, UserFactory, type FilterBuilder, type ConditionBuilder, DataValueFactory } from '@relewise/client';
import { computed, reactive } from 'vue';
import basketService from '@/services/basket.service';
import { globalProductRecommendationFilters } from './globalProductFilters';
import { buildContextUser } from '@/helpers/userContext';
import { createRecommenderForDataset, createSearcherForDataset, createTrackerForDataset, initializeWebComponentsForDataset } from '@/helpers/contextApi';
import { clearSessionSelections, createSessionSelectionsForDataset, normalizeSessionSelectionsForDataset, type SessionSelections } from '@/helpers/contextSession';
import { normalizeDatasetConfiguration } from '@/helpers/datasetConfiguration';
import { loadStoredContext, persistStoredContext } from '@/helpers/contextStorage';

export interface IDataset {
    datasetId: string;
    apiKey: string;
    displayName?: string | null;
    allLanguages: string[];
    allCurrencies: string[];
    trackingEnabled?: boolean;
    serverUrl?: string;
    users?: User[];
    companies?: Company[];
    allowThirdLevelCategories?: boolean;
    hideSoldOutProducts?: boolean;
    userClassificationFilters?: boolean;
    recommendationsMinutesAgo?: number;
    showProductRelevanceScore?: boolean;
    B2bRecommendations?: boolean;
    showVariantsBadge?: boolean;
    similarProductsOnPdp?: boolean;
    variantBasedSearchOverlay?: boolean;
    contentSearch?: boolean;
    searchHighlight?: boolean;
    shoppertainmentEnabled?: boolean;
}

export interface IAppContext {
    selectedDatasetIndex: number;
    selectedLanguage?: string;
    selectedCurrencyCode?: string;
    selectedUserIndex?: number;
    selectedCompanyId?: string;
    datasets: IDataset[];
}

export interface IAppErrorContext {
    datasetIdError: boolean;
    apiKeyError: boolean;
}

interface IActiveContextState {
    revision: number;
}

class AppContext {
    private readonly localStorageName = 'shopContext';
    private state = reactive<IAppContext>({ datasets: [], selectedDatasetIndex: 0 });
    private errorState = reactive<IAppErrorContext>({ datasetIdError: false, apiKeyError: false });
    private activeContextState = reactive<IActiveContextState>({ revision: 0 });

    public static numberOfProductsToRecommend = 8;

    constructor() {
        const storedContext = loadStoredContext(this.localStorageName);

        if (storedContext) {
            Object.assign(this.state, storedContext);
            this.normalizeSessionSelections();
            if (this.hasActiveDataset.value) {
                this.initializeWebComponents();
            }
        }
    }

    public get hasActiveDataset() {
        return computed(() => {
            return this.state.datasets.length > 0
                && this.state.selectedDatasetIndex >= 0
                && this.state.selectedDatasetIndex < this.state.datasets.length
                && !!this.state.datasets[this.state.selectedDatasetIndex];
        });
    }

    public get isConfigured() {
        return computed(() => {
            if (!this.hasActiveDataset.value) {
                return false;
            }

            return !!(this.context.value.datasetId && this.context.value.apiKey && this.language.value && this.currencyCode.value);
        });
    }

    public get context() {
        return computed(() => this.state.datasets[this.state.selectedDatasetIndex]!);
    }

    public get datasets() {
        return computed(() => this.state.datasets);
    }

    public get language() {
        return computed(() => this.state.selectedLanguage ?? '');
    }

    public get currencyCode() {
        return computed(() => this.state.selectedCurrencyCode ?? '');
    }

    public get selectedUserIndex() {
        return computed(() => {
            if (!this.hasActiveDataset.value) {
                return undefined;
            }

            const users = this.context.value.users ?? [];
            if (this.state.selectedUserIndex === undefined || this.state.selectedUserIndex < 0 || this.state.selectedUserIndex >= users.length) {
                return undefined;
            }

            return this.state.selectedUserIndex;
        });
    }

    public get tracking() {
        return computed(() => ({
            enabled: this.hasActiveDataset.value ? (this.context.value.trackingEnabled ?? false) : false,
        }));
    }

    public get apiKeyError() {
        return computed(() => this.errorState.apiKeyError);
    }

    public get datasetIdError() {
        return computed(() => this.errorState.datasetIdError);
    }

    public get activeContextRevision() {
        return computed(() => this.activeContextState.revision);
    }

    public get user() {
        return computed(() => {
            if (!this.hasActiveDataset.value) {
                return buildContextUser(UserFactory.anonymous(), undefined);
            }

            const users = this.context.value.users ?? [];
            const selectedUserIndex = this.selectedUserIndex.value;
            const selectedCompany = this.selectedCompany.value;
            if (selectedUserIndex === undefined || selectedUserIndex < 0 || selectedUserIndex >= users.length) {
                return buildContextUser(UserFactory.anonymous(), selectedCompany, this.context.value.companies ?? []);
            }

            return buildContextUser(users[selectedUserIndex], selectedCompany, this.context.value.companies ?? []);
        });
    }

    public get selectedCompanyId() {
        return computed(() => this.state.selectedCompanyId ?? '');
    }

    public get selectedCompany() {
        return computed(() => {
            if (!this.hasActiveDataset.value || !this.state.selectedCompanyId) {
                return undefined;
            }

            return this.context.value.companies?.find((company) => company.id === this.state.selectedCompanyId);
        });
    }

    public get defaultSettings(): Settings {
        return {
            language: this.language.value,
            currency: this.currencyCode.value,
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
            allVariants: true,
            score: {
                adjusted: true,
                relevance: true,
            },
            userEngagement: true,
        } as SelectedProductPropertiesSettings;
    }

    public get selectedContentProperties(): SelectedProductPropertiesSettings {
        return {
            displayName: true,
            brand: true,
            categoryPaths: true,
            pricing: true,
            dataKeys: ['ByLine', 'Body', 'Image', 'Summary'],
            userEngagement: true,
        } as SelectedProductPropertiesSettings;
    }

    public get selectedCategoryProperties(): SelectedCategoryPropertiesSettings {
        return {
            displayName: true,
            dataKeys: ['Image'],
        } as SelectedCategoryPropertiesSettings;
    }

    public get numberOfProductsToRecommend(): number {
        return AppContext.numberOfProductsToRecommend;
    }

    public userClassificationBasedFilters(filterBuilder: FilterBuilder) {
        if (!this.user.value.classifications || !this.context.value.userClassificationFilters) {
            return;
        }

        const country = this.user.value.classifications.country;
        if (country) {
            filterBuilder.addProductDataFilter('AvailableInMarkets',
                (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(country)));
        }

        const channel = this.user.value.classifications.channel;
        if (channel) {
            filterBuilder.addProductDataFilter('AvailableInChannels',
                (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(channel)));
        }
    }

    public getSearcher() {
        return createSearcherForDataset(this.context.value);
    }

    public getRecommender() {
        return createRecommenderForDataset(this.context.value);
    }

    public getTracker() {
        return createTrackerForDataset(this.context.value);
    }

    public getRecommendationsSinceMinutesAgo(): number {
        return this.context.value.recommendationsMinutesAgo ?? 20160;
    }

    public persistState() {
        this.errorState.apiKeyError = false;
        this.errorState.datasetIdError = false;

        persistStoredContext(this.localStorageName, {
            ...this.state,
            datasets: this.state.datasets.map((dataset) => normalizeDatasetConfiguration(dataset)),
        });
    }

    public addDataset(newDataset: IDataset) {
        if (!localStorage.getItem(this.localStorageName)) {
            this.state.datasets = [];
        }

        this.state.datasets.push(normalizeDatasetConfiguration(newDataset));
        this.setDataset(newDataset.datasetId);
    }

    public setDataset(datasetId: string) {
        this.state.selectedDatasetIndex = this.state.datasets.map((entry) => entry.datasetId).indexOf(datasetId);
        this.resetSessionSelectionsForActiveDataset();
        this.refreshActiveContext({ clearBasket: true });
    }

    public deleteSelected() {
        this.state.datasets.splice(this.state.selectedDatasetIndex, 1);

        this.state.selectedDatasetIndex = 0;
        this.resetSessionSelectionsForActiveDataset();

        this.refreshActiveContext();
    }

    public deleteDatasetById(datasetId: string) {
        const datasetIndex = this.state.datasets.findIndex((dataset) => dataset.datasetId === datasetId);
        if (datasetIndex < 0) {
            return;
        }

        this.state.datasets.splice(datasetIndex, 1);

        if (this.state.datasets.length === 0) {
            this.state.selectedDatasetIndex = 0;
            this.resetSessionSelectionsForActiveDataset();
            this.refreshActiveContext();
            return;
        }

        if (this.state.selectedDatasetIndex > datasetIndex) {
            this.state.selectedDatasetIndex -= 1;
        }
        else if (this.state.selectedDatasetIndex >= this.state.datasets.length || this.state.selectedDatasetIndex === datasetIndex) {
            this.state.selectedDatasetIndex = 0;
        }

        this.resetSessionSelectionsForActiveDataset();
        this.refreshActiveContext();
    }

    public setUser(user: User) {
        const users = this.context.value.users ?? [];
        if (!users.length) {
            return;
        }

        const selectedUserIndex = users.indexOf(user);
        if (selectedUserIndex < 0) {
            return;
        }

        this.setUserSelection(selectedUserIndex);
    }

    public setUserSelection(selectedUserIndex: number | undefined) {
        this.state.selectedUserIndex = selectedUserIndex;
        basketService.clear();
        this.persistState();
    }

    public applySessionContext({
        datasetId,
        language,
        currencyCode,
        selectedUserIndex,
        selectedCompanyId,
    }: {
        datasetId: string;
        language: string;
        currencyCode: string;
        selectedUserIndex?: number;
        selectedCompanyId?: string;
    }) {
        const currentDatasetId = this.hasActiveDataset.value ? this.context.value.datasetId : '';
        const currentUserIndex = this.selectedUserIndex.value;
        const shouldClearBasket = datasetId !== currentDatasetId || selectedUserIndex !== currentUserIndex;
        const nextDatasetIndex = this.state.datasets.findIndex((dataset) => dataset.datasetId === datasetId);

        if (nextDatasetIndex < 0) {
            return;
        }

        this.state.selectedDatasetIndex = nextDatasetIndex;
        this.setSessionSelections({
            selectedLanguage: language || undefined,
            selectedCurrencyCode: currencyCode || undefined,
            selectedUserIndex,
            selectedCompanyId: selectedCompanyId || undefined,
        });

        this.refreshActiveContext({ clearBasket: shouldClearBasket });
    }

    public setLanguage(language: string) {
        this.state.selectedLanguage = language || undefined;
    }

    public setCurrency(currency: string) {
        this.state.selectedCurrencyCode = currency || undefined;
    }

    public setCompany(companyId: string) {
        this.state.selectedCompanyId = companyId || undefined;
    }

    public deleteSelectedUser() {
        if (!this.context.value.users || this.selectedUserIndex.value === undefined) {
            return;
        }

        this.context.value.users.splice(this.selectedUserIndex.value, 1);

        this.normalizeSessionSelections();

        this.initializeWebComponents();
        this.persistState();
    }

    public refreshActiveContext({ clearBasket = false }: { clearBasket?: boolean } = {}) {
        if (clearBasket) {
            basketService.clear();
        }

        this.normalizeSessionSelections();
        this.persistState();

        if (this.hasActiveDataset.value) {
            this.initializeWebComponents();
        }

        this.activeContextState.revision += 1;
    }

    public deleteCompanyById(id: string) {
        this.context.value.companies = this.context.value.companies?.filter((company) => company.id !== id);
        this.normalizeSessionSelections();
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
        initializeWebComponentsForDataset({
            dataset: this.context.value,
            language: this.language.value,
            currencyCode: this.currencyCode.value,
            user: this.user.value,
            selectedProductProperties: this.selectedProductProperties,
        });
    }

    private resetSessionSelectionsForActiveDataset() {
        this.setSessionSelections(createSessionSelectionsForDataset(this.hasActiveDataset.value ? this.context.value : undefined));
    }

    private normalizeSessionSelections() {
        this.setSessionSelections(
            normalizeSessionSelectionsForDataset(this.hasActiveDataset.value ? this.context.value : undefined, this.currentSessionSelections),
        );
    }

    private get currentSessionSelections(): SessionSelections {
        return {
            selectedLanguage: this.state.selectedLanguage,
            selectedCurrencyCode: this.state.selectedCurrencyCode,
            selectedUserIndex: this.state.selectedUserIndex,
            selectedCompanyId: this.state.selectedCompanyId,
        };
    }

    private setSessionSelections(selections: SessionSelections) {
        const nextSelections = selections ?? clearSessionSelections();
        this.state.selectedLanguage = nextSelections.selectedLanguage;
        this.state.selectedCurrencyCode = nextSelections.selectedCurrencyCode;
        this.state.selectedUserIndex = nextSelections.selectedUserIndex;
        this.state.selectedCompanyId = nextSelections.selectedCompanyId;
    }
}

export default new AppContext();
