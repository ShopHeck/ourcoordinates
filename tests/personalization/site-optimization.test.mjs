import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('cart drawer keeps checkout visible in a styled, accessible panel', () => {
  const section = read('sections/cart-drawer.liquid');
  const css = read('assets/site-optimizations.css');
  const js = read('assets/global.js');
  const header = read('sections/header.liquid');

  assert.match(section, /class="cart-drawer__body"/);
  assert.ok(section.indexOf('cart-drawer__body') < section.indexOf('cart-drawer__footer'));
  assert.match(css, /\.cart-drawer\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.cart-drawer__body\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.cart-drawer__footer\s*\{[^}]*flex-shrink:\s*0/s);
  assert.match(css, /\.cart-drawer__checkout/);
  assert.match(js, /data-cart-label/);
  assert.match(js, /Cart,.*item/);
  assert.match(header, /data-cart-label/);
  assert.doesNotMatch(header, /aria-label="Cart"/);
});

test('gift finder choices and results use the branded responsive card system', () => {
  const section = read('sections/gift-finder.liquid');
  const css = read('assets/site-optimizations.css');

  assert.match(section, /data-gift-results[^>]*aria-live="polite"/);
  assert.match(css, /\.gift-finder__choices\s*\{/);
  assert.match(css, /\.gift-finder__choices label\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.gift-finder__choices input:checked\s*\+\s*span/);
  assert.match(css, /\.gift-finder__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3/s);
  assert.match(css, /\.gift-result__media\s*\{[^}]*aspect-ratio:\s*1/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.gift-finder__grid/);
});

test('mobile PDP shows the product decision before a compact scrollable gallery', () => {
  const section = read('sections/main-product.liquid');
  const css = read('assets/site-optimizations.css');

  assert.match(section, /class="pdp__summary"/);
  assert.ok(section.indexOf('class="pdp__summary"') < section.indexOf('class="pdp__gallery"'));
  assert.match(css, /\.pdp__summary\s*\{[^}]*grid-column:\s*2/s);
  assert.match(css, /@media\s*\(max-width:\s*880px\)[\s\S]*\.pdp__thumbs\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(section, /product\.metafields\.judgeme\.widget/);
  assert.match(css, /\.jdgm-prev-badge__text/);
});

test('above-fold collection cards receive explicit responsive loading priority', () => {
  const card = read('snippets/product-card.liquid');
  const collection = read('sections/main-collection.liquid');

  assert.match(card, /image_loading \| default: 'lazy'/);
  assert.match(card, /width: 320/);
  assert.match(card, /width: 480/);
  assert.match(card, /fetchpriority="{{ resolved_image_priority }}"/);
  assert.match(collection, /rendered_products <= 2/);
  assert.match(collection, /image_loading: card_loading/);
  assert.match(collection, /image_fetchpriority: card_priority/);
});

test('homepage hero has an accurate responsive mobile fallback', () => {
  const hero = read('sections/atelier-hero.liquid');

  assert.equal(existsSync(join(ROOT, 'assets/hero-necklace-mobile.jpg')), true);
  assert.match(hero, /<picture>/);
  assert.match(hero, /hero-necklace-mobile\.jpg/);
  assert.match(hero, /width="1200" height="638"/);
  assert.doesNotMatch(hero, /width="2048" height="1088"/);
});

test('SEO social metadata and duplicate builder signals are complete', () => {
  const layout = read('layout/theme.liquid');

  for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
    assert.ok(layout.includes(property), `missing ${property}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    assert.ok(layout.includes(name), `missing ${name}`);
  }
  assert.match(layout, /page\.handle == 'build-yours'/);
  assert.match(layout, /pages\/builder/);
  assert.match(layout, /noindex,follow/);
  assert.match(layout, /social_image_url \| prepend: shop\.url/);
  for (const handle of ['coordinates-sets', 'in-stock', 'christmas', 'how-it-works', 'memory-map', 'ring-size-chart']) {
    assert.ok(layout.includes(handle), `missing description fallback for ${handle}`);
  }
});

test('confirmed global contrast overrides meet the audited targets', () => {
  const css = read('assets/site-optimizations.css');
  const stories = read('sections/atelier-customer-stories.liquid');

  assert.match(css, /\.site-footer__bottom\s*\{[^}]*color:\s*rgba\(255,255,255,\.7\)/s);
  assert.match(stories, /color_modify: 'alpha', 0\.72/);
});
