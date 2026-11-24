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

| Location ID | Example store name | Workshop Drill | Tool Organizer |
| --- | --- | ---: | ---: |
| `Store_aarhus` | Aarhus | 8 | absent |
| `Store_odense` | Odense | 0 | absent |
| `Store_aalborg` | Aalborg | absent | absent |

Import the store names for both products. Open Workshop Drill to see in-stock, out-of-stock, and unknown locations. Open Tool Organizer to see the unavailable message with only the store-name map imported.

### Previews

Whenever a pull request is made, there will automatically be created a preview linked to the PR with a life time of 90 days.

## Deployments

- Production deployments are triggered when a new release in Github is created.
- Bleeding-edge / latests is automaticly deployed with every push to master
- Netlify automatically creates and manages pull request previews
