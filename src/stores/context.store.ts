import { WebComponentProductTemplate } from '@/components/WebComponentProductTemplate';
import { Searcher, type Settings, Recommender, type SelectedProductPropertiesSettings, Tracker, type User, type Company, UserFactory, type SelectedCategoryPropertiesSettings, type FilterBuilder, type ConditionBuilder, DataValueFactory } from '@relewise/client';
import { initializeRelewiseUI } from '@relewise/web-components';
import { computed, reactive } from 'vue';
import basketService from '@/services/basket.service';
import { globalProductRecommendationFilters } from './globalProductFilters';
import { buildContextUser, sanitizeUsers } from '@/helpers/userContext';

export interface IDataset {
    datasetId: string;
    apiKey: string;
    displayName?: string | null;
    allLanguages: string[];
    allCurrencies: string[];
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

export interface ITracking {
    enabled: boolean;
}

export interface IAppContext {
    tracking: ITracking;
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

type LegacyDataset = IDataset & {
    language?: string;
    currencyCode?: string;
    selectedUserIndex?: number;
};

function uniqueValues(values: Array<string | undefined | null>, { uppercase = false }: { uppercase?: boolean } = {}) {
    const normalized: string[] = [];

    for (const value of values) {
        const trimmedValue = uppercase ? value?.trim().toUpperCase() ?? '' : value?.trim() ?? '';
        if (!trimmedValue || normalized.some((existingValue) => existingValue.toLowerCase() === trimmedValue.toLowerCase())) {
            continue;
        }

        normalized.push(trimmedValue);
    }

    return normalized;
}

function sanitizeCompanies(companies?: Company[]) {
    return (companies ?? []).map((company) => ({
        ...company,
        id: company.id?.trim() ?? '',
        parent: company.parent?.id?.trim() ? { id: company.parent.id.trim() } as Company : undefined,
        data: company.data ? { ...company.data } : undefined,
    }));
}

export function sanitizeDatasetConfiguration(dataset: LegacyDataset): IDataset {
    return {
        datasetId: dataset.datasetId?.trim() ?? '',
        apiKey: dataset.apiKey?.trim() ?? '',
        displayName: dataset.displayName?.trim() ?? '',
        allLanguages: uniqueValues([...(dataset.allLanguages ?? []), dataset.language]),
        allCurrencies: uniqueValues([...(dataset.allCurrencies ?? []), dataset.currencyCode], { uppercase: true }),
        serverUrl: dataset.serverUrl?.trim() ?? '',
        users: sanitizeUsers(dataset.users),
        companies: sanitizeCompanies(dataset.companies),
        allowThirdLevelCategories: dataset.allowThirdLevelCategories,
        hideSoldOutProducts: dataset.hideSoldOutProducts,
        userClassificationFilters: dataset.userClassificationFilters,
        recommendationsMinutesAgo: dataset.recommendationsMinutesAgo,
        showProductRelevanceScore: dataset.showProductRelevanceScore,
        B2bRecommendations: dataset.B2bRecommendations,
        showVariantsBadge: dataset.showVariantsBadge,
        similarProductsOnPdp: dataset.similarProductsOnPdp,
        variantBasedSearchOverlay: dataset.variantBasedSearchOverlay,
        contentSearch: dataset.contentSearch,
        searchHighlight: dataset.searchHighlight,
        shoppertainmentEnabled: dataset.shoppertainmentEnabled,
    };
}

class AppContext {
    private readonly localStorageName = 'shopContext';
    private state = reactive<IAppContext>({ datasets: [], selectedDatasetIndex: 0, tracking: { enabled: false } });
    private errorState = reactive<IAppErrorContext>({ datasetIdError: false, apiKeyError: false });
    private activeContextState = reactive<IActiveContextState>({ revision: 0 });

    public static numberOfProductsToRecommend = 8;

