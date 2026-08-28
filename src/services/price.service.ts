import { getUserCompanyIds } from '@/helpers/userContext';
import type { Company, DataValue, ProductResult, User } from '@relewise/client';

const PRICE_LIST_IDS_KEY = 'PriceListIds';
const PRICES_KEY = 'Prices';

export interface PricingContext {
    user?: User;
    companies: Company[];
    currency: string;
    now?: Date;
}

export interface SearchPricingContext {
    accessiblePriceListIds: string[];
    currency: string;
    nowUnixMs: number;
}

export interface ResolvedPrice {
    amount: number;
    currency: string;
    priceListId: string;
    dateFrom: string;
    dateTo: string;
    source: 'price-list';
}

export interface DisplayPrice {
    salesPrice: number | null;
    listPrice: number | null;
    currency: string;
    source: 'price-list' | 'relewise';
}

interface PriceListAccess {
    ids: Set<string>;
    userPriceListIds: string[];
    linkedCompanyIds: string[];
    companyLookups: Array<{
        companyId: string;
        found: boolean;
        data?: Record<string, DataValue>;
        priceListIdsDataValue?: DataValue;
        priceListIds: string[];
        parentCompanyId?: string;
    }>;
}

export class PriceService {
    private accessCache?: {
        user: User | undefined;
        companies: Company[];
        access: PriceListAccess;
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

        const access = this.getAccessiblePriceListIds(context.user, context.companies);
        if (access.ids.size === 0) {
            return null;
        }

        return {
            accessiblePriceListIds: [...access.ids],
            currency,
            nowUnixMs,
        };
    }

    public resolvePrice(product: ProductResult, context: PricingContext): ResolvedPrice | null {
        const access = this.getAccessiblePriceListIds(context.user, context.companies);
        const rawPrices = readObjectList(product.data?.[PRICES_KEY]);
        const parsedPrices = rawPrices.map(parsePrice);
        const now = context.now ?? new Date();
        const nowTimestamp = now.getTime();
        const currency = context.currency.trim().toLowerCase();

        logDiagnostics(product, 'Lookup context', {
            currency: context.currency,
            now: Number.isFinite(nowTimestamp) ? now.toISOString() : String(now),
            linkedCompanyIds: access.linkedCompanyIds,
            userPriceListIdsDataValue: context.user?.data?.[PRICE_LIST_IDS_KEY],
            userPriceListIds: access.userPriceListIds,
            companyLookups: access.companyLookups,
            accessiblePriceListIds: [...access.ids],
        });
        logDiagnostics(product, 'Raw Prices data value', product.data?.[PRICES_KEY]);
        logDiagnostics(product, 'Raw Prices entries', rawPrices);
        logDiagnostics(product, 'Parsed price records', parsedPrices);

        if (access.ids.size === 0) {
            logDiagnostics(product, 'Resolution result', 'No accessible PriceListIds were found.');
            return null;
        }

        if (!Number.isFinite(nowTimestamp)) {
            logDiagnostics(product, 'Resolution result', `The lookup date is invalid: ${String(now)}`);
            return null;
        }

        const priceChecks = parsedPrices
            .filter((price): price is ResolvedPrice => price !== null)
            .map((price) => {
                const dateFrom = Date.parse(price.dateFrom);
                const dateTo = Date.parse(price.dateTo);
                return {
                    price,
                    priceListAccessible: access.ids.has(price.priceListId.toLowerCase()),
                    currencyMatches: price.currency.toLowerCase() === currency,
                    activeNow: dateFrom <= nowTimestamp && nowTimestamp <= dateTo,
                };
            });
        const eligiblePrices = priceChecks
            .filter((check) => check.priceListAccessible && check.currencyMatches && check.activeNow)
            .map((check) => check.price);

        logDiagnostics(product, 'Price eligibility checks', priceChecks);
        logDiagnostics(product, 'Eligible price records', eligiblePrices);

        const resolvedPrice = eligiblePrices.reduce<ResolvedPrice | null>((cheapest, price) => {
            return !cheapest || price.amount < cheapest.amount ? price : cheapest;
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

        logDiagnostics(product, 'Display fallback', {
            salesPrice: product.salesPrice ?? null,
            listPrice: product.listPrice ?? null,
            currency: context.currency,
        });

        return {
            salesPrice: product.salesPrice ?? null,
            listPrice: product.listPrice ?? null,
            currency: context.currency,
            source: 'relewise',
        };
    }

    private getAccessiblePriceListIds(user: User | undefined, companies: Company[]): PriceListAccess {
        const cached = this.accessCache;
        if (cached && cached.user === user && cached.companies === companies) {
            return cached.access;
        }

        const userPriceListIds = readStringList(user?.data?.[PRICE_LIST_IDS_KEY]);
        const linkedCompanyIds = getUserCompanyIds(user);
        const priceListIds = new Set(userPriceListIds.map(normalizeId));
        const companiesById = new Map(companies.map((company) => [normalizeId(company.id), company]));
        const visitedCompanyIds = new Set<string>();
        const companyLookups: PriceListAccess['companyLookups'] = [];

        const addCompanyPriceLists = (companyId: string) => {
            const normalizedCompanyId = normalizeId(companyId);
            if (!normalizedCompanyId || visitedCompanyIds.has(normalizedCompanyId)) {
                return;
            }

            visitedCompanyIds.add(normalizedCompanyId);
            const company = companiesById.get(normalizedCompanyId);
            if (!company) {
                companyLookups.push({ companyId, found: false, priceListIds: [] });
                return;
            }

            const priceListIdsDataValue = company.data?.[PRICE_LIST_IDS_KEY];
            const companyPriceListIds = readStringList(priceListIdsDataValue);
            companyLookups.push({
                companyId: company.id,
                found: true,
                data: company.data,
                priceListIdsDataValue,
                priceListIds: companyPriceListIds,
                parentCompanyId: company.parent?.id ?? undefined,
            });
            companyPriceListIds.forEach((priceListId) => priceListIds.add(normalizeId(priceListId)));
            if (company.parent?.id) {
                addCompanyPriceLists(company.parent.id);
            }
        };

        linkedCompanyIds.forEach(addCompanyPriceLists);
        priceListIds.delete('');
        const access = {
            ids: priceListIds,
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

    const priceListId = readString(data.PriceListId);
    const amount = readNumber(data.Amount);
    const currency = readString(data.Currency);
    const dateFrom = readUnixDate(data.DateFrom);
    const dateTo = readUnixDate(data.DateTo);

    if (!priceListId || amount === null || !currency || !dateFrom || !dateTo
        || !Number.isFinite(Date.parse(dateFrom)) || !Number.isFinite(Date.parse(dateTo))) {
        return null;
    }

    return {
        amount,
        currency,
        priceListId,
        dateFrom,
        dateTo,
        source: 'price-list',
    };
}

function readUnixDate(dataValue: DataValue | undefined) {
    const unixTimestamp = readNumber(dataValue);
    if (unixTimestamp === null) {
        return '';
    }

    const date = new Date(unixTimestamp);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
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
    if (dataValue?.type !== 'String') {
        return [];
    }

    const values = parseStringArray(dataValue.value);
    if (!values) {
        return [];
    }

    return values
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
    return dataValue?.type === 'ObjectList' ? getDataValueCollection(dataValue) : [];
}

function getDataValueCollection(dataValue: DataValue | undefined): unknown[] {
    const value = dataValue?.value;
    if (!value || typeof value !== 'object') {
        return [];
    }

    const values = (value as { $values?: unknown }).$values;
    return Array.isArray(values) ? values : [];
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
