# Renewtech demo script

**Working story:** Help buyers find the right part and give Thomas control over daily optimization.

**Audience:** Thomas Bjørn Nielsen, E-commerce Manager; TRIC technical participants; Relewise. Confirm the full attendee list and who will recommend a supplier to leadership.

**Format:** Focused technical proof of agreed cases. Until Thomas supplies expected outcomes, the prepared scenarios are our proposed examples. Do not call them customer-approved tests.

## Before the meeting

1. Upload the ZIP named in `output/validation-report.json` to the Product runner, using a disposable demo sandbox. Confirm all stages complete and record the verification results. Do not use a production dataset.
2. Open the PR preview or local shop with `?demo=renewtech`, configure the runner's dataset in Settings, select `en-gb` / EUR and the agreed B2B user/company context. This branch contains no credentials and does not create a dataset.
3. Confirm the three servers and featured parts load, their source images render and the selected market prices appear. The source Lenovo starting prices were EUR 140 and DKK 1,050 on 28 October; treat them as snapshot values, not current quotes.
4. Validate the customer-selected cases first. For the prepared example, confirm source ID `330177` has `ListedComponentIds`, and `266152` is among them. Inspect `00FK930`, `x3650 M5` and `46W0788` searches. Record actual ranking and expected results. Test product/category filters and sort with browser back/reload.
5. In My Relewise, locate `Renewtech: prioritize listed PSU 00FK930`. Start with it disabled. Keep the same user, condition, language, currency and placement for the before/after comparison. Rehearse, record baseline and changed result, then disable again. If a 1.5x boost produces no visible order change, explain that a boost is not a position guarantee and choose a confirmed example before presenting it.
6. Check the learned recommendations separately. Show them only as seeded sample journeys and only when runner verification reports them ready. Do not imply Renewtech purchase history exists in the dataset.
7. Open the four-slide deck and these browser tabs: homepage, `/product/330177`, My Relewise merchandising, and the runner verification result. Keep the single Situation Slide as a reusable standalone file.
8. Keep a scorecard ready. Compatibility dependencies, missing source component records, refresh cadence, condition pricing, implementation effort and quantified business value still need customer input.

## 0–5 minutes: confirm the situation

Show slide 1.

> “Thomas, the outcome we heard is that your B2B buyers should find the right parts more easily, and that your team should be able to adjust the experience in daily operation. Your product relationships matter, and you want to understand what requires TRIC and what you can control yourselves. Is that still the right focus?”

Confirm or amend the situation. The demo date is 9 November; the business outcome deadline and quantified value remain open.

## 5–12 minutes: show the result first

Go directly to `/product/330177` and the **Listed options for this server** placement.

> “Here is your Lenovo System x3650 M5, with products explicitly listed against it in your feed. We can narrow the result by condition and retain the stock filters. The starting point is your product relationship data.”

Show one source-listed part, its part number and condition. Then show a different condition and return to the original selection.

> “This proves membership in the supplied server option list. Whether a part fits a particular combination of chassis, CPU and other selections needs the dependency rules you use today. We will validate that against your examples.”

Do not demonstrate a negative compatibility assertion solely because a product is absent from the feed. Do not present the server's starting price as a completed build price.

## 12–22 minutes: find a known part

Use the homepage's **Find part 00FK930** shortcut, which opens `/?open=1&term=00FK930`. Open product `266152`.

> “A repeat buyer often knows the part number. Here we can find the part, see its offered condition and price, and read the source product description.”

Search `46W0788` and `x3650 M5` as additional prepared cases. Ask Thomas for the terms his buyers actually use. Use the customer-approved expected results when supplied. Test a real typo only after verifying its actual behavior in rehearsal.

Switch to `da-dk` and DKK to show market prices. State that names follow the source feed and that shared titles are currently identical in COM and DK. Return to the baseline context before the next scene.

## 22–32 minutes: Thomas changes the priority

