import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildProductDescriptionInput,
  productContentFingerprint,
  validateDescriptionBatch,
  validateProductDescriptionUpdate
} from '../../scripts/product-description-contracts.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const filesUnder = (relativePath) => {
  const absolutePath = join(ROOT, relativePath);
  return readdirSync(absolutePath).flatMap((entry) => {
    const child = join(absolutePath, entry);
    return statSync(child).isDirectory()
      ? filesUnder(join(relativePath, entry))
      : [child];
  });
};

const body = (opening, marker = 'distinct') => `
  <p>${opening} ${Array.from({ length: 42 }, (_, index) => `${marker}${index}`).join(' ')}.</p>
  <p>This second paragraph explains a verified choice and how it changes the finished item without adding an unsupported claim.</p>
  <h2>A specific first section</h2>
  <ul><li>Fact one</li><li>Fact two</li><li>Fact three</li><li>Fact four</li></ul>
  <p>This paragraph gives a practical review step tied to the selected product and its actual order fields.</p>
  <h2>A different decision point</h2>
  <p>This final paragraph tells the buyer what to check in the cart before checkout and keeps the wording concrete.</p>`;

const validUpdate = {
  handle: 'example-product',
  expectedUpdatedAt: '2026-08-24T00:00:00Z',
  expectedContentFingerprint: 'example',
  seoTitle: 'Specific Product Title for Search',
  seoDescription: 'A product-specific search description grounded in the real options, engraving layout, and decision a customer makes before ordering.',
  descriptionHtml: body('A product-specific opening identifies the exact reason this item is different')
};

test('product description contract limits mutations to body and SEO fields', () => {
  assert.deepEqual(buildProductDescriptionInput('gid://shopify/Product/1', validUpdate), {
    id: 'gid://shopify/Product/1',
    descriptionHtml: validUpdate.descriptionHtml,
    seo: { title: validUpdate.seoTitle, description: validUpdate.seoDescription }
  });
  assert.deepEqual(validateProductDescriptionUpdate(validUpdate).errors, []);
  assert.notEqual(
    productContentFingerprint({ descriptionHtml: validUpdate.descriptionHtml, seoTitle: validUpdate.seoTitle, seoDescription: 'Original description' }),
    productContentFingerprint(validUpdate)
  );
});

test('product description contract rejects editor debris and generic ecommerce filler', () => {
  const invalid = {
    ...validUpdate,
    descriptionHtml: `${body('Elevate your style with this must-have accessory')}<meta charset="utf-8">`
  };
  const errors = validateProductDescriptionUpdate(invalid).errors.join('; ');
  assert.match(errors, /editor or presentation markup/);
  assert.match(errors, /forbidden copy pattern/);
});

test('description batches reject repeated long sentences and overused structures', () => {
  const repeated = Array.from({ length: 4 }, (_, index) => ({
    ...validUpdate,
    handle: `product-${index}`,
    descriptionHtml: body(`Opening number ${index} describes a separate product accurately`, `batch${index}`)
  }));
  const errors = validateDescriptionBatch(repeated).join('; ');
  assert.match(errors, /repeats a long sentence/);
  assert.match(errors, /structural signature/);
});

test('wave-one manifest and preparation copy stay scoped and original', () => {
  const targets = JSON.parse(read('scripts/product-description-wave-one-targets.json')).products;
  const preparation = read('scripts/prepare-product-description-wave-one.mjs');
  const manager = read('scripts/manage-product-descriptions.mjs');

  assert.equal(targets.length, 12);
  assert.equal(new Set(targets).size, targets.length);
  assert.ok(targets.includes('leather-coordinate-bracelet'));
  assert.doesNotMatch(preparation, /elevate your|timeless elegance|look no further|must-have accessory|there is no better way/i);
  assert.match(manager, /Concurrent edit detected/);
  assert.match(manager, /Product content drift detected/);
  assert.match(manager, /Post-update product content mismatch/);
});

test('storefront copy does not promise photo proofs or expose editor placeholders', () => {
  const storefrontCopy = ['config', 'sections', 'templates']
    .flatMap(filesUnder)
    .filter((path) => /\.(json|liquid)$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  assert.doesNotMatch(storefrontCopy, /photo proof/i);
  assert.doesNotMatch(storefrontCopy, /(?:details|instructions|sizing|care)[^.]{0,40}go here/i);
});
