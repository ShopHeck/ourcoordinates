# Storefront experience improvements — September 5, 2026

## Release status

Theme implementation for priorities 1 and 2 of the storefront audit. The theme remains a development preview and draft PR, not a live theme release or completion of the entire improvement program. After the owner explicitly approved the prepared 12-product description corrections, those description-only changes were applied and verified live. No production theme was published, no checkout submitted, and no Shopify page/policy bodies were changed.

Base: `6a45556` on `origin/main`, including merged PR #43. Branch: `codex/storefront-experience`.

Preview: https://ourcoordinates.myshopify.com/?preview_theme_id=163989881090

## Implemented

- Gift finder filters against the cheapest available variant in the storefront currency, links to that exact variant, shows fewer than three results when needed, and provides a no-match/browse fallback. Budget labels and answer summaries are localized. No over-budget padding.
- Compact homepage hero with accurate destination labels, clearer supporting text and usable buttons. Featured products immediately follow the hero. Existing jewelry imagery, typography and warm palette are retained; no new imagery or reviews are fabricated.
- Product cross-sell follows the purchase form and uses “Pair it with” / “View product” instead of calling a single necklace a set.
- Mobile sticky action says “Personalize your piece” until required fields are complete, then uses the existing add-to-cart path. Existing validation, express-payment gate, cart drawer, gift notes and fulfillment properties are preserved.
- Single default variants without option radios now resolve correctly; previously the express-payment gate could incorrectly mark them unavailable.
- Shipping and FAQ routes retain their existing handles but use shared, version-controlled delivery content. Product shipping accordions share the same facts. The existing in-stock magnetic-set shipping exception is preserved.
- Best Sellers retains one crawlable editorial block below the grid, with its CollectionPage description generated from the same corrected copy. Cuff line count and return/proof statements are corrected. Canonical/filter/pagination guards remain in place.
- Narrow-screen header and newsletter sizing fixes keep shopping controls in view. New copy and behavior have regression coverage, including Shopify's 1,000-character translation limit.

## Owner-confirmed facts

US standard shipping is $5.99, free on US orders over $50. All orders include tracking. Engraving takes five business days from processing, with a noon Eastern processing cutoff. Standard transit takes 7–10 business days after dispatch. Photo proofs are not yet standard and must not be promised as an approval checkpoint. Checkout rate configuration itself was not changed or independently verified.

## Verification

- 94 automated tests pass using the same test glob as CI, including the description-only apply guards.
- JavaScript syntax checks pass for global, personalization-dynamic, star-map-catalog and star-map scripts.
- Shopify Liquid/schema validation passes for changed theme files.
- Theme Check: zero errors, eight pre-existing warnings in legacy preview/builder files.
- Shopify sync guards pass: section/snippet size, final schema position and option-label length.
- Hosted development theme was inspected after upload. A too-long locale value was caught by Shopify upload, split, guarded by a test, successfully synced and rechecked in the browser.
- Homepage at 390×844: first product card starts around 681 px instead of the audited 1,306 px. Desktop at 1440×900: around 783 px instead of 1,334 px. These are layout measurements, not conversion or speed benchmarks.
- Best Sellers at 390×844: product cards still start around 418 px; corrected editorial remains below them; canonical URL is unchanged.
- No horizontal overflow in the 390-pixel homepage, Best Sellers, cuff, birthstone, shipping and FAQ checks, or the desktop homepage check.
- The additional 320×740 homepage check exposed header, newsletter and review-arrow overflow. After scoped fixes and confirmed stylesheet sync, the final check reports `overflow=false`; the cart link remains inside the viewport.
- Cuff: public landmark search applies coordinates; blank engraving routes the sticky action to personalization without adding; changing finish updates image/URL. A Silver cuff with `48.8583° N, 2.2945° E` was added successfully, verified in the cart, then removed. The pre-existing necklace cart item and its engraving were preserved.
- Birthstone: one name keeps the sticky action in personalization state; both names enable its Add label. The false sold-out express warning is gone after the single-variant fix. No birthstone item was added.
- Shipping page visibly contains the final five-business-day/noon-Eastern wording; FAQ details open normally.
- Browser logs included a Shopify portable-wallet metrics fetch failure. This is not a clean-console certification or an end-to-end payment test. No new tracking was installed.

