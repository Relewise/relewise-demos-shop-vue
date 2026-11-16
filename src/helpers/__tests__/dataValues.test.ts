import { describe, expect, it } from 'vitest';
import { DataValueFactory as D } from '@relewise/client';
import { normalizeDatasetConfiguration } from '../datasetConfiguration';
import { buildContextUser } from '../userContext';
import { dataValueText } from '../dataValues';

describe('shared collection data', () => {
    it.each([{ values: [] }, { values: ['electrical', 'shared'] }])('normalizes imported, cached and runtime company lists without changing permissions: %j', ({ values }) => {
        const legacy = { type: 'StringList' as const, isCollection: true, value: { $values: values } };
        const company = { id: 'child', parent: { id: 'parent' }, data: { AllowedPurchasingContracts: legacy } };
        const parent = { id: 'parent', data: { AllowedPurchasingContracts: legacy } };
        const config = normalizeDatasetConfiguration({ companies: [company, parent], users: [{ data: { tags: legacy } }] });
        expect(config.companies?.[0].data?.AllowedPurchasingContracts).toEqual(D.stringCollection(values));
        expect(config.users?.[0].data?.tags).toEqual(D.stringCollection(values));
        const user = buildContextUser(config.users?.[0], company, [parent]);
        expect(user.company?.data?.AllowedPurchasingContracts).toEqual(D.stringCollection(values));
        expect(user.company?.parent?.data?.AllowedPurchasingContracts).toEqual(D.stringCollection(values));
        expect(legacy.value).toEqual({ $values: values });
    });

    it('formats scalars, collections, and absent values without leaking objects', () => {
        expect(dataValueText(D.string('Steel'))).toBe('Steel');
        expect(dataValueText(D.number(0))).toBe('0');
        expect(dataValueText(D.boolean(false))).toBe('false');
        expect(dataValueText(D.stringCollection([]))).toBe('');
        expect(dataValueText()).toBe('');
    });
});
