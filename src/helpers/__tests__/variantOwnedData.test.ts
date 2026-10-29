import { describe, expect, it } from 'vitest';
import { DataValueFactory as D, ProductSearchBuilder, type ProductResult, type VariantResult } from '@relewise/client';
import { addArticleEligibility, articleDescription, articleSalesPrice, canBuyArticle, eligibleArticle } from '../variantOwnedData';

const article = (id: string, market: string, channel: string): VariantResult => ({
    variantId: id, rank: 1, salesPrice: 125,
    data: { AvailableInMarkets: D.stringCollection([market]), AvailableInChannels: D.stringCollection([channel]), NotBuyableInMarkets: D.stringCollection([]), description: D.string('Native article copy') },
});
const family = (variant?: VariantResult): ProductResult => ({ productId: 'family-1', rank: 1, salesPrice: 999, variant, data: { DataModelVersion: D.string('variant-owned-v1'), Description: D.string('Family copy') } });

describe('article-owned data', () => {
    it('requires an explicitly selected, priced article and never falls back to the parent price', () => {
        expect(articleSalesPrice(family())).toBeUndefined();
        expect(canBuyArticle(family())).toBe(false);
        expect(articleSalesPrice(family(article('a', 'se', 'electrical')))).toBe(125);
        expect(canBuyArticle(family({ ...article('a', 'se', 'electrical'), salesPrice: null }))).toBe(false);
    });
    it('keeps family and article descriptions separate', () => {
        expect(articleDescription(family())).toBe('Family copy');
        expect(articleDescription(family(article('a', 'se', 'electrical')))).toBe('Native article copy');
        expect(articleDescription(family({ variantId: 'a', rank: 1 }))).toBeUndefined();
    });
    it('does not borrow a sibling market or contract permission', () => {
        const se = article('a', 'se', 'electrical');
        const fi = article('b', 'fi', 'plumbing');
        expect([se, fi].some(v => eligibleArticle(v, 'se', 'plumbing'))).toBe(false);
        expect(eligibleArticle(se, 'se', 'electrical')).toBe(true);
        expect(eligibleArticle(se, 'se', null)).toBe(false);
        se.data!.NotBuyableInMarkets = D.stringCollection(['se']);
        expect(eligibleArticle(se, 'se', 'electrical')).toBe(false);
    });
    it('builds variant filters for eligibility and both technical conditions, without parent projections', () => {
        const request = new ProductSearchBuilder({ language: 'sv-se', currency: 'SEK', displayedAtLocation: 'test', user: { temporaryId: 'test' } }).filters(f => {
            addArticleEligibility(f, 'se', 'electrical');
            f.addVariantDataFilter('length', c => c.addEqualsCondition(D.string('293 mm')));
            f.addVariantDataFilter('diameter', c => c.addEqualsCondition(D.string('30 mm')));
        }).build();
        const payload = JSON.stringify(request);
        expect(payload).not.toContain('ProductDataFilter');
        expect(payload.match(/VariantDataFilter/g)).toHaveLength(5);
    });
    it('preserves legacy parent-price behavior', () => {
        expect(articleSalesPrice({ productId: 'legacy', rank: 1, salesPrice: 99 })).toBe(99);
    });
});
