import type { Multilingual, VariantResult } from '@relewise/client';

type NamedVariant = VariantResult & { variantId: string };
type VariantRow = { variant: NamedVariant; values: (string | undefined)[] };

/**
 * Builds the product-page picker in the configured dimension order.
 * Each selectable option points to an existing variant ID. Options without an ID are shown as disabled.
 * Individual variant links cover incomplete data and combinations shared by multiple variants.
 */
export function getVariantSelection(
    variants: VariantResult[],
    keys: string[],
    selectedVariantId: string | undefined,
    language: string,
) {
    const rows = variants.filter((variant): variant is NamedVariant => Boolean(variant.variantId))
        .map(variant => ({ variant, values: keys.map(key => dimensionValue(variant, key, language)) }));

    // Ignore dimensions the product never supplies, while keeping the original key indices for each row.
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
    // Each group considers only variants that match the selections in all preceding groups.
    let matchingPrefix = complete;
    const groups = dimensions.map(({ key, index }) => {
        const available = new Map<string, VariantRow>();
        for (const row of matchingPrefix) {
            const value = row.values[index]!;
            const current = available.get(value);
            // Several variants can provide the same option. Pick the one that keeps the most later choices.
            if (!current || (selected && preservesMoreChoices(row, current, selected, index + 1))) {
                available.set(value, row);
            }
        }

        const selectedValue = selected?.values[index];
        if (selected && selectedValue !== undefined) {
            // Keep the current variant when another SKU has the same dimension values.
            available.set(selectedValue, selected);
            matchingPrefix = matchingPrefix.filter(row => row.values[index] === selectedValue);
        }

        // Show values from all complete rows so the UI can disable those that don't fit the preceding choices.
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
        otherVariants: incomplete,
        matchingVariants: selected && matchingPrefix.length > 1 ? matchingPrefix.map(row => row.variant) : [],
    };
}

/** Compares candidates for one option using only the dimensions after the one being changed. */
function preservesMoreChoices(candidate: VariantRow, current: VariantRow, selected: VariantRow, start: number) {
    let difference = 0;
    let firstDifference = 0;
    for (let index = start; index < selected.values.length; index++) {
        const selectedValue = selected.values[index];
        if (selectedValue === undefined) continue;

        const matchDifference = Number(candidate.values[index] === selectedValue) - Number(current.values[index] === selectedValue);
        difference += matchDifference;
        // The first different match records which candidate kept the earlier choice.
        firstDifference ||= matchDifference;
    }

    // Only replace the current candidate on a better match so equivalent candidates stay in API order.
    return (difference || firstDifference) > 0;
}

/** Resolves a single picker value from a variant specification or data field. */
function dimensionValue(variant: VariantResult, key: string, language: string) {
    const data = variant.data?.[key];
    // Use the explicit specification when the same key also exists in variant data.
    let value: unknown = variant.specification?.[key]?.trim() || data?.value;
    // A localized string can be used directly. For a multilingual object, use only the requested language.
    if (data?.type === 'Multilingual' && value && typeof value === 'object') {
        value = (value as Multilingual).values?.find(entry => entry.language.value === language)?.text;
    }

    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
}
