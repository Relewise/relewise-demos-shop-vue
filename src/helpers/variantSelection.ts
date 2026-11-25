import type { Multilingual, VariantResult } from '@relewise/client';

type NamedVariant = VariantResult & { variantId: string };
type VariantRow = { variant: NamedVariant; values: (string | undefined)[] };

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
    const complete: VariantRow[] = [];
    const incomplete: NamedVariant[] = [];
    for (const row of rows) {
        if (dimensions.every(({ index }) => row.values[index] !== undefined)) complete.push(row);
        else incomplete.push(row.variant);
    }

    if (dimensions.length === 0 || complete.length === 0) {
        return { groups: [], otherVariants: rows.map(row => row.variant), matchingVariants: [] };
    }

    const selected = complete.find(row => row.variant.variantId === selectedVariantId);
    let matchingPrefix = complete;
    const groups = dimensions.map(({ key, index }) => {
        const available = new Map<string, VariantRow>();
        for (const row of matchingPrefix) {
            const value = row.values[index]!;
            const current = available.get(value);
            if (!current || (selected && preservesMoreChoices(row, current, selected, index + 1))) {
                available.set(value, row);
            }
        }

        const selectedValue = selected?.values[index];
        if (selected && selectedValue !== undefined) {
            available.set(selectedValue, selected);
            matchingPrefix = matchingPrefix.filter(row => row.values[index] === selectedValue);
        }

        return {
            key,
            selectedValue,
            options: [...new Set(complete.map(row => row.values[index]!))].map(value => ({
                value,
                variantId: available.get(value)?.variant.variantId,
            })),
        };
    });

    return {
        groups,
        // Show individual variants when a configured value is missing or several SKUs share the same values.
        otherVariants: incomplete,
        matchingVariants: selected && matchingPrefix.length > 1 ? matchingPrefix.map(row => row.variant) : [],
    };
}

function preservesMoreChoices(candidate: VariantRow, current: VariantRow, selected: VariantRow, start: number) {
    let difference = 0;
    let firstDifference = 0;
    for (let index = start; index < selected.values.length; index++) {
        const selectedValue = selected.values[index];
        if (selectedValue === undefined) continue;

        const matchDifference = Number(candidate.values[index] === selectedValue) - Number(current.values[index] === selectedValue);
        difference += matchDifference;
        firstDifference ||= matchDifference;
    }

    // The configured dimension order breaks ties, with API order preserved for equivalent variants.
    return (difference || firstDifference) > 0;
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
