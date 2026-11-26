import type { Company } from '@relewise/client';

export type DemoCompany = Company & { assortmentIds?: number[] };

export function parseAssortmentId(value: string) {
    const id = Number(value);
    return /^-?\d+$/.test(value) && isAssortmentId(id) ? id : undefined;
}

export function normalizeCompanyAssortmentIds(value: unknown) {
    if (!Array.isArray(value)) return undefined;

    return [...new Set(value.filter(isAssortmentId))].sort((left, right) => left - right);
}

function isAssortmentId(value: unknown): value is number {
    // Relewise stores assortment IDs as signed 32-bit integers.
    return typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
}
