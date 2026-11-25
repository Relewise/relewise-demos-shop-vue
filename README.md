# Relewise Demo Shop Vue

This is the Relewise demo shop featuring Search & Recommendations built on top of the JavaScript SDK. The Demo is built using Vue/Vue.js 3.

## Live demo

Link to the demo shop is here: https://relewise-demo-shop.netlify.app/

## Bleeding-edge preview

The newest and unstable release of the demo shop can be found here: https://latest--relewise-demo-shop.netlify.app/

In order to run the demo shop you need access to a dataset in Relewise.

## Development setup

1. git clone the repo
2. run `npm i` in the root of the project
3. use `Start Development` to run the project (or use the VS Code Vite plugin to auto-run the project)

### Previews

Whenever a pull request is made, there will automatically be created a preview linked to the PR with a life time of 90 days.

## Product page variant dimensions

In **Settings → Datasets → Features**, add the variant data or specification keys under **Product page variant dimensions** in the order shoppers should choose them. The keys are case-sensitive. Changing a value selects a real variant and preserves later choices when possible.

For the **HDJ - Sales Demo v2 - Sandbox** demo, select `sv-se` and configure `diameter`, `length`, and `package_sizes`. On product `101195`, `3 mm`, `40 mm`, and `1 pcs/500 pcs` resolve to variant `gtin-04043952587270`. `1 pcs/1000 pcs` is available for the `30 mm` length and is disabled when `3 mm` and `40 mm` are selected.

For customer imports, map each source field to a consistent variant-level key, for example `Size`, `Color`, `Material`, or `PackageQuantity`, then configure those exact keys. Use one value per variant and dimension, with consistent units and labels across variants of the same product. The product page offers individual variant links when fields are missing or the selected combination matches multiple variants.

## Deployments

- Production deployments are triggered when a new release in Github is created.
- Bleeding-edge / latests is automaticly deployed with every push to master
- Netlify automatically creates and manages pull request previews
