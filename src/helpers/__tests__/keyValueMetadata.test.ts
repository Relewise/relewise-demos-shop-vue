import { expect, it } from 'vitest';
import { DataValueFactory as D } from '@relewise/client';
import { keyValuesFromDataRecord, keyValueArrayToDataRecord } from '../keyValueMetadata';

it('shows typed string-list values and preserves their type through company editing', () => {
    const original = { AllowedContracts: D.stringCollection(['electrical', 'shared']) };
    const rows = keyValuesFromDataRecord(original);
    expect(rows[0]?.value).toBe('["electrical","shared"]');
    expect(keyValueArrayToDataRecord(rows, original).AllowedContracts).toEqual(original.AllowedContracts);
});
