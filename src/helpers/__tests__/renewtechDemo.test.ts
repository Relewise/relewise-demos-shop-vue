import { describe, expect, it } from 'vitest';
import { DataValueFactory, UserFactory, type ProductResult, type SelectedProductPropertiesSettings } from '@relewise/client';
import { listedComponentIds, listedOptionsRequest } from '@/helpers/renewtechDemo';

const settings = { language: 'en-gb', currency: 'EUR', displayedAtLocation: 'test', user: UserFactory.anonymous() };
const product: ProductResult = { rank: 1, productId: 'server', data: { ListedComponentIds: DataValueFactory.stringCollection(['part-a', 'part-b', 'part-a']) } };

describe('Renewtech listed options', () => {
    it('never requests the whole catalogue when relationships are absent or malformed', () => {
        for (const product of [{ rank: 1 }, { rank: 1, data: { ListedComponentIds: DataValueFactory.string('part-a') } }]) {
            expect(listedOptionsRequest(product, settings, {} as SelectedProductPropertiesSettings, () => {})).toBeNull();
        }
    });

    it('deduplicates source references and keeps an explicit ID constraint with condition and global filters', () => {
        expect(listedComponentIds(product)).toEqual(['part-a', 'part-b']);
        const request = listedOptionsRequest(product, settings, { allData: true } as SelectedProductPropertiesSettings, f => {
            f.addProductDataFilter('SoldOut', c => c.addEqualsCondition(DataValueFactory.string('false')));
        }, 'Refurbished');
        const serialized = JSON.stringify(request);
        expect(serialized).toContain('ProductIdFilter');
        expect(serialized).toContain('part-a');
        expect(serialized).toContain('part-b');
        expect(serialized).toContain('SoldOut');
        expect(serialized).toContain('Condition');
        expect(serialized).toContain('Refurbished');
        expect(request?.displayedAtLocation).toBe('Renewtech - Listed server options');
    });
});
