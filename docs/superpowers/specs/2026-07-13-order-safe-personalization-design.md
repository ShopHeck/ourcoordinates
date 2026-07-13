# Order-Safe Product Personalization Design

**Date:** 2026-07-13
**Status:** Approved design, awaiting written-spec review
**Release:** Order-safe personalization foundation

## Context

OurCoordinates already has a strong shared product section, multiple engraving preview snippets, alternate product templates, and a working four-sided bar necklace experience. The re-audit found that several live products still use a generic or mismatched personalization contract. That can collect too little information for fulfillment, show the wrong jewelry geometry, or request engraving for a non-personalized service product.

This release establishes an order-safe, product-specific foundation before the later asset-fidelity phase. Each affected product receives a dedicated alternate product template and a clear cart-property contract. The implementation remains Liquid-first and preserves the existing product catalog.

The existing four-sided bar necklace template is explicitly excluded from implementation. Its code and assignment are not to be changed in this release; it is a regression baseline that must continue to pass verification.

## Goals

1. Give each in-scope product a dedicated Shopify product template.
2. Collect the exact information required to fulfill each personalized item.
3. Show the correct item count, basic jewelry geometry, and engraving placement before checkout.
4. Remove personalization controls from non-personalized service products.
5. Preserve all existing variants, option values, prices, inventory, product media, handles, and publication state.
6. Keep storefront performance excellent by using Liquid, SVG, CSS, and small deferred JavaScript only where required.
7. Publish safely: theme code first, product assignments second, with a captured rollback state.
8. Detect incomplete Shopify propagation before catalog assignments are changed.

## Non-goals

- Rebuilding the already-correct four-sided bar necklace template.
- Adding, deleting, renaming, or repricing variants.
- Changing inventory, product media, descriptions, handles, tags, or publication state.
- Introducing paid customization choices that are not represented by existing variants.
- Adding React, Vue, jQuery, a preview framework, or another third-party storefront dependency.
- Claiming that the first release is a manufacturing proof or photorealistic render.
- Completing the later product-photography, engraving-mask, paw-upload, and production astronomy phases.

## Product contracts

Property names are part of the fulfillment API. Once released, they should remain stable unless order-processing systems are migrated deliberately.

| Product handle | Dedicated template | Required properties | Behavior |
| --- | --- | --- | --- |
| `premium-gift-packaging` | existing `product.non-custom` | none | No engraving UI or engraving property. |
| `routeins` | existing `product.non-custom` | none | No engraving UI or engraving property. |
| `personalized-heart-pendant-necklace` | `product.heart-necklace` | `Engraving - Front` | One heart pendant and one required front engraving. Never show bar faces or a side-count picker. |
| `matching-coordinates-necklaces` | `product.matching-necklaces` | `Engraving - Necklace A`, `Engraving - Necklace B` | Two necklace scenes and two explicit production properties. Default UI can synchronize one shared engraving to both; the shopper can choose separate engravings. |
| `personalized-couple-rings` | `product.couple-rings` | `Engraving - Ring 1`, `Engraving - Ring 2` | Two ring scenes and explicit Ring 1/Ring 2 fields. Existing variants remain the only priced selections. Size/style fulfillment fields are shown only when verified against current product data and never alter price. |
| `chain-link-necklace-custom-charms` | `product.charm-name-necklace` | `Name 1` through the selected paid charm count | The selected existing 2–8-name variant controls the exact number of visible, enabled, and required fields. No manual unpriced quantity picker. |
| `custom-birthstone-rings` | `product.birthstone-ring` | `Birth Month`, `Engraving` | Required birth month and engraving with a birthstone-ring scene. Preserve the existing variant and price. |
| `personalized-nameplate-necklace` | `product.nameplate` | `Name` | Required name and horizontal nameplate preview. |
| `vertical-name-necklace` | `product.vertical-name` | `Name` | Required name and vertical name preview. |

### Four-sided regression baseline

The `custom-bar-necklace` product and its existing `product.four-sided` template, `four-sided` preview profile, and `pdp-preview-four-sided` snippet remain unchanged. Tests will assert that the template still enables engraving and that the established Front/Back/Left/Right property contract remains present. Live verification will confirm its existing behavior, but the assignment tool will mark this handle verification-only and will not include it in its mutation allowlist. If the live assignment does not match the user-confirmed four-sided baseline during preflight, the release pauses for review instead of changing it automatically.

## Theme architecture

### Runtime source of truth

The shipped Liquid and JSON theme files are the storefront source of truth:

