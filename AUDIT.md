# OurCoordinates — Theme Audit & Conversion Optimization

_July 2026 · Meridian theme · ourcoordinates.com_

This document is the audit that drove the changes in this branch, the merchant
setup needed to activate them, and the merchandising recommendations that go
beyond what theme code can do.

---

## 1. Where the theme already excelled

The Meridian theme has an unusually strong foundation — these were kept intact:

- **Live SVG engraving previews** per product shape (bar, ring, cuff, dog tag, 4-sided, sets) — the single best sentimental hook on the site.
- **On-page coordinates locator** (search a place → drop a pin → exact decimals + a map link saved as order properties for the engraving team).
- **One shipping promise** propagated everywhere from a single setting.
- Honest delivery estimates computed from production + transit settings.
- Strong performance posture: inlined critical CSS, async fonts, one dependency-free JS file, lazy-loaded Leaflet.
- JSON-LD (Organization, WebSite, Product with shipping/returns), `llms.txt` for agent commerce.

## 2. Conversion blockers found & fixed

| Severity | Issue | Fix |
|---|---|---|
| **Critical** | The default product template (`product.json`) capped engraving at **10 characters** while requiring it — a full coordinate pair ("27.7676° N, 82.6403° W") is 22. Customers on any product using the default template could not complete personalization. | Raised to 30 to match every other template. |
| High | Buying was a dead end: add-to-cart did a full-page redirect to `/cart`, with **zero cross-sell or gift-packaging surface** anywhere in the purchase path. | New AJAX cart drawer (see §3). |
| High | Product pages showed **hardcoded 5-star ratings** linking to an empty `#reviews` anchor — a trust liability (and a Google rich-results policy risk given Product schema on the page). | Reviews are now real: Judge.me preview badge + review widget (the app is already installed on the store), or an honest link to `/pages/reviews`, or hidden — merchant-selectable. |
| Medium | `main-cart.liquid` divided by the free-shipping threshold before checking it was non-zero — setting the threshold to $0 would render a Liquid error on the cart page. | Guarded. |
| Medium | Four `<img>` tags (blog, article, image-with-text, collections list) had no `width`/`height` → layout shift (CLS) on those pages. | Intrinsic dimensions added everywhere; product gallery also gained responsive `srcset`/`sizes` and `fetchpriority="high"`. |

## 3. What shipped in this branch

### Cart drawer (`sections/cart-drawer.liquid`)
Add to cart now opens a slide-out cart instead of leaving the product page —
the customer keeps their emotional momentum and the drawer does the selling:

- **Free-shipping progress bar** ("You're $18 away…") — the same math as the cart page.
- **Gift-packaging one-tap upsell** with image and price, auto-hidden once added.
- **"Complete the gift"** row: two suggestions from a configurable collection, skipping products already in the cart. Personalized products deep-link to their PDP ("Personalize"); products tagged `no-personalization` or `quick-add` get an instant Add button.
- **Gift note** stored on the cart and submitted with checkout in the same form (no async race).
- Line-item quantity steppers and remove via `/cart/change.js`; every mutation re-renders the drawer server-side through the Section Rendering API, so Liquid stays the source of truth.
- Engraving lead-time reminder + guarantees above the checkout button.
- Accessible: native `<dialog>` (focus trap, Esc), `aria-live` announcements, screen-reader labels on steppers.
- Progressive: disable the drawer in the customizer (or fail a fetch) and the classic `/cart` flow returns; the header cart link is a real link.

