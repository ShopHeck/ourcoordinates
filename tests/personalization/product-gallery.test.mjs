import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const section = readFileSync(new URL('../../sections/main-product.liquid', import.meta.url), 'utf8');
const asset = readFileSync(new URL('../../assets/global.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../assets/site-optimizations.css', import.meta.url), 'utf8');

test('product gallery keeps every current magnetic-bracelet image available to variant switching', () => {
  assert.match(section, /for image in product\.images limit: 24/);
  assert.match(section, /data-image-id="{{ image\.id }}"/);
  assert.match(asset, /v\.featured_image\.id/);
  assert.match(asset, /\[data-thumb\]\[data-image-id=/);
});

test('mobile gallery starts with five choices and can reveal every retained image', () => {
  assert.match(section, /data-gallery-thumbs/);
  assert.match(section, /data-gallery-toggle/);
  assert.match(section, /if gallery_count > 5/);
  assert.match(section, /aria-controls="ProductGalleryThumbs-\{\{ section\.id \}\}"/);
  assert.match(asset, /setGalleryExpanded/);
  assert.match(asset, /galleryToggle\.setAttribute\('aria-expanded'/);
  assert.match(asset, /updateVariant\(true\)/);
  assert.match(css, /\.pdp__gallery-toggle\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*880px\)[\s\S]*\.pdp__thumbs:not\(\.is-expanded\) button:nth-child\(n \+ 6\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
});