- One alternate JSON product template per in-scope personalized product.
- The existing `main-product` section remains the shared product-page shell.
- Each template sets a focused `preview_type` value.
- `main-product` dispatches to a dedicated Liquid snippet for each product contract.
- Every property input remains inside Shopify's native `{% form 'product' %}` form and uses `name="properties[Property Name]"`.
- A stable `data-personalization-contract` value and release marker are rendered in the product form for verification.

This follows Shopify's alternate-template and JSON-template architecture while keeping the product form native.

### Product-specific snippets

Focused snippets own the markup for their product contract:

- `pdp-preview-heart-necklace.liquid`
- `pdp-preview-matching-necklaces.liquid`
- `pdp-preview-couple-rings.liquid`
- `pdp-preview-charm-name-necklace.liquid`
- `pdp-preview-birthstone-ring.liquid`
- `pdp-preview-nameplate.liquid`
- `pdp-preview-vertical-name.liquid`

Each snippet contains only the scene, labels, fields, help text, and scoped styling for that contract. Shared behaviors and metal styling can reuse existing theme primitives. The snippets must not query the catalog, fetch remote assets, or include third-party code.

### Coverage manifest

A version-controlled manifest outside Shopify's shipped theme directories maps each product handle to its expected template suffix and contract:

`scripts/personalization/product-contracts.json`

It is used by tests and the assignment tool, not by the storefront runtime. Each entry contains:

- product handle;
- expected template suffix;
- contract identifier;
- expected property names;
- whether JavaScript enhancement is allowed;
- whether the assignment is mutable in this release.

The four-sided baseline is represented as verification-only. Service products are represented with `non-custom`. No product ID is hardcoded as the durable identity; IDs are resolved from handles during the Admin API preflight and recorded in the rollback snapshot.

## Interaction and fallback behavior

### Liquid-first fields

Heart, birthstone, and nameplate contracts render their complete fields and initial SVG state in Liquid. Adding the item to cart does not require JavaScript. Existing lightweight engraving listeners may enhance text updates where their data contract already applies.

### Matching necklaces

The base markup contains explicit Necklace A and Necklace B fields. JavaScript progressively adds the convenient "same engraving on both" behavior by synchronizing B from A and visually collapsing the duplicate control. Disabling JavaScript leaves two usable, required fields and therefore remains order-safe.

### Couple rings

The base markup always contains separate Ring 1 and Ring 2 engraving fields. Existing variant selectors remain authoritative for priced choices. Any unpriced size/style property must use values confirmed from the live product's fulfillment requirements; if those values cannot be confirmed during preflight, the release stops rather than inventing catalog data.

### Charm-count variants

Liquid renders the exact number of fields required by the initially selected variant. A small deferred script updates visible, enabled, and required fields when the shopper changes to another existing 2–8-name variant.

For no-JavaScript customers, the template provides variant links that reload the product page with Shopify's `?variant=` parameter. The selected variant then renders the correct field count on the server. If a variant's paid count cannot be parsed safely, the contract fails closed with an accessible configuration message and prevents an incomplete personalized order.

### Validation and accessibility

- Required inputs use native `required`, useful `maxlength`, visible labels, and error text.
- Hidden dynamic inputs are disabled so stale values are not submitted.
- Field groups use `fieldset` and `legend` where appropriate.
- Preview-only SVG is hidden from assistive technology; status and validation messages use an accessible live region.
- Keyboard and zoom behavior must remain usable at mobile widths.
- Customer-entered text is escaped by Liquid and assigned with text-safe DOM APIs, never `innerHTML`.

## JavaScript and performance design

The storefront implementation uses native browser APIs and an IIFE-scoped deferred asset. There are no new third-party packages in the browser.

- Standard and non-personalized products load no new personalization script.
- The dynamic script loads only for matching-necklace, couple-ring, or charm-count contracts that need enhancement.
- The script uses `defer`, avoids global namespace collisions, and does not block parsing.
- The added JavaScript asset must remain at or below 16 KB unminified in CI, a stricter proxy for Shopify's 16 KB minified theme guidance.
- Product-specific critical preview CSS is scoped and emitted only for the active renderer; added CSS must remain at or below 8 KB per product page.
- No new remote font, framework, analytics, render-blocking script, or third-party request is introduced.
- No preview image is lazy-loaded if it is above the fold. Later photographic assets must use Shopify image filters, responsive dimensions, and lazy loading only when below the fold.
- Liquid computes contract values once before loops and avoids repeated catalog traversal.

## Assignment tooling

A dependency-free Node script uses Shopify's GraphQL Admin API and requires explicit environment credentials. It defaults to dry-run.

### Preflight

