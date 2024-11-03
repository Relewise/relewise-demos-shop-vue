import type { CategoryHierarchyFacetResultCategoryNode } from '@relewise/client';

export const findCategoryById = (
    nodes: CategoryHierarchyFacetResultCategoryNode[],
    id: string,
): CategoryHierarchyFacetResultCategoryNode | null  => {
    for (const node of nodes) {
        // Check if the current node has the desired category id
        if (node.category.categoryId === id) {
            return node;
        }

        // If the node has children, search recursively
        if (node.children) {
            const result = findCategoryById(node.children, id);
            if (result) {
                return result;
            }
        }
    }

    // Return null if not found in any node
    return null;
};