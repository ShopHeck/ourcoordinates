import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const sha256 = (path) => createHash('sha256').update(read(path)).digest('hex');
const manifest = json('scripts/personalization/product-contracts.json');
const byHandle = new Map(manifest.products.map((item) => [item.handle, item]));

test('manifest has one unique, versioned contract per approved handle', () => {
  assert.equal(manifest.release, 'oc-order-safe-2026-07-13-2');
  assert.equal(manifest.products.length, 10);
  assert.equal(byHandle.size, manifest.products.length);
  for (const item of manifest.products) {
    assert.match(item.handle, /^[a-z0-9-]+$/);
    assert.match(item.templateSuffix, /^[a-z0-9-]+$/);
    assert.ok(Array.isArray(item.properties));
    assert.equal(typeof item.mutable, 'boolean');
    assert.equal(typeof item.javascript, 'boolean');
  }
});

test('non-custom services collect no properties', () => {
  for (const handle of ['premium-gift-packaging', 'routeins']) {
    assert.deepEqual(byHandle.get(handle).properties, []);
    assert.equal(byHandle.get(handle).templateSuffix, 'non-custom');
  }
  const template = json('templates/product.non-custom.json');
  assert.equal(template.sections.main.settings.show_engraving, false);
});

test('four-sided source remains byte-for-byte unchanged', () => {
  assert.equal(
    sha256('templates/product.four-sided.json'),
    'a94096c080f0c78b75d894b73e12922fd5488af853130f775b47b7c3930dee74'
  );
  assert.equal(
    sha256('snippets/pdp-preview-four-sided.liquid'),
    'c1f30f2a7e1aaa0eaa566c1caae248169931aaff4d04cd217985e506a66f0527'
  );
  assert.equal(byHandle.get('custom-bar-necklace').mutable, false);
});

test('main product renders the release and effective contract markers', () => {
  const section = read('sections/main-product.liquid');
  assert.match(section, /oc-order-safe-2026-07-13-2/);
  assert.match(section, /data-personalization-release=/);
  assert.match(section, /data-personalization-contract=/);
});

function assertTemplateContract(handle, snippetPath) {
  const item = byHandle.get(handle);
  const template = json(`templates/product.${item.templateSuffix}.json`);
  const snippet = read(snippetPath);
  const section = read('sections/main-product.liquid');
  assert.equal(template.sections.main.settings.preview_type, item.contract);
  assert.equal(template.sections.main.settings.show_engraving, item.contract !== 'none');
  if (item.contract === 'charm-name-necklace') {
    assert.deepEqual(item.properties, Array.from({ length: 8 }, (_, index) => `Name ${index + 1}`));
    assert.match(snippet, /for index in \(1\.\.8\)/);
    assert.ok(snippet.includes('name="properties[Name {{ index }}]"'));
  } else {
    for (const property of item.properties) {
      assert.ok(snippet.includes(`name="properties[${property}]"`), `${handle} missing ${property}`);
    }
  }
  assert.ok(section.includes(`preview_type == '${item.contract}'`));
}

test('heart necklace has one front engraving and no side controls', () => {
  assertTemplateContract(
    'personalized-heart-pendant-necklace',
    'snippets/pdp-preview-heart-necklace.liquid'
  );
  const snippet = read('snippets/pdp-preview-heart-necklace.liquid');
  assert.doesNotMatch(snippet, /Back|Left side|Right side|side-count/);
});

test('matching necklaces submit explicit A and B properties', () => {
  assertTemplateContract(
    'matching-coordinates-necklaces',
    'snippets/pdp-preview-matching-necklaces.liquid'
  );
  const section = read('sections/main-product.liquid');
  assert.match(section, /personalization-dynamic\.js/);
  assert.match(section, /matching-necklaces/);
});

test('couple rings expose two engravings and two fulfillment styles', () => {
  assertTemplateContract('personalized-couple-rings', 'snippets/pdp-preview-couple-rings.liquid');
});

test('charm necklace exposes every potential paid Name property', () => {
  assertTemplateContract(
    'chain-link-necklace-custom-charms',
    'snippets/pdp-preview-charm-name-necklace.liquid'
  );
});

