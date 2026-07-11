# Occasion Collections — July 2026 → January 2027

Seven occasion collections covering every significant gifting moment between
now and January 2027. The theme side ships in this branch — each collection
gets a dedicated landing template with a tailored eyebrow, an automatic
**"Order by …" deadline banner** (computed from your production + transit
settings, self-hiding when it's too late), a sentimental gift-finder CTA, the
trust strip, and the verified review.

Creating the collections themselves is a Shopify-admin task (~15 minutes
total). Everything you need to click is below.

## The calendar

| Occasion | Date | Standard-shipping order-by* | Feature on homepage |
|---|---|---|---|
| Grandparents Day | Sun **Sep 13, 2026** | Sep 1 | mid-Aug → Sep 13 |
| Off to college / long-distance | Aug–Sep (evergreen) | — | Aug → mid-Sep |
| Fall weddings & engagements | Sep–Oct (evergreen) | — | mid-Sep → Oct 31 |
| Christmas | Fri **Dec 25, 2026** | **Dec 13** | Nov 1 → Dec 13 |
| Proposal season | peak **Dec 24, 2026** | Dec 12 | Nov 15 → Dec 12 |
| New Year / new beginnings | Fri **Jan 1, 2027** | Dec 20 | Dec 14 → mid-Jan |
| Anniversaries | evergreen | — | any gap |

\* Computed by the banner itself from Theme settings (currently 5 production
+ 4 transit + 3 buffer days). Change the settings and every date shifts
automatically. Also on the radar: **Thanksgiving** Nov 26 (order by Nov 14 —
fold into the Christmas hub), **Hanukkah** begins Dec 4 (order by ~Nov 22 —
worth a callout inside the Christmas collection description), **BFCM**
Nov 27–30 (promo, not a collection — use the announcement-bar override), and
**Valentine's 2027** (outside this window; start featuring `for-couples`
mid-January).

## Create each collection (admin → Products → Collections)

For each row: create the collection with this title/handle, paste the
description, set the automated rule to `Product tag` equals the tag shown,
then under **Theme template** pick the matching template. Tag the seed
products (Products → bulk edit → add tag).

### 1. Christmas Gift Guide — `christmas-gifts` · template `christmas` · tag `occasion:christmas`
> Personalized Christmas gifts they'll wear all year. Coordinates necklaces, bracelets & rings engraved with the places that matter — hometowns, first dates, family porches. Order by Dec 13 for delivery by Christmas. Free engraving.

Seed products: best sellers plus `festive-christmas-light-charm-bracelet`,
`custom-3d-letter-bubble-necklace`, `personalized-love-letter-necklace-rose-gift-box`,
`matching-coordinates-necklaces`, `coordinates-necklace`, `custom-bar-necklace`,
`star-map-necklace`, `coordinates-keychain`, `personalized-heart-pendant-necklace`.
(Broad by design — most of the catalog is giftable; tag generously.)

### 2. Grandparents Day — `grandparents-day` · template `grandparents-day` · tag `occasion:grandparents`
> Grandparents Day is September 13. Give them the coordinates of the family's beginning — the farmhouse, the front porch, the hometown. Engraved jewelry with free personalization, made in the USA.

Seed: `mama-bear-necklace-with-birthstone`, `mama-necklace`, `custom-birthstone-rings`,
`coordinates-necklace`, `personalized-horizontal-bar-necklace`, `coordinates-keychain`,
`interlocking-circle-necklace`, `personalized-nameplate-necklace`.

### 3. Long Distance — `long-distance` · template `long-distance` · tag `occasion:long-distance`
> Miles apart, never far. Matching coordinates jewelry and magnetic couples sets for long-distance love, college drop-offs, and deployments — both of you wearing the same meaningful place.

