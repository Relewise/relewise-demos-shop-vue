# Renewtech parts discovery demo

A focused B2B demonstration for Thomas Bjørn Nielsen and TRIC, based on the COM and DK feeds supplied on 28 October 2026. Demo meeting: 9 November, 10:00–11:00 Europe/Copenhagen.

## Deliverables

- `output/validation-report.json` identifies the single current upload ZIP, checksum and compiler validation.
- `output/bundles/**.zip` is the execution bundle to upload to the Product-owned Sales Demo MVP runner. Do not upload the workspace directory.
- `slides/renewtech-situation.pptx` preserves the retained Relewise Situation Slide.
- `slides/renewtech-deck.pptx` adds three supporting slides. Sources and presentation guidance are in speaker notes.
- `demo-script.md` is the presenter talk track, click path, rehearsal checklist and proof boundary.
- `source-provenance.json` records source hashes, mapping and limitations.
- `story-products.json` records the three featured servers and the source-listed components retained in this subset.

## Run the storefront

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/?demo=renewtech`. The flag persists for this browser tab. Use `?demo=default` to restore the generic storefront, then reload. For a dedicated build, use `VITE_DEMO_CUSTOMER=renewtech npm run build`.

Use Settings to import/configure the sandbox credentials returned by the runner. The opt-in does not configure a dataset or replace its credentials. Use a browser-facing API key appropriate to the demo. No credentials are included in this repository. Pair `en-gb` with EUR for COM and `da-dk` with DKK for DK. Here `gb/en-gb` is the runner's convention for the English COM feed, not a claim that COM is UK-only.

Live activation and API verification are still required: this work builds an uploadable bundle and a frontend branch, and does not provision or change a Relewise dataset.

## Data decisions

The demo contains 1,554 curated products present in both market feeds, including 27 featured products in three illustrative procurement journeys. It is not the complete 200,000-item catalogue discussed on the call. Products without complete source copy, prices or images are excluded. Names, descriptions and price amounts retain source values. DK names may still be English. List price equals sales price, so no discount is invented. Availability is a positive storefront value for source `in stock`, not a physical inventory count. Margin `Unknown` is an explicit unknown sentinel.

Configuration records remain products with a `SourceKind=config` facet and a starting-price label. They cannot be added to the cart as completed builds. No condition variants or selected-option compatibility rules are invented. Source condition stock remains available as text in `SourceConditionStock`. The condition facet describes the feed's primary offered condition; it does not recalculate price or stock for every alternative condition.

`ListedComponentIds` contains explicit source references restricted to retained catalogue products. The PDP requests these IDs through ProductSearch, applying the normal availability and user-classification filters. It shows up to 12 matches. A missing or malformed relationship never falls back to an unrestricted catalogue query. Empty/error/loading states are visible and stale responses cannot replace a newer filter result.

The bundle includes exact/prefix MPN indexing and an initially disabled 1.5x merchandising boost for PSU `266152` / `00FK930`, scoped to `Renewtech - Listed server options`. It merges request filters. Rehearse the rule on the real dataset before promising a visible ranking change. A boost is a preference, not a fixed position.

The three affinity baskets, users, behavior and four editorial guides are synthetic demo material. They are not evidence of Renewtech purchases, preferences or editorial content. Learned recommendations are disclosed under “Sample purchasing journeys”. The standard compiler requires Retail Media configuration; this is not part of the customer demo story. Weekly behavior-refresh and warm-up jobs retain the standard Monday 04:00 UTC schedule.

## Rebuild

Place the two original feeds in a local directory as `renewtech-com.xml` and `renewtech-dk.xml`. Raw feed snapshots and the large normalized catalogue stay outside Git; the compiled ZIP embeds the normalized data.

```sh
python3 demos/renewtech/scripts/prepare_catalogue.py --feeds ../data
sh demos/renewtech/scripts/build_bundle.sh
```

The wrapper runs the skill's standard generator, applies the Renewtech-specific search/merchandising defaults, then runs the official customer compiler. It reads the installed skill and `se-definitions` without modifying them. Override `RELEWISE_DEFINITIONS_DIR` if the definitions checkout is elsewhere. Inspect the new validation report before uploading. Keep only the ZIP named by that report when distributing a revised bundle.

## Verification performed

- Official compiler validation: 1,554 complete products, zero placeholder images, all 1,554 descriptions source-derived, three affinity anchors, 24 generated semantic journey cohorts.
- TypeScript, lint, unit tests and production build.
- Desktop and mobile UI checks with isolated catalogue-derived API fixtures. Part-search shortcut, listed-component ID constraints, condition/empty state, key route loading and browser history checks.
- Slide renders reviewed against the retained template, plus PPTX package/layout/font checks.

UI fixtures exercise application behavior, not live Relewise ranking, merchandising activation, recommendation learning, tracking or API performance. `scripts/browser-fixtures.js` is a Playwright CLI callback for local verification only. It uses the reserved `fixture.invalid` host, fictitious credentials and disabled tracking; it does not contact a real dataset. The existing design detector reports warnings in unchanged code (bounce animation, header badge color and search-tab borders).
