import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const section = readFileSync(new URL('../../sections/main-product.liquid', import.meta.url), 'utf8');
const asset = readFileSync(new URL('../../assets/global.js', import.meta.url), 'utf8');

test('product gallery keeps every current magnetic-bracelet image available to variant switching', () => {
  assert.match(section, /for image in product\.images limit: 24/);
  assert.match(section, /data-image-id="{{ image\.id }}"/);
  assert.match(asset, /v\.featured_image\.id/);
  assert.match(asset, /\[data-thumb\]\[data-image-id=/);
});
