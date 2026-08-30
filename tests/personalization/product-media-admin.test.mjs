import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST_PATH = resolve(ROOT, 'scripts/product-media-improvements.json');
const SCRIPT_PATH = resolve(ROOT, 'scripts/manage-product-media.mjs');

test('product-media improvement manifest is append-only, exact, and locally complete', () => {
  assert.equal(existsSync(MANIFEST_PATH), true);
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  assert.equal(manifest.mode, 'append-only');
  assert.equal(manifest.products.length, 4);

  const handles = manifest.products.map((product) => product.handle);
  assert.equal(new Set(handles).size, handles.length);

  const altTexts = manifest.products.flatMap((product) => product.media.map((media) => media.alt));
  assert.equal(new Set(altTexts).size, altTexts.length);

  for (const product of manifest.products) {
    assert.match(product.expectedProductId, /^gid:\/\/shopify\/Product\/\d+$/);
    assert.equal(product.expectedStatus, 'ACTIVE');
    assert.ok(product.media.length >= 1);
    for (const media of product.media) {
      assert.match(media.filename, /-v2\.webp$/);
      assert.ok(media.alt.length >= 20 && media.alt.length <= 125);
      const path = resolve(ROOT, manifest.assetRoot, media.filename);
      assert.equal(existsSync(path), true, `missing ${path}`);
      const size = statSync(path).size;
      assert.ok(size >= 70_000 && size <= 250_000, `${media.filename} is ${size} bytes`);
    }
  }
});

test('product-media tool cannot delete or reorder existing media', () => {
  assert.equal(existsSync(SCRIPT_PATH), true);
  const script = readFileSync(SCRIPT_PATH, 'utf8');
  assert.match(script, /stagedUploadsCreate/);
  assert.match(script, /productUpdate\(product: \$product, media: \$media\)/);
  assert.match(script, /--apply-additional/);
  assert.doesNotMatch(script, /productDeleteMedia|productReorderMedia|fileDelete|productSet/);
});
