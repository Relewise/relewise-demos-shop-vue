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

In the dataset's **Features → Stock availability** settings, enter the case-sensitive **Stock data key** you want the product page to use. The display follows the field type.

| Data Value type | Example | Display |
| --- | --- | --- |
| Boolean | `InStock` | In stock or Out of stock |
| Double | `StockAmount` | Quantity in stock, or Out of stock for zero or less |
| Object | `StoreQuantities` | Quantities by store |

Map each store to a stable location ID. Use an Object with the location IDs as keys and display names as String values. The default key is `StoreNames`. The map defines which stores to show. With quantities alone, the shop uses the location IDs as labels.

Use a second Object with the same IDs as keys and stock counts as Double values. The default key is `StoreQuantities`, with Silvan's `StoreQuanteties` as a fallback. Store names and stock counts can be stored on the product or its variants. A map from the returned variant takes precedence over the corresponding product map.

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
3. Leave **Stock data key** and **Store name data key** blank for this example to use `StoreQuantities` and `StoreNames`. For other Data Keys, enter their exact names. Click **Save changes** after editing.
4. Open Workshop Drill at `/product/demo-shop-store-stock-drill`. Show **Aarhus · 8 in stock**, **Odense · Out of stock**, and **Aalborg · Stock unknown**. If the customer data includes variant-specific stock, select a variant and show its counts.
5. Open Tool Organizer at `/product/demo-shop-store-stock-organizer`. Show **Store stock information is unavailable** when the product has store names and all its counts are unknown.

### Previews

Whenever a pull request is made, there will automatically be created a preview linked to the PR with a life time of 90 days.

## Deployments

- Production deployments are triggered when a new release in Github is created.
- Bleeding-edge / latests is automaticly deployed with every push to master
- Netlify automatically creates and manages pull request previews
