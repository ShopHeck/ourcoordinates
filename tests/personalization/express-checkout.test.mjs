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
  assert.match(js, /attributeFilter: \['required', 'disabled', 'data-express-blocked'\]/, 'set/4-sided previews toggle required at runtime');
  // validators whose inputs carry no `required` (set per-piece mode) veto via the form dataset
  assert.match(js, /form\.dataset\.expressBlocked/);
  assert.match(js, /addEventListener\('oc:express-recheck', update\)/);
});

test('set template per-piece mode vetoes express checkout until every piece is engraved', () => {
  const js = read('assets/global.js');
  const setSnippet = read('snippets/pdp-preview-set.liquid');
  assert.match(setSnippet, /data-set-piece-input=/);
  assert.match(js, /function syncExpressGate\(\)/);
  assert.match(js, /gateForm\.dataset\.expressBlocked = 'Express checkout unlocks once every piece has its engraving\.'/);
  assert.match(js, /new CustomEvent\('oc:express-recheck', \{ bubbles: true \}\)/);
  // called on toggle, on per-piece input, and at init
  assert.ok((js.match(/syncExpressGate\(\);/g) || []).length >= 3, 'syncExpressGate must run on toggle, input and init');
});

test('free-shipping nudge is recomputed when the variant changes', () => {
  const nudge = read('snippets/pdp-shipping-nudge.liquid');
  const js = read('assets/global.js');
  assert.match(nudge, /data-ship-nudge data-threshold="\{\{ nudge_threshold \}\}"/);
  assert.doesNotMatch(nudge, /cart\.total_price/, 'Buy Now bypasses the existing cart, so its shipping claim must be variant-only');
  assert.match(nudge, /data-ship-nudge-text/);
  assert.match(nudge, /Add to cart to combine items/);
  assert.match(js, /var nudge = root\.querySelector\('\[data-ship-nudge\]'\);/);
  assert.match(js, /var remaining = threshold - v\.price;/);
  assert.doesNotMatch(js, /nudge\.dataset\.cartTotal/);
});

test('gift note is persisted before a wallet checkout can start — cart page and drawer', () => {
  const cart = read('sections/main-cart.liquid');
  const drawer = read('sections/cart-drawer.liquid');
  const js = read('assets/global.js');

  assert.match(cart, /content_for_additional_checkout_buttons/);
  assert.match(drawer, /content_for_additional_checkout_buttons/);
  assert.match(cart, /name="note" data-cart-note/);
  assert.match(cart, /data-cart-note-status/);
  assert.match(drawer, /data-drawer-note/);
  assert.match(drawer, /data-cart-note-status/, 'drawer shows the same save status line');

  assert.match(js, /var SELECTOR = '\[data-cart-note\], \[data-drawer-note\]';/, 'one delegated module must cover page and drawer');
  assert.match(js, /\/cart\/update\.js/);
  assert.match(js, /keepalive: true/);
  assert.equal((js.match(/fetch\('\/cart\/update\.js'/g) || []).length, 1, 'only the serialized note writer may update the cart note');
  assert.match(js, /queue = queue\.then\(/, 'saves must be serialized');
  assert.match(js, /if \(my !== seq\) return;/, 'stale completions must not release the wallets');
  assert.match(js, /function walletBlocks\(\) \{[\s\S]*?document\.querySelectorAll\('\.additional-checkout-buttons'\)/, 'one unsaved cart note must block page and drawer wallets together');
  assert.doesNotMatch(js, /function walletBlocks\(field\)/, 'wallet blocking must not be scoped to only one cart form');
  assert.match(js, /var walletsLocked = false;/);
  assert.match(js, /new MutationObserver\(function \(\) \{[\s\S]*?if \(!walletsLocked\) return;[\s\S]*?syncWalletBlocks\(\);[\s\S]*?document\.documentElement, \{ childList: true, subtree: true \}/, 'Section Rendering must reapply the note lock to replacement wallet blocks');
  assert.match(js, /function connectedField\(source, preserveEdit\)[\s\S]*?document\.contains\(source\)[\s\S]*?replacementIsClean[\s\S]*?replacement\.value = source\.value;/, 'a drawer rerender must transfer an in-progress note without overwriting a newer edit');
  assert.match(js, /state\.field = connectedField\(state\.field, true\);/, 'the active note reference must follow Section Rendering replacements');
  assert.match(js, /function syncSavedFields\(source, value\) \{[\s\S]*?document\.querySelectorAll\(SELECTOR\)\.forEach/, 'a successful save must synchronize every cart-note surface');
  assert.match(js, /var wasClean = [^;]+field\.value === field\.dataset\.noteSaved;[\s\S]*?field\.dataset\.noteSaved = value;[\s\S]*?if \(field !== source && wasClean\) field\.value = value;/, 'clean copies should display the saved note without overwriting an in-progress edit');
  assert.match(js, /el\.setAttribute\('inert', ''\)/, 'wallets must be inert (keyboard too) while a save is in flight');
  assert.match(js, /e\.key === 'Enter' \|\| e\.key === ' '/, 'keydown fallback for browsers without inert');
  assert.match(js, /return null;[\s\S]*?if \(savedField\) settle\(savedField\);/, 'a failed save must stop, while success settles against the connected field');
  assert.doesNotMatch(js, /if \(field\.value !== field\.dataset\.noteSaved\) save\(field\)/, 'save completion must not recursively retry an unsaved value');
  for (const ev of ["'pointerdown'", "'touchstart'", "'focusin'", "'keydown'"]) {
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
