import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('collection pages lead with products and keep one canonical editorial block', () => {
  const main = read('sections/main-collection.liquid');
  const editorial = read('sections/oc-collection-copy.liquid');
  const schema = read('snippets/viktor-seo-schema.liquid');

  assert.match(main, /<section class="section collection-page">/);
  assert.ok(main.indexOf('class="product-grid"') < main.indexOf('class="collection-description"'));
  assert.doesNotMatch(main.slice(0, main.indexOf('class="collection-controls"')), /collection\.description/);
  assert.match(main, /unless collection_has_seo_copy/);
  assert.match(main, /paginate\.current_page == 1 and active_filter_count == 0 and collection\.sort_by == blank and current_tags == blank/);
  assert.match(editorial, /if oc_seo != blank and current_page == 1 and oc_active_filter_count == 0 and collection\.sort_by == blank and current_tags == blank/);
  assert.equal((editorial.match(/"@type": "CollectionPage"/g) || []).length, 1);
  assert.doesNotMatch(schema, /"@type":"ItemList"/);
});

test('collection header spacing is compact in critical and full CSS', () => {
  for (const path of ['snippets/critical-css.liquid', 'assets/ep.css']) {
    const css = read(path);
    assert.match(css, /\.collection-page\s*\{[^}]*padding-block:\s*clamp\(28px,\s*5vw,\s*64px\)/s);
    assert.match(css, /\.collection-page \.collection-head\s*\{[^}]*margin-bottom:\s*clamp\(18px,\s*3vw,\s*26px\)/s);
    assert.match(css, /\.collection-description\s*\{[^}]*border-top:\s*1px solid var\(--c-line\)/s);
  }
});

test('new collection editorial strings are localized', () => {
  const locale = JSON.parse(read('locales/en.default.json'));

  assert.equal(locale.collections.general.about_collection, 'About {{ title }}');
  assert.match(locale.collections.general.all_products_intro, /engraved coordinates jewelry/);
});

test('empty collections are kept out of search while preserving customer recovery', () => {
  const layout = read('layout/theme.liquid');
  const main = read('sections/main-collection.liquid');

  const emptyCollectionBranch = layout.slice(layout.indexOf("request.page_type == 'collection' and collection.products_count == 0"));
  assert.match(emptyCollectionBranch.slice(0, 180), /assign seo_noindex = true/);
  assert.match(main, /collection\.products_count == 0[\s\S]*routes\.all_products_collection_url/);
});
