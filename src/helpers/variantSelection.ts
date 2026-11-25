import type { Multilingual, VariantResult } from '@relewise/client';

type NamedVariant = VariantResult & { variantId: string };

export function getVariantSelection(
    variants: VariantResult[],
    keys: string[],
    selectedVariantId: string | undefined,
    language: string,
) {
    const rows = variants.filter((variant): variant is NamedVariant => Boolean(variant.variantId))
        .map(variant => ({ variant, values: keys.map(key => dimensionValue(variant, key, language)) }));
    const dimensions = keys.map((key, index) => ({ key, index }))
        .filter(({ index }) => rows.some(row => row.values[index] !== undefined));
    const complete = rows.filter(row => dimensions.every(({ index }) => row.values[index] !== undefined));

    if (dimensions.length === 0 || complete.length === 0) {
        return { groups: [], otherVariants: rows.map(row => row.variant), matchingVariants: [] };
    }

    const selected = complete.find(row => row.variant.variantId === selectedVariantId);
    let matchingPrefix = complete;
    const groups = dimensions.map(({ key, index }) => {
        const available = new Map<string, string>();
        for (const row of matchingPrefix) {
            const value = row.values[index]!;
            // Retain later choices when an exact match exists. Otherwise choose a real combination for the new prefix.
            if (!available.has(value) || selected?.values.slice(index + 1).every((later, i) => later === row.values[index + 1 + i])) {
                available.set(value, row.variant.variantId);
            }
        }

        const selectedValue = selected?.values[index];
        if (selectedValue !== undefined) {
            matchingPrefix = matchingPrefix.filter(row => row.values[index] === selectedValue);
        }

        return {
            key,
            selectedValue,
            options: [...new Set(complete.map(row => row.values[index]!))].map(value => ({
                value,
                variantId: value === selectedValue ? selected?.variant.variantId : available.get(value),
            })),
        };
    });

    return {
        groups,
        // Show individual variants when a configured value is missing or several SKUs share the same values.
        otherVariants: rows.filter(row => !dimensions.every(({ index }) => row.values[index] !== undefined)).map(row => row.variant),
        matchingVariants: selected && matchingPrefix.length > 1 ? matchingPrefix.map(row => row.variant) : [],
    };
}

function dimensionValue(variant: VariantResult, key: string, language: string) {
    const data = variant.data?.[key];
    let value: unknown = variant.specification?.[key]?.trim() || data?.value;
    if (data?.type === 'Multilingual' && value && typeof value === 'object') {
        value = (value as Multilingual).values?.find(entry => entry.language.value === language)?.text;
    }

    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
}