Show slide 2 only if the audience needs the menu again, then return to the server's listed-options result. Show the rehearsed baseline, then enable the scoped rule in My Relewise and repeat the same request.

> “Suppose you want to give this listed power supply more weight. This is an existing indexed product and an existing placement. You can adjust that priority in My Relewise. The product-ID constraint still limits the candidate set to the server's listed options.”

Show the result actually observed. Explain the difference between a relevance boost and a fixed position. Let Thomas describe another everyday change he would want to make. Disable the demo rule afterward.

Optional: expand **Sample purchasing journeys** for 2–3 minutes. Say explicitly: “These recommendations use seeded demonstration journeys. They illustrate the experience; they are not your historical purchase data or a compatibility check.” Skip if the dataset is warming.

## 32–47 minutes: peel back with TRIC

Show slide 3, then the actual request/data if needed. Keep API setup out of the buyer workflow.

- Product data comes from the supplied feeds. IDs and part numbers remain distinct.
- `ListedComponentIds` drives a constrained ProductSearch placement, rather than treating co-purchase as compatibility evidence.
- Explain stock and market mappings, starting prices, and the condition/variant limitations.
- Agree the initial placements, tracking events and identity model. Confirm the actual Magento/Hyvä version and upgrade status with TRIC before estimating effort.
- Separate existing-rule changes from new frontend behavior, new feed fields and selected-option dependency logic.
- Treat HubSpot activation and the future lakehouse as later integration topics unless Thomas makes them part of this decision.

> “Which part of the integration or daily maintenance would you most like us to prove before you make a recommendation internally?”

Avoid an implementation-hours commitment without agreed scope.

## 47–60 minutes: score the evidence and agree the next step

Show slide 4. Review the scorecard and unresolved questions.

| Case | Evidence to record | Status before live rehearsal |
|---|---|---|
| Exact part search | Query, market, expected ID, actual position | Needs live dataset verification |
| Server/model search | Query and expected configuration IDs | Needs live dataset verification |
| Listed server options | Every returned ID belongs to the supplied list | Request logic tested locally; verify live output |
| Condition and stock | Selected condition and availability filters remain in the request | UI/request checks passed; verify live output |
| Merchandising control | Same request/context before and after the scoped rule | Needs live rehearsal |
| Selected-build compatibility | Valid and invalid combinations supplied by Thomas | Awaiting dependency evidence |
| Learned recommendations | Runner readiness and disclosed seeded input | Awaiting runner execution |
| Integration scope | Owner, systems, placements, data refresh and tracking | Confirm with TRIC |

> “Which tests have given you enough evidence, what remains unresolved, and who needs that evidence to make the next decision?”

Agree an owner and date for each remaining proof. Ask for the business decision deadline and how they would measure fewer manual enquiries or easier repeat purchasing. Do not invent savings, conversion uplift or a commitment to a pilot.

## Question handling

Answer a short, relevant question immediately. Park architecture tangents for the TRIC section. If compatibility logic is unknown, identify the missing dependency and record the follow-up. Do not promise that personalization learns hard compatibility constraints.

## Sources and limits

- [19 October 2026 Wispr call](https://notes.wisprflow.ai/shared/0IvcdEs46UbcyDOD4Y8DmmYnlD0SGwj_7RP1cM4-kpI): standardized vendor comparison, parts/configuration relationships and self-service concern.
- [HubSpot opportunity](https://app.hubspot.com/contacts/26141192/record/0-3/508123244784?utm_source=codex&utm_medium=ai_agent): broader search/recommendation/B2B scope. Earlier notes identify data-maturity and implementation concerns.
- Thomas's 28 October feed email and the local snapshots in `../data` relative to the repository root. Exact source hashes and mapping are in `source-provenance.json`.
- The four editorial guides, affinity stories, personas, behavior and campaigns are generated demo content. Keep them distinct from customer evidence.
