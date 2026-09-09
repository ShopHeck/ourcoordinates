# Bubble necklace product release draft

Status: local implementation and unpublished Shopify preview. This is not a live release or a merge-ready change.

Product: `custom-3d-letter-bubble-necklace`, product ID `8302991048962`.
Preview theme: `164106535170` (unpublished).
Preview URL: https://ourcoordinates.com/products/custom-3d-letter-bubble-necklace?preview_theme_id=164106535170&view=bubble-necklace

The preview uses the real product's current title, description, and gallery. `product-update-draft.json` records the proposed Admin changes; none have been applied. The existing URL and all 72 variants are preserved.

Blocking product detail: current styles/finish images conflict (J vs A; OLIVIA, LAUREN, and different chain types). The owner has specified this product is not customizable. Confirm the actual fixed designs and rose-box inclusion before finalizing the image replacement plan and applying content changes. The generated gold J lifestyle candidates are provisional and remain outside the theme pending this confirmation.

Validation: 38 focused tests pass; Theme Check has 0 errors and 8 existing warnings. The full suite has 88 passing tests and 8 pre-existing failures, versus 86 passes and the same 8 failures on unchanged baf6c53. Do not weaken the tests to bypass this gate. Real preview: all 72 option combinations map to their expected form/URL IDs; cart add succeeds with no properties; test item removed; no mobile overflow. The coordinates necklace control retains its four-sided required-front engraving contract. The product-scoped popup close button works at 390px.

Task evidence and generated image masters live in `/Users/heckholdings/Documents/OurCoordinates/audits/bubble-necklace-2026-09-09/`. The report records copy, image provenance, verification, and remaining release work.
