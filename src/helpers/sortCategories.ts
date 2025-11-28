import type { CategoryHierarchyFacetResultCategoryNode } from '@relewise/client';

export function sortCategories(nodes: CategoryHierarchyFacetResultCategoryNode[] | null | undefined) {
    if (!nodes) return undefined;

    return [...nodes].sort((a, b) => {
        const aName = a?.category?.displayName ?? a?.category?.categoryId ?? '';
        const bName = b?.category?.displayName ?? b?.category?.categoryId ?? '';
        return aName.localeCompare(bName);
    });
}