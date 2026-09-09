# Bubble necklace name entry and zircon product draft

Implemented and browser-tested on unpublished theme 164106535170. Not live or merge-ready. This revision supersedes the earlier non-custom draft.

Product: custom-3d-letter-bubble-necklace, ID 8302991048962. Current variants: four finishes × seven ranges = 28. The owner confirmed a required name/letter field without engraving; K&Y counts as three characters; 18-inch chain plus 2-inch extender; no gift packaging.

[Preview](https://ourcoordinates.com/products/custom-3d-letter-bubble-necklace?preview_theme_id=164106535170&view=bubble-necklace)

The exact-handle override replaces the generic engraving interface and copy even before assigning the dedicated template. Required properties[Name] validates the selected count range, preserves text across finish changes, and blocks invalid cart/express paths. It trims outer whitespace and counts internal spaces and symbols. No engraving preview or coordinate fields. Range labels say characters; Shopify option values and variant IDs are preserved.

product-update-draft.json contains the unapplied Admin description, SEO metadata, and template assignment. Admin copy also needs updating so feeds and schema match the visible copy. The preview still uses the live gallery and metadata.

Validation: 26 focused tests pass. Full suite: 91 passes and the same 8 failures present on unchanged baf6c53 (locale JSON and existing copy/SEO invariants). Theme Check: 0 errors and 8 existing warnings. All 28 variant IDs/URLs match. Gold K&Y and silver LAUREN cart adds preserve only Name; invalid entries produce no cart request. Mobile sticky submission, 390px overflow, gallery expansion, and an unchanged coordinates necklace control were checked. Test items were removed.

Full audit, four original zircon image candidates, prompts, metadata, and browser evidence:
/Users/heckholdings/Documents/OurCoordinates/audits/bubble-necklace-2026-09-09/zircon/

Remaining release work: resolve baseline CI, verify zircon SKU/fulfillment mappings and Name import, approve imagery, then obtain live publication approval for coordinated content/media/theme changes. No live Admin mutation, merge, or deployment is included in this draft.
