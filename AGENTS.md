# AGENTS.md

## Purpose
This repository is a Vue 3 + TypeScript demo storefront for Relewise Search, Recommendations, Retail Media, and Tracking.

Use this guide to make changes that match the existing architecture and avoid regressions in query/filter behavior.

## Stack
- Vue 3 SFCs with `<script setup lang="ts">`
- Vite 7
- Tailwind CSS + SCSS
- `@relewise/client` and `@relewise/web-components`
- Vue Router (no Pinia/Vuex; state is in singleton store/service classes)

## Runbook
- Install: `npm i`
- Dev server: `npm run dev`
- Type-check: `npm run type-check`
- Lint/fix: `npm run lint`
- Unit tests: `npm run test:unit` (project currently has little/no test coverage)
- Production build: `npm run build`

## Repo Map
- `src/main.ts`: app bootstrap, custom element registration, global fetch interceptor.
- `src/App.vue`: top-level layout, navigation category loading.
- `src/router/index.ts`: route table for home/settings/cart/product/category/content/favorites/feed.
- `src/stores/context.store.ts`: central app context (dataset, user, language/currency, clients, web-components init, localStorage persistence).
- `src/stores/globalProductFilters.ts`: shared recommendation/search filters.
- `src/services/*.ts`: basket, tracking, breakpoints.
- `src/helpers/*.ts`: facets, relevance modifiers, highlighting, category/image helpers.
- `src/components/*`: reusable UI and search/facet overlay components.
- `src/views/*`: route-level pages.

## Core Architecture Rules
1. Use `contextStore` as the source of truth for dataset/user/language/currency.
2. Build Relewise requests with builders (`ProductSearchBuilder`, `ContentSearchBuilder`, etc.), not ad-hoc payloads.
3. Reuse `contextStore.defaultSettings`, `selectedProductProperties`, and `selectedContentProperties` unless there is a strong reason not to.
4. Call `contextStore.userClassificationBasedFilters(...)` when product availability should respect user classification.
5. Reuse `globalProductRecommendationFilters(...)` for recommendation requests that should honor global filters (e.g. sold-out handling).
6. After API calls where status handling matters, call `contextStore.assertApiCall(response)`.
7. Keep URL query params in sync with search/filter state (overlay/category behavior depends on this).
8. For content tracking, use content tracking methods (`trackContentView`) rather than product tracking methods.

## State and Persistence Conventions
- App context is persisted in localStorage key `shopContext`.
- Basket is persisted in localStorage key `basket`.
- Context changes often require reloading the page (`window.location.reload()`) to reinitialize web components and route-level state; preserve this behavior unless you refactor it end-to-end.

## UI and Styling Conventions
- Prefer Tailwind utility classes for most styling; use scoped SCSS for component-specific layout/overrides.
- Global styles and design tokens live in `src/styling/index.scss`.
- The custom headline font is loaded from `public/fonts`.
- Keep overlay/modal mount points (`#modal`, `#navigationmodal`) working when changing layout.

## Relewise/Web Component Notes
- Vite is configured to treat tags starting with `relewise-` and `app-` as custom elements.
- `app-product-favorite-button` is a Vue custom element defined in `src/main.ts`; do not remove without replacing all usages.
- Web-components configuration is centralized in `contextStore.initializeWebComponents()`.

## Known Pitfalls
- Directory name `src/components/DIsplayAds` uses this exact casing; keep imports consistent to avoid case-sensitive CI/runtime issues.
- Search overlay, category page, and brand searches rely on query-string conventions (`open`, `term`, `sort`, `page`, etc.); preserve compatibility.
- Breakpoint variation keys are uppercased when sent to Retail Media placements; keep that mapping intact.

## Change Guidelines
- Keep changes minimal and localized.
- Reuse existing helpers before adding new ones.
- Avoid introducing new global state libraries.
- Do not commit dataset IDs, API keys, or other environment-specific secrets.
- If adding features that touch search/facets/sorting, validate both:
  - Overlay search (`/` with `open=1`)
  - Category listing (`/category/...`)

## Validation Checklist (before finalizing)
1. `npm run type-check`
2. `npm run lint`
3. `npm run build`
4. Smoke-test key routes:
   - `/`
   - `/category/:id`
   - `/product/:id`
   - `/content/:id`
   - `/cart`
   - `/favorites`
   - `/feed` (if enabled)
5. Verify:
   - Filters/sort/page update URL and restore correctly on reload/back-forward.
   - Retail media placements render without breaking product lists.
   - Context switcher changes apply correctly after reload.
