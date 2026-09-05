import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = (file) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const template = (file) => JSON.parse(read(file).replace(/^\/\*[\s\S]*?\*\//, ''));

function giftResults(budget, prices) {
  const script = read('sections/gift-finder.liquid').match(/<script>([\s\S]*?)<\/script>/)[1];
  const handlers = {};
  const cards = prices.map((price, index) => ({
    dataset: { price: String(price), audiences: 'partner', occasions: 'couple', budget: '40-75' },
    cloneNode() { return { price, index }; }
  }));
  const grid = { children: [], replaceChildren() { this.children = []; }, appendChild(card) { this.children.push(card); } };
  const summary = { textContent: '' };
  const results = { dataset: { summary: '[recipient] / [occasion] / [budget]', empty: 'No matches' }, focus() {}, scrollIntoView() {} };
  const form = {
    reportValidity: () => true,
    addEventListener: (name, handler) => { handlers[name] = handler; },
    querySelector: () => ({ value: budget, nextElementSibling: { textContent: budget } })
  };
  const root = {
    querySelectorAll: () => cards,
    querySelector: (selector) => ({
      '[data-gift-finder-form]': form, '[data-gift-results]': results,
      '[data-gift-grid]': grid, '[data-gift-summary]': summary,
      '[data-gift-restart]': { addEventListener() {} },
      '[data-gift-browse]': { hidden: true }
    })[selector]
  };
  vm.runInNewContext(script, {
    document: { querySelector: () => root },
    FormData: class { get(name) { return { budget, recipient: 'partner', occasion: 'couple' }[name]; } },
    window: { matchMedia: () => ({ matches: true }) }
  });
  handlers.submit({ preventDefault() {} });
  return { prices: grid.children.map((card) => card.price), summary: summary.textContent };
}

test('gift finder never fills a budget result with an over-budget product', () => {
  assert.deepEqual(giftResults('40-75', [4700, 4700, 7800]).prices, [4700, 4700]);
  assert.deepEqual(giftResults('under-40', [3999, 4000, 7800]).prices, [3999]);
  assert.deepEqual(giftResults('40-75', [3999, 4000, 7500, 7501]).prices, [4000, 7500]);
  assert.deepEqual(giftResults('75-plus', [7499, 7500, 7800]).prices, [7500, 7800]);
});

test('gift finder fails closed on missing prices and handles no matching products', () => {
  assert.deepEqual(giftResults('40-75', ['', 'NaN', 7800]).prices, []);
  assert.equal(giftResults('40-75', [7800]).summary, 'No matches');
  assert.deepEqual(giftResults('unknown', [4700]).prices, []);
});

test('gift finder uses the cheapest available variant for price and destination', () => {
  const source = read('sections/gift-finder.liquid');
  assert.match(source, /item\.variants \| where: 'available', true \| sort: 'price'/);
  assert.match(source, /data-price="{{ gift_variant.price }}"/);
  assert.match(source, /href="{{ item.url }}\?variant={{ gift_variant.id }}"/);
  assert.doesNotMatch(source, /card\.dataset\.budget/);
  assert.match(source, /<noscript>/);
  assert.match(source, /4000 \| money_with_currency \| strip_html/);
  assert.match(source, /7500 \| money_with_currency \| strip_html/);
});

test('homepage puts featured products directly after a compact, accurately labeled hero', () => {
  const home = template('templates/index.json');
  const hero = home.sections[home.order[0]].settings;
  assert.equal(home.order[1], 'featured');
  assert.equal(home.sections.featured.settings.compact, true);
  assert.equal(hero.show_etching, true);
  assert.equal(hero.etch_caption, '');
  assert.equal(hero.cta1_link, 'shopify://collections/best-sellers');
  assert.equal(hero.cta1_label, 'Shop best sellers');
  assert.equal(hero.cta2_link, 'shopify://pages/gift-finder');
  assert.equal(hero.cta2_label, 'Find a gift');
  assert.doesNotMatch(hero.subline, /photograph|approval|proof/i);
});

test('related-product promotion follows purchase and does not pretend a single product is a set', () => {
  const product = read('sections/main-product.liquid');
  assert.ok(product.indexOf('class="set-upsell"') > product.indexOf('{%- endform -%}'));
  assert.doesNotMatch(product, /View set →/);
  assert.match(product, /products\.product\.view_product/);
});

test('sticky action keeps incomplete personalization out of the cart submission path', () => {
  const context = {};
  const source = read('assets/global.js');
  vm.runInNewContext(source.slice(0, source.indexOf('(function ()')), context);
  const pending = context.productPersonalizationPending;
  assert.equal(typeof pending, 'function');
  const form = (fields, dataset = {}) => ({ dataset, querySelectorAll: () => fields, querySelector: () => null });
  assert.equal(pending(form([{ type: 'text', value: '  ', validity: { valid: true } }])), true);
  assert.equal(pending(form([{ type: 'text', value: 'Paris', validity: { valid: true } }])), false);
  assert.equal(pending(form([{ type: 'text', value: '', disabled: true }])), false);
  assert.equal(pending(form([], { expressBlocked: 'Every piece needs engraving' })), true);
  assert.equal(pending(form([{ type: 'radio', name: 'size' }])), true);
  assert.equal(pending(form([])), false);
});

test('a single-variant product without option radios remains purchasable', () => {
  const source = read('assets/global.js');
  const fn = source.slice(source.indexOf('function matchVariant()'), source.indexOf('function money(cents)'));
  const variant = { id: 123, available: true, options: ['Default Title'] };
  const context = { product: { variants: [variant] }, currentOptions: () => [] };
  vm.runInNewContext(fn, context);
  assert.equal(context.matchVariant(), variant);
  context.product = { variants: [variant, { ...variant, id: 456 }] };
  assert.equal(context.matchVariant(), undefined);
});

test('narrow header keeps search and cart within a shrinking center column', () => {
  for (const file of ['snippets/critical-css.liquid', 'assets/site-optimizations.css']) {
    const source = read(file).replace(/\s+/g, '');
    assert.match(source, /@media\(max-width:380px\)/);
    assert.match(source, /grid-template-columns:autominmax\(0,1fr\)auto;gap:8px/);
    assert.match(source, /\.site-header__actionsa\{min-width:44px;padding-inline:0;font-size:12px/);
  }
});

test('help and product delivery copy share confirmed facts without overriding the in-stock exception', () => {
  const locale = JSON.parse(read('locales/en.default.json'));
  assert.match(locale.delivery.production, /5 business days/);
  assert.match(locale.delivery.production, /12 PM Eastern Time/);
  assert.match(locale.delivery.transit, /7–10 business days/);
  assert.match(locale.delivery.rates, /5\.99/);
  assert.match(locale.delivery.rates, /over US\$50/);
  assert.match(locale.delivery.proof, /not yet a standard/);
  assert.match(read('snippets/delivery-details.liquid'), /unless same_day_shipping/);
  assert.match(read('sections/main-page.liquid'), /page.handle == 'shipping' or page.handle == 'faqs'/);
  assert.match(read('sections/oc-collection-copy.liquid'), /collections.best_sellers.copy_html/);
  assert.match(read('sections/oc-collection-copy.liquid'), /collections.best_sellers.shipping_html/);
  const checkTranslations = (node) => Object.values(node).forEach(value => {
    if (typeof value === 'string') assert.ok(value.length <= 1000, 'Shopify translation values cannot exceed 1000 characters');
    else checkTranslations(value);
  });
  checkTranslations(locale);
});
