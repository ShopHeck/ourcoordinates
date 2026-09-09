# Bubble necklace name entry and zircon product draft

Approved for live publication on September 9, 2026. Implemented and browser-tested on preview theme 164106535170. This revision supersedes the earlier non-custom draft. Live release evidence is recorded in the operations audit folder below.

Product: custom-3d-letter-bubble-necklace, ID 8302991048962. Current variants: four finishes × seven ranges = 28. The owner confirmed a required name/letter field without engraving; K&Y counts as three characters; 18-inch chain plus 2-inch extender; no gift packaging.

[Preview](https://ourcoordinates.com/products/custom-3d-letter-bubble-necklace?preview_theme_id=164106535170&view=bubble-necklace)

The exact-handle override replaces the generic engraving interface and copy even before assigning the dedicated template. Required properties[Name] validates the selected count range, preserves text across finish changes, and blocks invalid cart/express paths. It trims outer whitespace and counts internal spaces and symbols. No engraving preview or coordinate fields. Range labels say characters; Shopify option values and variant IDs are preserved.

product-update-draft.json contains the unapplied Admin description, SEO metadata, and template assignment. Admin copy also needs updating so feeds and schema match the visible copy. The preview still uses the live gallery and metadata.

Validation: all 102 tests pass. Shopify-generated locale headers are parsed without accepting arbitrary malformed JSON; stale tests now follow the current merchant shipping copy and article title. Generated search files retain the canonical builder URL and reviewed About Us summary. Theme Check: 0 errors and 8 existing warnings. All 28 variant IDs/URLs match. Gold K&Y and silver LAUREN cart adds preserve only Name; invalid entries produce no cart request. Mobile sticky submission, 390px overflow, gallery expansion, and an unchanged coordinates necklace control were checked. Test items were removed.

Full audit, four original zircon image candidates, prompts, metadata, and browser evidence:
/Users/heckholdings/Documents/OurCoordinates/audits/bubble-necklace-2026-09-09/zircon/

The release includes seven original lifestyle/gifting images: the two plain-gold images, four zircon images, and a plain-silver image. scripts/bubble-necklace-media.json stages the additions. scripts/release-bubble-necklace.mjs defaults to a read-only plan, then supports explicit content/media application and verification, with before/after snapshots and exact variant/price/SKU guards. Old catalog files are detached from this product and retained in Shopify Files for rollback. Supplier SKU values are preserved; no supplier mapping is invented.
