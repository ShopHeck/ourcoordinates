import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('contact handle renders the purpose-built support page without a template assignment', () => {
  const page = read('sections/main-page.liquid');

  assert.match(page, /page\.handle == 'contact'/);
  assert.match(page, /render 'contact-us-page'/);
});

test('contact page keeps Shopify-native form behavior and accessible support fields', () => {
  const contact = read('snippets/contact-us-page.liquid');

  assert.match(contact, /form 'contact'/);
  assert.match(contact, /form\.posted_successfully\?/);
  assert.match(contact, /form\.errors \| default_errors/);
  for (const field of ['contact[name]', 'contact[email]', 'contact[order_number]', 'contact[topic]', 'contact[body]']) {
    assert.ok(contact.includes(`name="${field}"`), `missing contact field: ${field}`);
  }
  assert.match(contact, /aria-invalid="true"/);
  assert.match(contact, /role="status"/);
  assert.match(contact, /role="alert"/);
  assert.doesNotMatch(contact, /returns address/i);
  assert.doesNotMatch(contact, /immediate response/i);
});

test('contact page is responsive, reduced-motion safe, and has scoped SEO', () => {
  const css = read('assets/contact-page.css');
  const contact = read('snippets/contact-us-page.liquid');
  const layout = read('layout/theme.liquid');

  assert.match(contact, /class: 'contact-page__form'/);
  assert.doesNotMatch(css, /^\.contact-form\s*\{/m);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus/);
  assert.match(layout, /page\.handle == 'contact'[\s\S]*Contact OurCoordinates \| Order & Personalization Help/);
});
