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

test('empty carts offer direct best-seller and guided gift recovery paths', () => {
  const drawer = read('sections/cart-drawer.liquid');
  const cart = read('sections/main-cart.liquid');
  const css = read('assets/site-optimizations.css');

  for (const section of [drawer, cart]) {
    assert.match(section, /best-sellers/);
    assert.match(section, /gift-finder/);
  }
  assert.match(drawer, /if empty_primary_link == blank/);
  assert.match(drawer, /if empty_secondary_link == blank/);
  assert.match(cart, /class="cart-empty__actions"/);
  assert.match(cart, /aria-label="Shopping benefits"/);
  assert.match(css, /\.cart-empty\s*\{/);
  assert.match(css, /\.cart-drawer__empty-reassurance\s*\{/);
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

test('mobile PDP shows the product decision before a compact expandable gallery', () => {
  const section = read('sections/main-product.liquid');
  const css = read('assets/site-optimizations.css');

  assert.match(section, /class="pdp__summary"/);
  assert.ok(section.indexOf('class="pdp__summary"') < section.indexOf('class="pdp__gallery"'));
  assert.match(css, /\.pdp__summary\s*\{[^}]*grid-column:\s*2/s);
  assert.match(css, /@media\s*\(max-width:\s*880px\)[\s\S]*\.pdp__thumbs\s*\{[^}]*repeat\(5/s);
  assert.match(css, /\.pdp__thumbs:not\(\.is-expanded\)/);
  assert.match(section, /data-gallery-toggle/);
  assert.match(section, /product\.metafields\.judgeme\.widget/);
  assert.match(css, /\.jdgm-prev-badge__text/);
});

test('PDP renders one Judge.me review widget root', () => {
  const section = read('sections/main-product.liquid');
  const css = read('assets/site-optimizations.css');

  assert.match(
    section,
    /<div id="judgeme_product_reviews"\s+class="jdgm-widget jdgm-review-widget"[^>]*data-auto-install="false"[^>]*>/
  );
  assert.doesNotMatch(
    section,
    /id="judgeme_product_reviews"[^>]*>\s*<div class="jdgm-widget jdgm-review-widget"/
  );
  assert.match(
    section,
    /<section class="page-width pdp-reviews" id="reviews" aria-labelledby="product-reviews-title">/
  );
  assert.match(section, /class="pdp-reviews__header"/);
  assert.doesNotMatch(section, /<div id="reviews">/);
  assert.match(css, /\.pdp-reviews\s*\{[^}]*border-top:[^;}]*var\(--c-line\)/s);
  assert.match(css, /\.pdp-reviews__header\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.pdp-reviews__header/);
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
  const llms = read('templates/llms.txt.liquid');
  const llmsFull = read('templates/llms-full.txt.liquid');

  for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
    assert.ok(layout.includes(property), `missing ${property}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    assert.ok(layout.includes(name), `missing ${name}`);
  }
  assert.match(layout, /page\.handle == 'build-yours'/);
  assert.match(layout, /pages\/builder/);
  assert.match(layout, /noindex,follow/);
  assert.doesNotMatch(llms, /https:\/\/ourcoordinates\.com\/pages\/build-yours/);
  assert.doesNotMatch(llmsFull, /https:\/\/ourcoordinates\.com\/pages\/build-yours/);
  assert.match(llms, /https:\/\/ourcoordinates\.com\/pages\/builder/);
  assert.match(layout, /social_image_prefix = social_image_url \| slice: 0, 2/);
  assert.match(layout, /social_image_prefix == '\/\/'/);
  assert.match(layout, /social_image_url \| prepend: 'https:'/);
  assert.match(layout, /social_image_url = shop\.url \| append: social_image_url/);
  for (const handle of ['coordinates-sets', 'in-stock', 'christmas', 'how-it-works', 'memory-map', 'ring-size-chart']) {
    assert.ok(layout.includes(handle), `missing description fallback for ${handle}`);
  }
});

test('secondary page and collection SEO cleanup is handle-scoped', () => {
  const layout = read('layout/theme.liquid');
  const page = read('sections/main-page.liquid');

  for (const handle of [
    'shipping',
    'jewelry-cleaning-care-guide',
    'about-michael-heckert-founder-creator',
    'gdpr-compliance',
    'appi-compliance',
    'ccpa-compliance',
    'ccpa-opt-out',
    'gift-finder',
    'forever-bracelets',
    'mens',
    'gold-jewelry',
    'shop-couples-necklaces',
    'mens-rings',
    'fathers-day-gifts',
    'coordinates-bracelets'
  ]) {
    assert.ok(layout.includes(handle), `missing SEO cleanup for ${handle}`);
  }

  for (const privacyHandle of ['gdpr-compliance', 'appi-compliance', 'ccpa-compliance', 'ccpa-opt-out']) {
    const branch = layout.slice(layout.indexOf(`page.handle == '${privacyHandle}'`));
    assert.match(branch.slice(0, 700), /assign seo_noindex = true/);
  }

  assert.match(
    page,
    /unless page\.handle == 'about-michael-heckert-founder-creator'[\s\S]*<h1>\{\{ page\.title \}\}<\/h1>/
  );
});

test('product and article SEO titles render without an automatically appended store name', () => {
  const layout = read('layout/theme.liquid');
  const titleMarkup = layout.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';

  assert.match(
    titleMarkup,
    /unless request\.page_type == 'product' or request\.page_type == 'article'[\s\S]*unless seo_title contains shop\.name[\s\S]*endunless[\s\S]*endunless/
  );
  assert.ok(titleMarkup.indexOf("request.page_type == 'product'") < titleMarkup.indexOf('seo_title contains shop.name'));
  assert.match(layout, /request\.page_type == 'article'[\s\S]*if seo_title == blank[\s\S]*assign seo_title = article\.title[\s\S]*if seo_description == blank[\s\S]*article\.excerpt_or_content[\s\S]*seo_description_length > 165[\s\S]*seo_description \| truncate: 155/);
});

test('articles keep one H1 and provide accessible shopping and related-reading paths', () => {
  const section = read('sections/main-article.liquid');
  const card = read('snippets/article-related-card.liquid');
  const css = read('assets/article.css');
  const layout = read('layout/theme.liquid');
  const audit = read('scripts/audit-blog-content.mjs');

  assert.match(section, /article\.content[\s\S]*replace: '<h1', '<h2'[\s\S]*replace: '<H1', '<H2'/);
  assert.equal((section.match(/<h1>/g) || []).length, 1);
  assert.match(section, /article_had_embedded_h1[\s\S]*article-page__content--normalized-h1/);
  assert.match(section, /article-audit-content:start[\s\S]*data-article-content[\s\S]*article-audit-content:end/);
  assert.match(section, /aria-labelledby="article-shop-path-title"/);
  assert.match(section, /routes\.all_products_collection_url/);
  assert.match(section, /pages\['gift-finder'\]/);
  assert.match(section, /for candidate in blog\.articles[\s\S]*candidate\.tags contains article_tag/);
  assert.match(section, /aria-labelledby="article-next-title"/);
  assert.match(card, /loading="lazy"/);
  assert.match(card, /related_article\.image\.alt \| default: related_article\.title/);
  assert.match(layout, /request\.page_type == 'article'[\s\S]*'article\.css' \| asset_url \| stylesheet_tag: preload: true/);
  assert.match(css, /\.article-related__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3/s);
  assert.match(css, /\.article-page__content--normalized-h1 h2:first-of-type[\s\S]*display:\s*none/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.article-related__grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.article-related-card__media\s*\{[^}]*aspect-ratio:\s*auto/s);
  assert.match(audit, /article-audit-content:start/);
  assert.match(audit, /cleanText\(articleBodyHtml\)/);
});

test('About Us tells the family origin story without promising a photo proof', () => {
  const page = read('sections/main-page.liquid');
  const about = read('snippets/about-us-page.liquid');
  const css = read('assets/about-us.css');
  const layout = read('layout/theme.liquid');

  assert.match(page, /page\.handle == 'about-us'/);
  assert.match(page, /render 'about-us-page'/);
  for (const phrase of ['family-owned', 'online-only', 'COVID', 'Santorini']) {
    assert.ok(about.includes(phrase), `missing About Us story detail: ${phrase}`);
  }
  assert.doesNotMatch(about, /photo proof/i);
  assert.match(about, /"@type": "AboutPage"/);
  assert.match(about, /loading="eager"[\s\S]*fetchpriority="high"/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(layout, /page\.handle == 'about-us'/);
  assert.match(layout, /About OurCoordinates \| Family-Owned Coordinates Jewelry/);
  for (const llms of [read('templates/llms.txt.liquid'), read('templates/llms-full.txt.liquid')]) {
    assert.match(llms, /online jewelry business inspired by Santorini and started during COVID/);
  }
});

test('confirmed global contrast overrides meet the audited targets', () => {
  const css = read('assets/site-optimizations.css');
  const stories = read('sections/atelier-customer-stories.liquid');

  assert.match(css, /\.site-footer__bottom\s*\{[^}]*color:\s*rgba\(255,255,255,\.7\)/s);
  assert.match(stories, /color_modify: 'alpha', 0\.72/);
});
