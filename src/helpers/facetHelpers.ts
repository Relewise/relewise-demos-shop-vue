//import { facetConfig } from "@/config/FacetConfig";
import { facetConfigMap } from "@/config/FacetConfigSmarter";
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

    for (const [key, def] of Object.entries(facetConfigMap)) {
        const hasSelectableContext = Object.values(def.contexts).some(ctx =>
            ctx.render === 'checklist' || ctx.render === 'range'
        );

        if (hasSelectableContext) {
            defaults[key] = [];
        }

}
return defaults;
}