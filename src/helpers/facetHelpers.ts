import { facetConfig } from "@/config/FacetConfig";
import contextStore from "@/stores/context.store";

export function getSelectedCategoryFilterIds(filters: Record<string, string | string[]>) {
  return filters['category'];
}

export function getCategoryThreshold(): number {
  return contextStore.context.value.allowThirdLevelCategories ? 3 : 2;
}

export function getDefaultFilters(): Record<string, string | string[]> {
  const defaults: Record<string, string | string[]> = {
    term: '',
    sort: '',
  };

  for (const [key, item] of Object.entries(facetConfig)) {
    // Initialize array-based filters for checklist and range types
    if (item.config.render === 'checklist' || item.config.render === 'range') {
      defaults[key] = [];
    }
  }

  return defaults;
}