### Product page
- **"Make it gift-ready" add-on** — checkbox above add-to-cart that adds the Premium Gift Packaging product in the same action. Rendered hidden and revealed only by the JS that powers it, so it can never appear broken.
- **Occasion order-by line** — "Ordering for Christmas? Order by Friday, Dec 12 to unwrap it in time," computed from your production + transit settings with the same 3-day buffer as the delivery estimate. Hides itself automatically when it's too late or past. Configure once per season in Theme settings → Gifting & upsells.
- **Real reviews** (see §2).
- **Recently viewed** strip (localStorage; renders only when there's something to show) — recovers shoppers comparing several pieces.

### Cart page
- Gift-packaging upsell banner (plain HTML form — works without JS).
- Guarantees repeated under the checkout button.

### Homepage (`templates/index.json`)
- **Trust strip** after best sellers (was only on collection pages).
- **New "Story CTA" section** after Moments: _"Don't know the coordinates? Start with the story."_ → routes emotional-but-undecided visitors into the existing gift-finder quiz (`/pages/gift-finder`), which was previously unreachable from the homepage. Supports optional stat blocks (e.g. review score) you control.
- **Moments cards now deep-link by occasion**: The proposal → `for-couples`, Where you met → `shop-couples-necklaces` (was: every card → the same generic collection).

### Site-wide
- Header: live cart count that updates with the drawer, plus an optional **persistent CTA button** (set label + link in the header settings — point it at your best seller or the gift finder).
- Product cards: configurable **"Free engraving"** note under prices (hidden for products tagged `no-personalization`).

## 4. Merchant setup checklist (10 minutes in admin)

1. **Theme settings → Gifting & upsells**
   - Gift packaging product → select _Premium Gift Packaging_.
   - Cart upsell collection → _Best Sellers_ (or a dedicated "Add-ons" collection).
   - Next gifting occasion → e.g. `Christmas` / `2026-12-25` (update per season; it hides itself when past).
2. **Tag products** the drawer may instant-add (no personalization needed): add tag `quick-add` or `no-personalization` (e.g. gift packaging, magnetic couple sets, charm bracelets). Untagged products show "Personalize" and link to their page — nothing breaks if you skip this.
3. **Header settings** → set the CTA link (label defaults to "Start your piece").
4. **Judge.me** → ensure the app embed is enabled in Theme settings → App embeds so the PDP badge + review list render. If you ever remove the app, switch "Review summary" to _Plain link_ in the product section settings.
5. **Cart drawer section** (Customizer → any page → Cart drawer) → set the empty-cart secondary link to `/pages/gift-finder`.
6. Confirm collections `for-couples` and `shop-couples-necklaces` are published (Moments cards now link to them).

## 5. Merchandising recommendations (beyond theme code)

### New collections to create

> **Update:** the occasion set below is now built out — landing templates
> with order-by banners ship in the theme, and the full admin setup guide
> (handles, tags, seed products, seasonal calendar) lives in
> [`docs/occasion-collections.md`](docs/occasion-collections.md).
The Moments section converts best when each card lands on a matching, curated
collection. You already sell the right products for all of these:

| Collection (suggested handle) | Seed products you already carry | Links from |
|---|---|---|
| The Proposal Shop (`proposal`) | Couple rings, matching coordinate necklaces, padlock necklace | Moments "The proposal" |
| Long Distance (`long-distance`) | Magnetic hearts/bracelets/beads sets, matching coordinates sets | Moments "Where you met", email flows |
| New Home (`new-home`) | Coordinates keychain, horizontal bar, cut-out nameplate | Moments "The hometown" |
| In Loving Memory (`memorial`) | Paw-print necklaces, coordinates necklace, star map | Moments "A resting place" |
| Pet Parents (`pets`) | Both paw-print necklaces + paw engraving upsell | Homepage featured row (seasonal swap) |
| Graduation (`graduation`) | Dog tag, keychain, vertical bar (campus coordinates) | May–June campaigns |
| Military & Deployment (`military`) | Dog tags, rustic steel, leather coordinate bracelet | Content/SEO + Father's Day |
| Under $30 gifts (`gifts-under-30`) | Keychain, charm bracelets, HOPE bracelet | Cart drawer upsell collection |
| Star Maps (`star-maps`) | Star map necklace + galaxy signet | "The dream" moment, anniversary emails |

Once created, point each Moments card at its collection in the customizer —
they're plain settings.

### AOV & offer plays
- **Set the cart upsell collection to "Under $30 gifts"** — small add-ons attach far better than a second $60 hero product.
- **Bundle-and-save on sets**: your BOGO collection exists, but sets (necklace + bracelet, his & hers) deserve an automatic discount ("Sets save 15%") — Shopify native automatic discount, zero code, and the coordinates-set template already lets one engraving fill every piece.
- **Free-shipping threshold**: at $50 with best sellers around $30–45, the drawer's progress bar naturally pulls a second item — watch the "away from free shipping" → add-on attach rate; consider testing $60 vs $50.
- **Welcome offer**: the footer newsletter promises early access; wire a 10% welcome code (Shopify Email or Klaviyo) and update the newsletter copy to say so — capture rate roughly doubles with an incentive.
- **Gift-date reminder emails**: you already collect the occasion via engraving; a simple "anniversary next year?" flow is the highest-LTV email a jewelry store can send.

### Campaign calendar hooks (use the occasion setting)
Valentine's (order-by ≈ Feb 5) · Mother's Day (≈ May 1) · Father's Day (≈ Jun 5) ·
Christmas (≈ Dec 10, matching your 5-day production + 4-day transit + buffer).
Set once per season in Theme settings; the PDP reminder does the urgency work
honestly — no fake countdown timers.

### Measure
Watch in analytics after launch: add-to-cart → checkout rate (drawer),
gift-packaging attach rate (target 8–15%), upsell row CTR, AOV, and the
gift-finder entry rate from the new homepage Story CTA.

## 6. Round 2 — personalization templates (July 2026)

Follow-up pass focused on making the engraving preview match each product's
real personalization options:

- **Variant-driven sides.** On four-sided products (e.g. the Custom
  Coordinates Necklace), the number of engraving inputs and preview faces now
  follows the shopper's variant selection (any option valued like "2 Sides").
  The old separate "How many sides?" picker — which duplicated the variant and
  never changed the price — renders only for products without a sides variant.
  Inputs for inactive sides are disabled, so an engraving for a side the
  shopper didn't pay for can never ride into the cart.
- **Realistic preview.** The four-sided preview now reads as one pendant —
  chain and bail, brushed-metal gradients, bevel and drill-hole details — and
  every preview site-wide recolors live to the chosen metal variant (gold,
  rose gold, silver, black). Long engravings compress into the bar exactly the
  way a laser layout would, instead of overflowing the artwork.
- **Guided flow.** Buy-box choices are numbered (01 Metal · 02 Sides · 03 Your
  engraving), sides 2–4 are labeled optional with example placeholders, and
  using the coordinate finder on a 1-side variant surfaces a gentle
  "split it across two sides" tip instead of silently switching variants.
- **Template repairs**: `product.four-sided.json` pointed at the wrong preview
  (`vertical-bar`, single input) with a 10-character cap; vertical-bar and
  dog-tag templates capped input below their own placeholder text. All
  corrected (15–20 chars, per-shape).

**Round 3 — sets.** The Coordinates Set template now supports per-product
previews. A new "Set necklace style: 4-sided pendant" mode (used by the new
`product.necklace-bracelet-set` template) renders the necklace as the real
4-sided bar — chain, bail, per-side faces — and every companion piece (cuff
bracelet, keychain, ring) as its own realistic scene. One shared coordinates
input is laid out per piece exactly as engraved: latitude on the necklace
front, longitude on the back, the full pair on the bracelet; up to two more
necklace sides are optional inputs, and each companion piece can be engraved
differently via a tucked-away override. Per-target order properties
("Engraving — Necklace Front", "Engraving — Bracelet", …) submit only when
they carry text. Legacy sets (same text on every piece) are untouched —
assign the new template to the Necklace + Bracelet Set in admin to activate
the duo experience.

## 7. Round 4 — per-product set templates & the real star-map sky (July 2026)

Five products now have templates whose engraving preview matches exactly
what gets engraved:

| Product (handle) | Assign this template | Preview |
|---|---|---|
| `coordinates-necklace-keychain-set` | `product.necklace-keychain-set` | 4-sided necklace faces + keychain fob, coordinates split front/back, full pair down the keychain |
| `coordinates-ring-necklace-set` | `product.ring-necklace-set` | 4-sided necklace faces + ring band with the pair curved around it |
| `coordinates-ring-bracelet-set` | `product.ring-bracelet-set` | Ring band + cuff, the same line engraved on each (per-piece override available) |
| `complete-coordinates-set` | `product.complete-set` | All four pieces at once — necklace faces, cuff, keychain, ring — companions shown two-up |
| `star-map-necklace` | `product.star-map` (updated in place) | See below |

**Assignment is one dropdown per product**: Admin → Products → (product) →
Theme template. Everything else — shared coordinates input, per-piece order
properties ("Engraving — Keychain", …), optional extra necklace sides,
per-piece overrides, metal recoloring — comes from the templates.

### The star map preview is real astronomy
The Star Map Necklace sells "the exact night sky from any date and place,"
but its old template previewed a flat coordinates bar. It now renders a disc
pendant whose sky is **computed, not decorative**: the shopper picks the
date, time, and place (same "Find my coordinates" pin-drop), and the theme
JS calculates local sidereal time and the alt/az of the ~100 brightest stars,
projects them onto the disc (zenith center, horizon at the rim, chart
orientation), and draws recognizable constellation lines — Orion in a
January sky, Scorpius in July, the Southern Cross from Sydney. The caption
and date engrave live under the map exactly as ordered. Orders carry
`Star Map — Date / Time / Location` plus the hidden exact-decimal
coordinates and map-verification link for the production team. No new
dependencies; the math and catalog add ~4 KB to the existing JS file.

### Conversion & AOV changes in this round
- **"Matching set" badge** on product cards (title says "Set"/"Set of 2" or
  tag `set`/`bundle`/`matching-set`) — sets are the AOV driver, so they now
  stand out in every grid. Sale and back-soon badges still take priority.
- **Homepage sets row** ("Better together") after the trust strip, pointed
  at a `coordinates-sets` collection, with a new optional subheading line on
  all Featured-collection sections.
- **Featured collection sections hide themselves** when their collection is
  missing or empty (they stay visible in the theme editor) — so the sets row
  can ship before the collection exists.
- **`collection.sets` landing template** (trust strip + "one place, two
  people" story CTA) for the sets collection.
- **Collection empty state**: an empty collection now shows a short line and
  a "Shop all pieces" button instead of a blank grid.
- The **complete set's cross-sell** says "Start a second story" (best
  sellers) — the customer who owns every piece for one place is the easiest
  repeat purchase in the store: a second place.

**Cuff preview redesign (follow-up).** The bracelet/cuff SVG used on the
Coordinates Cuff Bracelet page (and inside every set preview) was rebuilt:
the old abstract band now draws as a true open cuff — three-quarter view,
ball terminals at the gap — and the engraving sits in a recessed channel
along the front of the band, so the personalization always reads as light
text on a dark surface regardless of the chosen metal (the old preview went
dark-on-dark/dark-on-gold once a metal variant was selected).

### Merchant checklist for this round (5 minutes)
1. Assign the five templates (table above).
2. Create collection **`coordinates-sets`** containing the four set products
   (+ the matching-necklaces set), assign it the **`sets`** template, and the
   homepage row lights up automatically.
3. Sets are the natural place for an automatic **"Sets save 15%"** discount
   (Shopify native, no code) — the badge and homepage row do the promotion.
4. The star map's date/time/place arrive as order properties — confirm the
   production flow reads `Star Map — Date`, `Star Map — Time`,
   `Star Map — Location` (plus `_Exact Decimal Coordinates` /
   `_Verify on Map` as before).

## 8. Not changed, deliberately

- Checkout itself (Shopify-hosted).
- The coordinates-builder quiz page (`page.coordinates-builder.liquid`) — it's a self-contained experience; the homepage now feeds it traffic.
- No new fonts, no new JS dependencies, no external scripts — the drawer and all new features reuse the existing single CSS/JS files, keeping the 90+ PageSpeed strategy intact.

## 9. Deployment (updated July 12, 2026)

The published theme (`ourcoordinates/main`) is connected to this repo's
`main` branch via Shopify's GitHub integration — merges sync to the live
theme within seconds. **Correction to the note shipped earlier today:** the
integration was connected and working all along; what broke Round 4 was the
sync's silent per-file size cap. `sections/main-product.liquid` outgrew
~50 KB at PR #3 and every sync since skipped just that file (no error
anywhere), freezing the preview logic at the PR #2 version and causing the
set templates to be stripped of `set_necklace_style` against the stale
schema. Fixed by splitting the section into `snippets/pdp-*` (~21 KB
section, byte-identical rendering), re-serializing the five set templates,
and adding a CI size guard (`.github/workflows/theme-ci.yml`) so an
oversized section can never merge silently again. Full incident write-up
and manual-deploy fallback: `docs/deployment.md`.
