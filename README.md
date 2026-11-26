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

### Demo stock availability

In the dataset's **Features → Stock availability** settings, enter the case-sensitive **Stock data key** you want the product page to use. Leave the field blank to hide stock availability. The display follows the field type.

| Data Value type | Example | Display |
| --- | --- | --- |
| Boolean | `InStock` | In stock or Out of stock |
| Double | `StockAmount` | Quantity in stock, or Out of stock for zero or less |
| Object | `StoreQuantities` | Quantities by store |

Map each store to a stable location ID. To show store names, set **Store name data key** to an Object with those IDs as keys and display names as String values. The map defines which stores to show. Without a store name key, the shop uses the location IDs as labels.

For stock by store, set **Stock data key** to an Object with the same IDs as keys and stock counts as Double values. Store names and stock counts can be stored on the product or its variants. A map from the returned variant takes precedence over the corresponding product map.

Use the product-level stock field only for inventory shared by all variants. The shop falls back to that field when the selected variant has no value for the configured key. An invalid variant value displays stock as unavailable. If the product carries an aggregate total across variants, keep that total in a separate Data Key and configure the shop to read the variant stock field.

#### Customer PoC import example

Suppose the customer sends one CSV row per product and store. In this example, a blank count means the source has no stock information for that store.

```csv
product_id,store_id,store_name,available_quantity
demo-shop-store-stock-drill,aarhus,Aarhus,8
demo-shop-store-stock-drill,odense,Odense,0
demo-shop-store-stock-drill,aalborg,Aalborg,
demo-shop-store-stock-organizer,aarhus,Aarhus,
demo-shop-store-stock-organizer,odense,Odense,
demo-shop-store-stock-organizer,aalborg,Aalborg,
```

| Source column | Relewise mapping |
| --- | --- |
| `product_id` | Group rows by product and use the value as its Relewise product ID. |
| `store_id` | Use a stable key in both Objects. This example prefixes the ID with `Store_`. |
| `store_name` | Add the name as a String under the store's key in `StoreNames`. |
| `available_quantity` | Add a known count as a Double under the same key in `StoreQuantities`. Write zero explicitly. Omit the quantity entry for a blank count. |

Merge the following Data Values into the corresponding products' `data` through the normal catalog import. Tool Organizer has a name map and no quantity map because all its counts are unknown.

```js
import { DataValueFactory } from '@relewise/client';

const storeNames = DataValueFactory.object({
    Store_aarhus: DataValueFactory.string('Aarhus'),
    Store_odense: DataValueFactory.string('Odense'),
    Store_aalborg: DataValueFactory.string('Aalborg'),
});

const productDataById = {
    'demo-shop-store-stock-drill': {
        StoreNames: storeNames,
        StoreQuantities: DataValueFactory.object({
            Store_aarhus: DataValueFactory.number(8),
            Store_odense: DataValueFactory.number(0),
        }),
    },
    'demo-shop-store-stock-organizer': {
        StoreNames: storeNames,
    },
};
```

If the customer's counts are variant-specific, group by product and variant ID and write the quantity map to that variant's `data`. The product can keep a shared `StoreNames` map. On later imports, replace the stock map with the current snapshot so a previously known quantity clears when the source count becomes unknown.

#### Sales Engineering demo steps

1. Import **Workshop Drill** and **Tool Organizer** into the demo dataset using the product IDs and Data Values above. When reusing a customer's existing compatible Objects, use their existing Data Keys.
2. Open the dataset selector in the Demo Shop header, choose the imported dataset, and click **Apply**. Reopen the selector and go to **Configure Demo → Features → Stock availability**.
3. Enter `StoreQuantities` as **Stock data key** and `StoreNames` as **Store name data key** for this example, then click **Save changes**. For other Data Keys, enter their exact names.
4. Open Workshop Drill at `/product/demo-shop-store-stock-drill`. Show **Aarhus · 8 in stock**, **Odense · Out of stock**, and **Aalborg · Stock unknown**. If the customer data includes variant-specific stock, select a variant and show its counts.
5. Open Tool Organizer at `/product/demo-shop-store-stock-organizer`. Show **Store stock information is unavailable** when the product has store names and all its counts are unknown.

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