1. Load and validate the manifest.
2. Query products by exact handle and resolve IDs.
3. Capture current `templateSuffix`, variants, option values, prices, inventory quantities/policies, media identifiers, handle, and publication state.
4. Confirm every target template exists in the theme source.
5. Confirm dynamic variant values can be mapped to the approved contract.
6. Write a timestamped rollback snapshot without credentials.
7. Print the exact proposed template-only changes.

Any missing product, duplicate handle, unexpected product shape, invalid template, or unknown dynamic variant stops the run before mutation.

### Apply

Applying requires an explicit `--apply` flag. For each allowlisted product, the script calls `productUpdate` with only:

- the resolved product ID; and
- `templateSuffix`.

The mutation does not send variant, price, inventory, media, title, description, tag, or publication fields. User errors and transport errors stop the run. A post-apply query compares the full commercial fingerprint with the preflight snapshot and fails if anything except the approved template suffix changed.

The Admin API version is pinned to Shopify's supported `2026-07` version for this release and can be overridden deliberately through configuration. The token requires product read/write access and is never written to the repository.

### Rollback

The same tool accepts the captured snapshot and restores only the prior `templateSuffix` values. Theme rollback uses the previously published theme revision. Rollback does not touch catalog commerce fields.

## Test-driven implementation

Tests are written and observed failing before production code for each contract.

### Static contract tests

- Manifest entries are unique and schema-valid.
- Every expected alternate template exists and parses as JSON.
- Template `preview_type` values match their manifest contracts.
- Expected Liquid snippets exist and are dispatched by `main-product`.
- Required line-item property names are present exactly once in the owning contract.
- Non-custom templates do not render engraving fields.
- Dynamic scripts are absent from standard and non-personalized templates.
- The four-sided baseline still exposes its existing faces and contract without source changes.
- Section schema option labels remain within Shopify's 50-character limit.

### JavaScript tests

Dependency-free Node tests exercise the actual browser asset's pure contract functions:

- parse supported 2–8 charm counts;
- reject missing, ambiguous, or out-of-range counts;
- calculate enabled and required name fields;
- synchronize and separate matching-necklace values;
- preserve Ring 1 and Ring 2 values independently;
- serialize only enabled cart properties;
- avoid HTML interpretation of customer text.

### Theme validation

- `shopify theme check --fail-level error` passes.
- All JSON and section schemas parse.
- All JavaScript passes `node --check`.
- Existing schema-label guards pass.
- Asset-size and conditional-loading budgets pass.
- GitHub Actions run the full personalization test set.

### Storefront validation

Before assignments, the published theme must return the expected release marker on 20 consecutive uncached probes. Each request uses a unique cache-busting query and validates one consistent contract version. Mixed old/new markup is a release blocker.

After assignments:

- every in-scope product returns its manifest template and contract marker;
- four-sided behavior remains unchanged;
- non-custom service products add no engraving property;
- every personalized product submits its exact required properties to cart;
- dynamic products are tested across their supported variants;
- previews respond to customer text on desktop and mobile;
- accelerated checkout cannot bypass required personalization fields;
- the catalog commercial fingerprint matches the preflight snapshot;
- a focused performance comparison shows no unexpected regression in script requests, transferred JavaScript, or key storefront timing.

## Release sequence

1. Implement and verify the approved contracts in an isolated development workspace.
2. Commit and push the implementation branch; run GitHub checks and review the diff.
3. Capture the live theme ID, product assignment snapshot, and catalog commercial fingerprint.
4. Publish the theme code without changing product assignments.
5. Require 20 consecutive uncached release-marker probes from the live storefront.
6. Run the assignment tool in dry-run and review its template-only diff.
7. Apply the allowlisted template suffix changes.
8. Verify every affected product, cart payload, preview, mobile layout, and catalog fingerprint.
9. Roll back assignments and the theme revision immediately if contract, propagation, or performance verification fails.

## Definition of done

- All in-scope products use their approved dedicated templates.
- Gift Packaging and Route use `non-custom` and collect no engraving.
- Every personalized order captures the exact approved properties.
- Existing catalog variants, prices, inventory, media, handles, and publication state are unchanged.
- The four-sided bar necklace remains unchanged and verified.
- Theme Check, contract tests, JavaScript tests, schema guards, and performance budgets pass.
- One contract version is observed in 20 consecutive uncached live requests.
- Live desktop/mobile and cart checks pass.
- A tested assignment rollback snapshot and previous theme revision are available.

## Shopify references

- [Product template and native line-item properties](https://shopify.dev/docs/storefronts/themes/architecture/templates/product/overview)
- [JSON alternate templates](https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates)
- [Theme performance best practices](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Parser-blocking JavaScript Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks/parser-blocking-javascript)
- [GraphQL ProductUpdateInput templateSuffix](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ProductUpdateInput)
- [GraphQL productUpdate mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productUpdate)