    constructor() {
        const storedContext = localStorage.getItem(this.localStorageName);

        if (storedContext) {
            Object.assign(this.state, JSON.parse(storedContext));
            this.state.datasets = this.state.datasets.map((dataset) => sanitizeDatasetConfiguration(dataset as LegacyDataset));
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
        return computed(() => this.state.tracking);
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
                return buildContextUser(UserFactory.anonymous(), selectedCompany);
            }

            return buildContextUser(users[selectedUserIndex], selectedCompany);
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
        if (this.state.selectedDatasetIndex < -1) {
            throw new Error('Missing language or currencycode');
        }

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
        if (!this.user.value.classifications || !this.context.value.userClassificationFilters)
            return;

        const country = this.user.value.classifications['country'];
        if (country) {
            filterBuilder.addProductDataFilter('AvailableInMarkets',
                (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(country)));
        }

        const channel = this.user.value.classifications['channel'];
        if (channel) {
            filterBuilder.addProductDataFilter('AvailableInChannels',
                (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(channel)));
        }
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

    public getRecommendationsSinceMinutesAgo(): number {
        return this.context.value.recommendationsMinutesAgo ?? 20160;
    }

    public persistState() {
        this.errorState.apiKeyError = false;
        this.errorState.datasetIdError = false;

        localStorage.setItem(this.localStorageName, JSON.stringify({
            ...this.state,
            datasets: this.state.datasets.map((dataset) => ({
                ...sanitizeDatasetConfiguration(dataset as LegacyDataset),
            })),
        }));
    }

    public addDataset(newDataset: IDataset) {
        if (!localStorage.getItem(this.localStorageName)) {
            this.state.datasets = [];
        }

        this.state.datasets.push(sanitizeDatasetConfiguration(newDataset as LegacyDataset));
        this.setDataset(newDataset.datasetId);
    }

    public setDataset(datasetId: string) {
        this.state.selectedDatasetIndex = this.state.datasets.map(e => e.datasetId).indexOf(datasetId);
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
        const datasetIndex = this.state.datasets.findIndex(dataset => dataset.datasetId === datasetId);
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
        this.context.value.companies = this.context.value.companies?.filter(x => x.id !== id);
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
        initializeRelewiseUI(
            {
                contextSettings: {
                    getUser: () => {
                        return this.user.value;
                    },
                    language: this.language.value,
                    currency: this.currencyCode.value,
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
                templates: {
                    product: (product, extentions) => {
                        return WebComponentProductTemplate(product, extentions);
                    },
                },
                filters: {
                    product(builder) {
                        globalProductRecommendationFilters(builder);
                    },
                },
                userEngagement: {
                    product: {
                        favorite: true,
                    },
                    content: {
                        sentiment: true,
                    },
                },
            }).useRecommendations();
    }

    private resetSessionSelectionsForActiveDataset() {
        if (!this.hasActiveDataset.value) {
            this.clearSessionSelections();
            return;
        }

        this.state.selectedLanguage = this.context.value.allLanguages?.[0] ?? undefined;
        this.state.selectedCurrencyCode = this.context.value.allCurrencies?.[0] ?? undefined;
        this.state.selectedUserIndex = undefined;
        this.state.selectedCompanyId = undefined;
    }

    private clearSessionSelections() {
        this.state.selectedLanguage = undefined;
        this.state.selectedCurrencyCode = undefined;
        this.state.selectedUserIndex = undefined;
        this.state.selectedCompanyId = undefined;
    }

    private normalizeSessionSelections() {
        if (!this.hasActiveDataset.value) {
            this.clearSessionSelections();
            return;
        }

        const availableLanguages = this.context.value.allLanguages ?? [];
        if (!this.state.selectedLanguage || !availableLanguages.includes(this.state.selectedLanguage)) {
            this.state.selectedLanguage = availableLanguages[0] ?? undefined;
        }

        const availableCurrencies = this.context.value.allCurrencies ?? [];
        if (!this.state.selectedCurrencyCode || !availableCurrencies.includes(this.state.selectedCurrencyCode)) {
            this.state.selectedCurrencyCode = availableCurrencies[0] ?? undefined;
        }

        const users = this.context.value.users ?? [];
        if (this.state.selectedUserIndex === undefined || this.state.selectedUserIndex < 0 || this.state.selectedUserIndex >= users.length) {
            this.state.selectedUserIndex = undefined;
        }

        const companies = this.context.value.companies ?? [];
        if (!this.state.selectedCompanyId || !companies.some((company) => company.id === this.state.selectedCompanyId)) {
            this.state.selectedCompanyId = undefined;
        }
    }
}

export default new AppContext();
