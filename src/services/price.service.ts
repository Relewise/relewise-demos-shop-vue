import { getUserCompanyIds } from '@/helpers/userContext';
import type { Company, DataValue, ProductResult, User } from '@relewise/client';

const PRICE_LIST_IDS_KEY = 'PriceListIds';
const AGREED_ORDER_SCOPE_IDS_KEY = 'AgreedOrderScopeIds';
const PRICES_KEY = 'Prices';

export type ScopedPriceSource = 'PriceList' | 'AgreedOrder';

export interface PricingContext {
    user?: User;
    companies: Company[];
    currency: string;
    now?: Date;
}

export interface SearchPricingContext {
    accessibleScopeIds: string[];
    accessibleAgreedOrderScopeIds: string[];
    accessibleCompanyIds: string[];
    currency: string;
    nowUnixMs: number;
}

export interface ResolvedPrice {
    amount: number;
    currency: string;
    scopeId: string;
    dateFromUnixMs: number;
    dateToUnixMs: number;
    source: ScopedPriceSource;
}

export interface DisplayPrice {
    salesPrice: number | null;
    listPrice: number | null;
    currency: string;
    source: ScopedPriceSource | 'Relewise';
}

interface ScopeAccess {
    scopeIds: Set<string>;
    agreedOrderScopeIds: Set<string>;
    companyIds: Set<string>;
    userPriceListIds: string[];
    linkedCompanyIds: string[];
    companyLookups: Array<{
        companyId: string;
        found: boolean;
        data?: Record<string, DataValue>;
        priceListIds: string[];
        agreedOrderScopeIds: string[];
        parentCompanyId?: string;
    }>;
}

export class PriceService {
    private accessCache?: {
        user: User | undefined;
        companies: Company[];
        access: ScopeAccess;
    };

    public clearAccessCache() {
        this.accessCache = undefined;
    }

    public createSearchPricingContext(context: PricingContext, now: Date = context.now ?? new Date()): SearchPricingContext | null {
        const nowUnixMs = now.getTime();
        const currency = context.currency.trim();
        if (!Number.isFinite(nowUnixMs) || !currency) {
            return null;
        }

        const access = this.getAccessibleScopes(context.user, context.companies);
        if (access.scopeIds.size === 0) {
            return null;
        }

        return {
            accessibleScopeIds: [...access.scopeIds],
            accessibleAgreedOrderScopeIds: [...access.agreedOrderScopeIds],
            accessibleCompanyIds: [...access.companyIds],
            currency,
            nowUnixMs,
        };
    }

    public resolvePrice(product: ProductResult, context: PricingContext): ResolvedPrice | null {
        const access = this.getAccessibleScopes(context.user, context.companies);
        const rawPrices = readObjectList(product.data?.[PRICES_KEY]);
        const parsedPrices = rawPrices.map(parsePrice);
        const now = context.now ?? new Date();
        const nowUnixMs = now.getTime();
        const currency = context.currency.trim().toLowerCase();

        logDiagnostics(product, 'Lookup context', {
            currency: context.currency,
            now: Number.isFinite(nowUnixMs) ? now.toISOString() : String(now),
            linkedCompanyIds: access.linkedCompanyIds,
            userPriceListIds: access.userPriceListIds,
            companyLookups: access.companyLookups,
            accessibleScopeIds: [...access.scopeIds],
            accessibleAgreedOrderScopeIds: [...access.agreedOrderScopeIds],
            accessibleCompanyIds: [...access.companyIds],
        });
        logDiagnostics(product, 'Raw Prices data value', product.data?.[PRICES_KEY]);
        logDiagnostics(product, 'Raw Prices entries', rawPrices);
        logDiagnostics(product, 'Parsed price records', parsedPrices);

        if (access.scopeIds.size === 0 || !Number.isFinite(nowUnixMs)) {
            return null;
        }

        const priceChecks = parsedPrices
            .filter((price): price is ResolvedPrice => price !== null)
            .map((price) => ({
                price,
                scopeAccessible: access.scopeIds.has(normalizeId(price.scopeId)),
                currencyMatches: price.currency.toLowerCase() === currency,
                activeNow: price.dateFromUnixMs <= nowUnixMs && nowUnixMs <= price.dateToUnixMs,
            }));
        const eligiblePrices = priceChecks
            .filter((check) => check.scopeAccessible && check.currencyMatches && check.activeNow)
            .map((check) => check.price);

        logDiagnostics(product, 'Price eligibility checks', priceChecks);
        logDiagnostics(product, 'Eligible price records', eligiblePrices);

        const resolvedPrice = eligiblePrices.reduce<ResolvedPrice | null>((cheapest, price) => {
            if (!cheapest || price.amount < cheapest.amount) {
                return price;
            }

            if (price.amount === cheapest.amount && price.source === 'AgreedOrder' && cheapest.source === 'PriceList') {
                return price;
            }

            return cheapest;
        }, null);
        logDiagnostics(product, 'Resolved cheapest price', resolvedPrice);
        return resolvedPrice;
    }

    public resolveDisplayPrice(product: ProductResult, context: PricingContext): DisplayPrice {
        const resolvedPrice = this.resolvePrice(product, context);
        if (resolvedPrice) {
            return {
                salesPrice: resolvedPrice.amount,
                listPrice: null,
                currency: resolvedPrice.currency,
                source: resolvedPrice.source,
            };
        }

        const hasAccessibleScopes = this.getAccessibleScopes(context.user, context.companies).scopeIds.size > 0;
        const fallback = {
            salesPrice: hasAccessibleScopes ? null : product.salesPrice ?? null,
            listPrice: hasAccessibleScopes ? null : product.listPrice ?? null,
            currency: context.currency,
            source: 'Relewise' as const,
        };
        logDiagnostics(product, 'Display fallback', fallback);
        return fallback;
    }