test('birthstone ring collects exactly two required names without a preview', () => {
  assertTemplateContract('custom-birthstone-rings', 'snippets/pdp-preview-birthstone-ring.liquid');
  const item = byHandle.get('custom-birthstone-rings');
  const snippet = read('snippets/pdp-preview-birthstone-ring.liquid');
  const inputs = [...snippet.matchAll(/<input\b[^>]*name="properties\[([^\]]+)\]"[^>]*>/g)];

  assert.deepEqual(item.properties, ['Name 1', 'Name 2']);
  assert.deepEqual(inputs.map((match) => match[1]), ['Name 1', 'Name 2']);
  for (const [tag] of inputs) {
    assert.match(tag, /type="text"/);
    assert.match(tag, /\brequired\b/);
  }
  assert.ok(snippet.indexOf('Name 1:</label>') < snippet.indexOf('Name 2:</label>'));
  assert.doesNotMatch(
    snippet,
    /<svg|Birth Month|properties\[Engraving\]|type="radio"|data-engrave-preview|data-engrave-input|data-engrave-count/
  );
  assert.equal(item.javascript, false);
});

test('horizontal nameplate has one required Name property', () => {
  assertTemplateContract('personalized-nameplate-necklace', 'snippets/pdp-preview-nameplate.liquid');
});

test('vertical nameplate has one required Name property', () => {
  assertTemplateContract('vertical-name-necklace', 'snippets/pdp-preview-vertical-name.liquid');
});

test('every mutable personalized contract has a matching template, snippet, and exact properties', () => {
  const snippetByContract = {
    'heart-necklace': 'snippets/pdp-preview-heart-necklace.liquid',
    'matching-necklaces': 'snippets/pdp-preview-matching-necklaces.liquid',
    'couple-rings': 'snippets/pdp-preview-couple-rings.liquid',
    'charm-name-necklace': 'snippets/pdp-preview-charm-name-necklace.liquid',
    'birthstone-ring': 'snippets/pdp-preview-birthstone-ring.liquid',
    'nameplate': 'snippets/pdp-preview-nameplate.liquid',
    'vertical-name': 'snippets/pdp-preview-vertical-name.liquid'
  };
  for (const item of manifest.products.filter((entry) => entry.mutable && entry.contract !== 'none')) {
    assertTemplateContract(item.handle, snippetByContract[item.contract]);
  }
});

test('dynamic JavaScript stays dependency-free, scoped, and within budget', () => {
  const asset = read('assets/personalization-dynamic.js');
  assert.ok(Buffer.byteLength(asset) <= 16384);
  assert.doesNotMatch(asset, /\binnerHTML\b/);
  assert.doesNotMatch(asset, /\b(jQuery|React|Vue|Angular)\b/);
  const section = read('sections/main-product.liquid');
  const include = section.match(
    /\{%- if preview_type == 'matching-necklaces' or preview_type == 'couple-rings' or preview_type == 'charm-name-necklace' -%\}[\s\S]*?personalization-dynamic\.js[\s\S]*?\{%- endif -%\}/
  );
  assert.ok(include, 'dynamic asset include is not the approved allowlist');
  for (const contract of ['heart-necklace', 'birthstone-ring', 'nameplate', 'vertical-name']) {
    assert.doesNotMatch(include[0], new RegExp(contract));
    const entry = manifest.products.find((item) => item.contract === contract);
    assert.equal(entry.javascript, false);
  }
});

test('new product-scoped CSS remains below the per-page budget', () => {
  const snippets = [
    'snippets/pdp-preview-heart-necklace.liquid',
    'snippets/pdp-preview-matching-necklaces.liquid',
    'snippets/pdp-preview-couple-rings.liquid',
    'snippets/pdp-preview-charm-name-necklace.liquid',
    'snippets/pdp-preview-birthstone-ring.liquid',
    'snippets/pdp-preview-nameplate.liquid',
    'snippets/pdp-preview-vertical-name.liquid'
  ];
  for (const path of snippets) assert.ok(Buffer.byteLength(read(path)) <= 8192, `${path} exceeds 8 KB`);
});
