export function shouldApplyRangeFacet(
    filterValue: string[] | undefined,
    available: { lowerBoundInclusive?: number; upperBoundInclusive?: number } | undefined
  ): boolean {
    if (!filterValue || filterValue.length !== 2 || !available) return false;
  
    const [min, max] = filterValue.map(Number);
  
    return (
      (available.lowerBoundInclusive !== undefined &&
        min !== available.lowerBoundInclusive &&
        available.lowerBoundInclusive !== 0) ||
      (available.upperBoundInclusive !== undefined &&
        max !== available.upperBoundInclusive &&
        available.upperBoundInclusive !== 0)
    );
  }

  export function getDoubleRangeFacetBounds(
    key: string,
    filters: Record<string, string | string[]>,
    facetResult: any // You could use a more specific type here
  ): [number | undefined, number | undefined] {
    const range = filters[key] as string[] | undefined;
    const available = facetResult?.available?.value;
    const shouldApply =
      range?.length === 2 &&
      available &&
      (
        Number(range[0]) !== available.lowerBoundInclusive ||
        Number(range[1]) !== available.upperBoundInclusive
      );
  
    return shouldApply ? [Number(range[0]), Number(range[1])] : [undefined, undefined];
  }

  function findFacetByKey(key: string) {
    return result.value?.facets?.items?.find(
      (f): f is { key: string } => 'key' in f && f.key === key
    );
  }