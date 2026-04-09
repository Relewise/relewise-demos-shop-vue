import { DataValueFactory, type DataValue } from '@relewise/client';
import type { KeyValue } from '@/components/KeyValues.vue';
import type { Company, User } from '@relewise/client';

export const USER_METADATA_DRAFT_KEY = '__userMetadataDraft';
export const COMPANY_DATA_DRAFT_KEY = '__companyDataDraft';

type UserMetadataDraft = {
    classifications: KeyValue[];
    identifiers: KeyValue[];
    data: KeyValue[];
};

type CompanyDataDraft = {
    data: KeyValue[];
};

export function keyValuesFromStringRecord(record?: Record<string, string | null>) {
    return Object.entries(record ?? {}).map(([key, value]) => ({
        key,
        value: value ?? '',
    }));
}

export function keyValuesFromDataRecord(record?: Record<string, DataValue>) {
    return Object.entries(record ?? {}).map(([key, value]) => ({
        key,
        value: value?.type === 'String' ? String(value.value) : null,
    }));
}

export function keyValueArrayToStringRecord(items: KeyValue[]) {
    return items.reduce((acc, entry) => {
        const key = entry.key.trim();
        const value = entry.value?.trim() ?? '';
        if (!key || !value) {
            return acc;
        }

        acc[key] = value;
        return acc;
    }, {} as Record<string, string | null>);
}

export function keyValueArrayToDataRecord(items: KeyValue[]) {
    return items.reduce((acc, entry) => {
        const key = entry.key.trim();
        const value = entry.value?.trim() ?? '';
        if (!key || !value) {
            return acc;
        }

        acc[key] = DataValueFactory.string(value);
        return acc;
    }, {} as Record<string, DataValue>);
}

export function hasIncompleteKeyValueRows(items: KeyValue[]) {
    return items.some((entry) => {
        const key = entry.key?.trim() ?? '';
        const value = entry.value?.trim() ?? '';
        return Boolean((key || value) && !(key && value));
    });
}

export function hasDuplicateKeyValueKeys(items: KeyValue[]) {
    const seenKeys = new Set<string>();

    for (const entry of items) {
        const normalizedKey = entry.key?.trim().toLowerCase() ?? '';
        if (!normalizedKey) {
            continue;
        }

        if (seenKeys.has(normalizedKey)) {
            return true;
        }

        seenKeys.add(normalizedKey);
    }

    return false;
}

export function setUserMetadataDraft(user: User, draft: UserMetadataDraft) {
    Object.assign(user, {
        [USER_METADATA_DRAFT_KEY]: {
            classifications: draft.classifications.map(cloneKeyValue),
            identifiers: draft.identifiers.map(cloneKeyValue),
            data: draft.data.map(cloneKeyValue),
        },
    });
}

export function getUserMetadataDraft(user: User | undefined) {
    return user ? (user as User & Record<string, UserMetadataDraft | undefined>)[USER_METADATA_DRAFT_KEY] : undefined;
}

export function setCompanyDataDraft(company: Company, draft: CompanyDataDraft) {
    Object.assign(company, {
        [COMPANY_DATA_DRAFT_KEY]: {
            data: draft.data.map(cloneKeyValue),
        },
    });
}

export function getCompanyDataDraft(company: Company | undefined) {
    return company ? (company as Company & Record<string, CompanyDataDraft | undefined>)[COMPANY_DATA_DRAFT_KEY] : undefined;
}

function cloneKeyValue(entry: KeyValue) {
    return {
        key: entry.key,
        value: entry.value ?? '',
    };
}
