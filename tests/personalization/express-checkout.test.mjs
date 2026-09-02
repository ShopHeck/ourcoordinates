import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

/*
  Sept 2026 audit — express checkout contracts.
  Dynamic checkout buttons bypass the theme's submit handlers and the cart,
  so the PDP block must be rendered hidden and gated by global.js, and the
  cart page must persist the gift note independently of the form POST.
  (Codex review P1s on PR #42.)
*/

test('PDP express checkout is rendered hidden and gated by global.js', () => {
  const product = read('sections/main-product.liquid');
  const js = read('assets/global.js');

  assert.match(product, /payment_button/);
  assert.match(product, /data-express-checkout hidden/, 'wallet block must start hidden (no-JS = no bypass)');
  assert.match(product, /data-express-note hidden/);
  assert.match(product, /"id": "show_dynamic_checkout"/);
  assert.match(product, /\{\{ form \| payment_terms \}\}/);

  assert.match(js, /\[data-express-checkout\]/);
  assert.match(js, /\[data-gift-wrap\]:checked/, 'gift packaging must hide express checkout');
  assert.match(js, /input\[required\], textarea\[required\], select\[required\]/, 'required engraving must gate express checkout');
  assert.match(js, /attributeFilter: \['required', 'disabled'\]/, 'set/4-sided previews toggle required at runtime');
});

test('cart page persists the gift note before a wallet checkout can start', () => {
  const cart = read('sections/main-cart.liquid');
  const drawer = read('sections/cart-drawer.liquid');
  const js = read('assets/global.js');

  assert.match(cart, /content_for_additional_checkout_buttons/);
  assert.match(drawer, /content_for_additional_checkout_buttons/);
  assert.match(cart, /name="note" data-cart-note/);
  assert.match(cart, /data-cart-note-status/);

  assert.match(js, /\[data-cart-note\]/);
  assert.match(js, /\/cart\/update\.js/);
  assert.match(js, /keepalive: true/);
  assert.match(js, /setAttribute\('aria-busy', 'true'\)/, 'wallet buttons must be held busy while a save is in flight');
  for (const ev of ["'pointerdown'", "'touchstart'", "'focusin'"]) {
    assert.ok(js.includes(ev), `wallet block must flush the note on ${ev}`);
  }
  const css = read('assets/base.css');
  assert.match(css, /\.additional-checkout-buttons\[aria-busy="true"\]\{opacity:0\.55;pointer-events:none;\}/);
});

test('cart page and drawer render the same upsell snippet', () => {
  const cart = read('sections/main-cart.liquid');
  const drawer = read('sections/cart-drawer.liquid');
  assert.match(cart, /render 'cart-upsells'[^\n]*add_mode: 'form'/);
  assert.match(drawer, /render 'cart-upsells'[^\n]*add_mode: 'drawer'/);
});