    private getAccessibleScopes(user: User | undefined, companies: Company[]): ScopeAccess {
        const cached = this.accessCache;
        if (cached && cached.user === user && cached.companies === companies) {
            return cached.access;
        }

        const userPriceListIds = readStringList(user?.data?.[PRICE_LIST_IDS_KEY]);
        const linkedCompanyIds = getUserCompanyIds(user);
        const scopeIds = new Set(userPriceListIds.map(normalizeId));
        const agreedOrderScopeIds = new Set<string>();
        const companyIds = new Set<string>();
        const companiesById = new Map(companies.map((company) => [normalizeId(company.id), company]));
        const visitedCompanyIds = new Set<string>();
        const companyLookups: ScopeAccess['companyLookups'] = [];

        const addCompanyScopes = (companyId: string) => {
            const normalizedCompanyId = normalizeId(companyId);
            if (!normalizedCompanyId || visitedCompanyIds.has(normalizedCompanyId)) {
                return;
            }

            visitedCompanyIds.add(normalizedCompanyId);
            const company = companiesById.get(normalizedCompanyId);
            if (!company) {
                companyLookups.push({ companyId, found: false, priceListIds: [], agreedOrderScopeIds: [] });
                return;
            }

            companyIds.add(normalizedCompanyId);
            const companyPriceListIds = readStringList(company.data?.[PRICE_LIST_IDS_KEY]);
            const companyAgreedOrderScopeIds = readStringList(company.data?.[AGREED_ORDER_SCOPE_IDS_KEY]);
            companyLookups.push({
                companyId: company.id,
                found: true,
                data: company.data,
                priceListIds: companyPriceListIds,
                agreedOrderScopeIds: companyAgreedOrderScopeIds,
                parentCompanyId: company.parent?.id ?? undefined,
            });
            companyPriceListIds.forEach((scopeId) => scopeIds.add(normalizeId(scopeId)));
            companyAgreedOrderScopeIds.forEach((scopeId) => {
                const normalizedScopeId = normalizeId(scopeId);
                scopeIds.add(normalizedScopeId);
                agreedOrderScopeIds.add(normalizedScopeId);
            });
            if (company.parent?.id) {
                addCompanyScopes(company.parent.id);
            }
        };

        linkedCompanyIds.forEach(addCompanyScopes);
        scopeIds.delete('');
        agreedOrderScopeIds.delete('');
        companyIds.delete('');
        const access = {
            scopeIds,
            agreedOrderScopeIds,
            companyIds,
            userPriceListIds,
            linkedCompanyIds,
            companyLookups,
        };
        this.accessCache = { user, companies, access };
        return access;
    }
}

function parsePrice(value: unknown): ResolvedPrice | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const data = (value as { data?: Record<string, DataValue> }).data;
    if (!data) {
        return null;
    }

    const scopeId = readString(data.ScopeId);
    const source = readPriceSource(data.Source);
    const amount = readNumber(data.Amount);
    const currency = readString(data.Currency);
    const dateFromUnixMs = readNumber(data.DateFrom);
    const dateToUnixMs = readNumber(data.DateTo);

    if (!scopeId || !source || amount === null || !currency || dateFromUnixMs === null || dateToUnixMs === null) {
        return null;
    }

    return {
        amount,
        currency,
        scopeId,
        dateFromUnixMs,
        dateToUnixMs,
        source,
    };
}

function readPriceSource(dataValue: DataValue | undefined): ScopedPriceSource | null {
    const source = readString(dataValue);
    return source === 'PriceList' || source === 'AgreedOrder' ? source : null;
}

function readString(dataValue: DataValue | undefined) {
    return dataValue?.type === 'String' && typeof dataValue.value === 'string'
        ? dataValue.value.trim()
        : '';
}

function readNumber(dataValue: DataValue | undefined) {
    return dataValue?.type === 'Double' && typeof dataValue.value === 'number' && Number.isFinite(dataValue.value)
        ? dataValue.value
        : null;
}

function readStringList(dataValue: DataValue | undefined) {
    if (!dataValue || (dataValue.type !== 'String' && dataValue.type !== 'StringList')) {
        return [];
    }

    const values = dataValue.type === 'StringList'
        ? getWrappedCollection(dataValue.value)
        : parseStringArray(dataValue.value);

    return (values ?? [])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean);
}

function parseStringArray(value: unknown): unknown[] | null {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return null;
    }

    try {
        const parsedValue = JSON.parse(value) as unknown;
        return Array.isArray(parsedValue) ? parsedValue : null;
    } catch {
        return null;
    }
}

function readObjectList(dataValue: DataValue | undefined) {
    return dataValue?.type === 'ObjectList' ? getWrappedCollection(dataValue.value) ?? [] : [];
}

function getWrappedCollection(value: unknown): unknown[] | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const values = (value as { $values?: unknown }).$values;
    return Array.isArray(values) ? values : null;
}

function normalizeId(value: string) {
    return value.trim().toLowerCase();
}

function logDiagnostics(product: ProductResult, label: string, value: unknown) {
    if (import.meta.env.MODE === 'test' || import.meta.env.VITE_PRICE_SERVICE_DEBUG !== 'true') {
        return;
    }

    console.log(`[PriceService] ${product.productId ?? '(missing product id)'} — ${label}`, value);
}

export default new PriceService();
