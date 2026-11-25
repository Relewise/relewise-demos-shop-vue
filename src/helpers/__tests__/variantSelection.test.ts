import { getVariantSelection } from '@/helpers/variantSelection';
import { DataValueFactory, type VariantResult } from '@relewise/client';
import { describe, expect, it } from 'vitest';

const dimensionKeys = ['diameter', 'length', 'package_sizes'];

function variant(variantId: string, diameter: string, length: string, packaging?: string): VariantResult {
    return {
        variantId,
        rank: 1,
        specification: { diameter },
        data: {
            length: DataValueFactory.string(length),
            ...(packaging ? { package_sizes: DataValueFactory.string(packaging) } : {}),
        },
    };
}

describe('product variant selection', () => {
    it('prevents missing combinations and allows changing earlier dimensions', () => {
        const variants = [variant('short', '3 mm', '30 mm', '1000'), variant('long', '3 mm', '40 mm', '500'), variant('wide', '4 mm', '40 mm', '250')];
        const { groups } = getVariantSelection(variants, dimensionKeys, 'long', 'sv-se');

        expect(groups[2]?.options).toContainEqual({ value: '1000', variantId: undefined });
        expect(groups[2]?.options).toContainEqual({ value: '500', variantId: 'long' });
        expect(groups[1]?.options).toContainEqual({ value: '30 mm', variantId: 'short' });
        expect(groups[0]?.options).toContainEqual({ value: '4 mm', variantId: 'wide' });
    });

    it('omits unused dimensions and keeps incomplete and duplicate variants reachable', () => {
        const variants = [variant('first', '3 mm', '30 mm', '1000'), variant('second', '3 mm', '30 mm', '1000'), variant('incomplete', '3 mm', '40 mm')];
        const { groups, otherVariants, matchingVariants } = getVariantSelection(variants, [...dimensionKeys, 'Color'], 'first', 'sv-se');

        expect(groups.map(group => group.key)).toEqual(dimensionKeys);
        expect(otherVariants.map(item => item.variantId)).toEqual(['incomplete']);
        expect(matchingVariants.map(item => item.variantId)).toEqual(['first', 'second']);
    });

    it('preserves all later values when an exact combination is available', () => {
        const variants = [variant('selected', '3 mm', '30 mm', '500'), variant('different', '4 mm', '40 mm', '1000'), variant('exact', '4 mm', '30 mm', '500')];
        const { groups } = getVariantSelection(variants, dimensionKeys, 'selected', 'sv-se');

        expect(groups[0]?.options).toContainEqual({ value: '4 mm', variantId: 'exact' });
    });

    it('prefers a partial match over changing all later choices', () => {
        const variants = [variant('selected', '3 mm', '30 mm', '500'), variant('different', '4 mm', '40 mm', '1000'), variant('same-length', '4 mm', '30 mm', '1000')];
        const { groups } = getVariantSelection(variants, dimensionKeys, 'selected', 'sv-se');

        expect(groups[0]?.options).toContainEqual({ value: '4 mm', variantId: 'same-length' });
    });

    it('uses the configured order to break ties between partial matches', () => {
        const variants = [variant('selected', '3 mm', '30 mm', '500'), variant('same-package', '4 mm', '40 mm', '500'), variant('same-length', '4 mm', '30 mm', '1000')];
        const { groups } = getVariantSelection(variants, dimensionKeys, 'selected', 'sv-se');

        expect(groups[0]?.options).toContainEqual({ value: '4 mm', variantId: 'same-length' });
    });
});
