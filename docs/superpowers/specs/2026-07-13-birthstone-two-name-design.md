# Birthstone ring two-name personalization design

Date: July 13, 2026

## Goal

Replace the birthstone ring's visual preview, birth-month selector, and single engraving field with a focused two-name form that reliably captures both names required to fulfill the product.

## Customer experience

The birthstone-ring personalization area will contain only two text inputs, presented in this order:

1. `Name 1:`
2. `Name 2:`

Both inputs are required. Each field retains the theme's existing text-input styling, character limit, and browser autocomplete protection. There will be no SVG jewelry preview, birthstone color preview, month radio controls, preview hint, or character counter.

## Shopify order contract

The product form will submit exactly these public line-item properties:

- `Name 1`
- `Name 2`

The labels include colons for display, but the Shopify property names do not. The existing `Birth Month` and `Engraving` properties will be removed from this product template. No product, variant, option, price, inventory, image, media, handle, or template assignment will change.

## Implementation boundaries

- Update `snippets/pdp-preview-birthstone-ring.liquid` to render the two required inputs and no preview markup.
- Update `scripts/personalization/product-contracts.json` so the birthstone contract expects only `Name 1` and `Name 2`.
- Update the birthstone-specific contract test before changing production code and verify that it fails for the old implementation.
- Keep the renderer Liquid/HTML only. The conditional personalization JavaScript must remain disabled for this template.
- Keep the existing `birthstone-ring` template suffix and dispatch path so catalog assignment behavior does not change.
- Update the theme editor label from month-oriented language to two-name language.

## Validation

Automated checks will prove that the birthstone renderer:

- contains exactly the two approved Shopify property names;
- marks both text inputs required;
- renders labels in the approved order;
- contains no birth-month property, engraving property, month controls, SVG, or live-preview marker;
- does not load the dynamic personalization asset;
- remains within the existing product-scoped CSS budget.

The full personalization suite, JavaScript syntax checks, Shopify Theme Check, and protected four-sided file hashes will be rerun. After publication, the live alternate template view will be inspected at desktop and mobile sizes, both fields will be populated, serialized form data will be checked, and the release propagation probe will be rerun without modifying the catalog.

## Release strategy

Publish the scoped change through a dedicated GitHub pull request. After CI passes, merge it to `main`, wait for the Shopify GitHub theme integration, and verify the live birthstone alternate-template view. Product-template assignments remain a separate blocked operation and are not part of this change.