Screenshots are in the local operations artifact directory `artifacts/storefront-implementation-2026-09-05`: homepage desktop/mobile, gift finder, collection, shipping, product and personalized-cart evidence.

## Approved product-description corrections — applied

On September 5, following explicit owner approval, all 12 prepared product-description corrections were applied through a validated `productUpdate` mutation containing only `id` and `descriptionHtml`. The full dry run found no drift. A fresh backup was saved before the first mutation; each product was refetched immediately before and after its update. Titles, handles, status, vendor, product type, tags, template, SEO, options, variant IDs/prices/SKUs/availability and media were compared and remained unchanged.

Backup: `.product-admin-backups/2026-09-05T22-11-59-953Z-delivery-pre-apply.json`. Per-product verification receipt: `.product-admin-backups/2026-09-05T22-11-59-953Z-delivery-receipt.json`. Both remain local and ignored by Git.

Public product JSON matches the approved description exactly for all 12. Public HTML contains the replacements on the 11 pages that render the product description directly; none of the 12 pages contains the replaced old paragraphs. `personalized-lock-necklace` renders `pdp-description-padlock` instead, so its Admin/public product data is corrected but the custom theme description is unchanged.

The scoped apply runner is `scripts/apply-delivery-copy-plan.mjs`. It validates the complete plan against the original backup and current approved delivery strings, allows only the 12 approved handles, rejects missing/duplicate/extra targets, saves a fresh backup, detects timestamp/hash drift and verifies non-description product data. It defaults to dry run, skips descriptions already matching the approved result, and does not automatically retry uncertain mutations. Rollback requires reading the saved backup and applying only the original `descriptionHtml` to each exact ID after checking for intervening edits; do not restore unrelated catalog fields.

## Required before claiming factual consistency sitewide

The theme cannot update Shopify-owned product descriptions, policy bodies, or content returned through Admin/Storefront APIs.

An active-product read-only backup identified the 12 corrected products. `scripts/prepare-delivery-copy-plan.mjs` generates the offline review plan with exact paragraph replacements, product IDs, timestamps and SHA-256 preconditions. It has no network or mutation capability. It preserves unrelated description HTML and the existing magnetic-set exception, and flags unfamiliar copy instead of rewriting it broadly.

Local prepared plan: `.product-admin-work/delivery-copy-plan.json`; backup: `.product-admin-backups/2026-09-05T21-46-39-541Z-manual-backup.json`. These artifacts are ignored by Git. The plan is not compatible with the older full-description rewrite tool's editorial-length constraints; do not pass it to that tool or bypass those guards.

The 12-product apply is complete. Separate approval is still needed for policy/page cleanup: review the refund policy's obsolete proof dependency and the original Shipping/FAQ bodies, including content surfaced outside the theme. Do not merge this draft as “all delivery conflicts fixed” while those sources remain stale.

The birthstone description also contains unrelated inaccurate FAQ claims about a live preview and size options; those need a separate exact product-contract content review. The new theme does not invent those capabilities.

## Remaining program, in order

1. Finish the remaining policy/page source-content corrections with separate approval; review this draft, run final CI and merge only after separate release approval. Verify active-theme/public behavior after sync; retain the previous theme for rollback.
2. Product evidence: real on-body scale, engraving close-up with a size reference, all finishes under consistent lighting, cuff fit/rotation, packaging and an actual engraving/unboxing clip. Start with cuff, coordinates necklace and leather bracelet. Obtain permission for attributed customer stories; do not turn illustrations into testimonials.
3. Merchandising: use sales and margin data to curate signature coordinates, matching gifts and broader accessories. Validate genuine set inclusions and variant pricing. Do not alter the free-shipping threshold without a margin review.
4. Safe cart editing: design and test line-key-specific engraving correction, preserving every paid property and avoiding duplicate items. This is not included in the current patch.
5. Measurement and retention: inventory existing events/apps/flows before additions; verify one add event per action and a complete purchase funnel. Never send engraving text or exact coordinates to analytics. Activate consent-aware recovery/care/review/reminder flows only after approved copy, suppression rules and test receipts.
6. Performance/SEO: measure mobile Core Web Vitals and app costs, then prioritize measured bottlenecks. Revalidate representative collections/products, structured data and indexability. No ranking, revenue or Core Web Vitals improvement is claimed from the layout changes alone.