Seed: `matching-coordinates-necklaces`, `magnetic-couple-necklace`,
`magnetic-love-bracelets-for-couples`, `magnetic-bead-bracelet-set`,
`magnetic-couples-bracelet-set`, `lock-bracelet-matching-key-necklace-set`,
`coordinates-keychain`, `925-sterling-silver-airplane-necklace`,
`925-sterling-silver-airplane-bracelet`, `dainty-compass-charm-bracelet`.

### 4. Wedding & Engagement Gifts — `wedding-gifts` · template `wedding-gifts` · tag `occasion:wedding`
> The exact spot you said "I do," engraved forever. Coordinates jewelry for couples, bridal parties, and parents — the venue, the aisle, the first-dance floor. Free engraving & photo proof.

Seed: `matching-coordinates-necklaces`, `personalized-couple-rings`,
`coordinates-necklace`, `coordinates-bracelet`, `star-map-necklace`,
`personalized-lock-necklace`, `custom-bar-necklace`, `cut-out-nameplate-necklace`.

### 5. The Proposal Shop — `proposal` · template `proposal` · tag `occasion:proposal`
> Half of all proposals happen between Thanksgiving and New Year's. Engrave the exact spot you'll ask — or the spot you already did. Coordinates jewelry for the moment that changes everything.

Seed: `personalized-couple-rings`, `matching-coordinates-necklaces`,
`personalized-lock-necklace`, `lock-bracelet-matching-key-necklace-set`,
`star-map-necklace`, `coordinates-necklace`, `personalized-heart-pendant-necklace`,
`magnetic-couple-necklace`.

### 6. New Beginnings — `new-beginnings` · template `new-beginnings` · tag `occasion:new-beginnings`
> New year, new coordinates. The city you're moving to, the summit on this year's list, the dream you're finally chasing — wear it until you get there. Custom engraved, made in the USA.

Seed: `star-map-necklace`, `dainty-compass-charm-bracelet`,
`925-sterling-silver-airplane-necklace`, `925-sterling-silver-airplane-bracelet`,
`coordinates-keychain`, `coordinates-necklace`, `leather-coordinate-bracelet`,
`galaxy-signet-ring`.

### 7. The Anniversary Shop — `anniversary` · template `anniversary` · tag `occasion:anniversary`
> An anniversary gift that proves you remember the exact spot, not just the date. First date, first apartment, the altar — engraved in gold, silver, or rose gold. Free engraving & photo proof.

Seed: `coordinates-necklace`, `custom-bar-necklace` (names + date + coordinates
across four sides), `matching-coordinates-necklaces`, `personalized-couple-rings`,
`coordinates-bracelet`, `star-map-necklace`, `personalized-chain-link-bracelet`,
`flat-bar-coordinates-choker-style-necklace`.

## Wire the theme to the seasons (customizer, 2 minutes each swap)

1. **Global occasion setting** (Theme settings → Gifting & upsells) powers the
   PDP order-by line storewide. Rotation: now → `Grandparents Day / 2026-09-13`;
   Nov 1 → `Christmas / 2026-12-25`; Dec 14 → `New Year's Day / 2027-01-01`.
2. **Homepage "featured2" collection** (currently Men's): swap per the
   calendar's Feature column.
3. **Moments cards** — once collections exist, point: "The proposal" →
   `/collections/proposal`, "The hometown" → `/collections/long-distance`,
   "The dream" → `/collections/new-beginnings`.
4. **Cart drawer & story CTA** need no changes — they inherit automatically.
5. **After Dec 13**: standard shipping can't make Christmas. Switch the
   announcement-bar override to your express-shipping message (your shipping
   page lists express from $5.99) or pivot the homepage to New Beginnings —
   the banners go quiet on their own, so nothing on the site over-promises.

## Why templates instead of API

Collections are store data, not theme files — they can't ship in this repo.
If you authorize the Shopify connector on this project, a future session can
create all seven (with rules, descriptions, and template assignments) in one
pass. Until then the admin steps above take ~15 minutes.
