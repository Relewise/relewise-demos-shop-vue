# Adaptive product facets

Product search (including brand searches) and category product listings use the same two-stage search preparation. Content search, predictions, recommendations and navigation category loading keep their existing behavior.

On a cold search, an anonymous request samples the first 50 base products with relevance sorting. It preserves the request's language, currency, channel, explicit filters, context and selected facet queries. Rendering properties, variants and Retail Media are omitted. The displayed search retains its original user, sorting, pagination, selected properties and Retail Media; its results and facet counts are authoritative.

No catalogue schema or customer configuration is shipped. Discovery reads base-product data (`allData: true`) and infers string, number and boolean attribute controls. Objects and empty values do not become facets. Identifier, URL/image, description, provenance, contract and internal/search configuration keys are excluded from automatic ranking. Product data should aggregate variant attributes when those attributes need to participate in discovery.

Each canonical key scores `coverage × (1 − largest value-presence count / sample size)`, counting each value once per product. Ties use case-sensitive key order. Up to ten keys are chosen; mixed-type keys may produce multiple controls. Brand, Category and the existing Sales Price control remain available. Selected controls are retained outside the budget, including when discovery returns no useful attributes or the final result has zero hits. Existing configured data facets participate in selection and keep their labels and selection strategies.

Generated controls use human-readable data-key labels. The full generated identity (`__adaptive:<type>:<key>`) is used in URLs and restored on responses. The API receives the original, case-sensitive data key, allowing independent numeric/text selections for mixed-type attributes. No positional placeholders are necessary: the Vue facet UI resolves labels by the returned identity, rather than array position. Both listing surfaces offer a mobile Filters toggle.

## Cache and cancellation

Only facet identities and expiry/LRU metadata are cached. Keys are SHA-256 hashes of the canonical anonymous probe, server/dataset namespace and policy version. Terms use exact trimmed text. Changes to selected filters, language, currency, channel or request context produce separate entries; page and sort changes reuse discovery.

The cache uses tab-local `sessionStorage`, a ten-minute success TTL and a 200-entry LRU limit. Storage failures leave the in-memory cache usable. There is no extension worker or cross-tab storage; concurrent requests within a tab share a probe. Each canceled consumer detaches independently; the last consumer aborts the probe. Active-context refresh invalidates pending discovery and cached entries. Closing search, changing searches or unmounting a category prevents a stale display response from being applied.

A probe has a two-second timeout. Failures use a 30-second failure cache. Short non-empty terms (under three characters) skip discovery. These cases request the existing fixed controls, selected facets and string controls for material, color, size, diameter, length, width, height, thickness, surface protection and type. Empty terms on category/brand listings do run discovery. Successful discovery with no useful candidates requests only fixed and selected controls. The existing search-input debounce is unchanged.

Debug messages contain cache status, discovery outcome/duration and requested facet count. They contain no terms, values, users or credentials.

## Verification

Run `npm run type-check`, `npm run test:unit -- --run`, `npm run lint` and `npm run build`. The adaptive-facet tests cover scalar/list data, repeated values, mixed types, exclusions, deterministic ties, the ten-key budget, anonymous discovery, pinned filters, category searches, empty discovery, short-term fallback, final-search execution, batch ordering, cache hashing/reuse/expiry/LRU/persistence, timeout fallback, concurrent consumers and cancellation.

Browser checks use synthetic data; no customer configuration is required. Verify search and category facet selection, independent mixed-type URL keys, clearing and reload, sort reuse, empty results with pinned controls, and desktop/mobile access. Actual relevance, coverage and cold/warm latency depend on the connected catalogue. This change makes no measured latency or request-byte reduction claim: generic discovery reads sample data, and the default shop originally had only three fixed facets.

Validation on this branch: type checking and production build pass; all 27 unit tests pass. ESLint reports zero errors (eight pre-existing formatting warnings in `SearchNoProductsFound.vue`). Synthetic Chrome checks cover desktop/mobile search and category controls, mixed-type selection, clearing, selection restoration after reload, cache reuse on warm reload, and selected zero-hit facets. Catalogue-specific ranking and performance still require validation against the dataset used in the deploy preview.
