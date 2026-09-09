import { parseShopifyJson } from '../../scripts/shopify-json.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { APPROVED_HANDLES, assertVersion, descriptionHash, updateInput, unchangedFields, validateApprovedPlan } from '../../scripts/apply-delivery-copy-plan.mjs';
import { prepareDeliveryCopyPlan, outdatedDelivery } from '../../scripts/prepare-delivery-copy-plan.mjs';
const { delivery } = parseShopifyJson(readFileSync(new URL('../../locales/en.default.json', import.meta.url), 'utf8'));
const source = { products: APPROVED_HANDLES.map((handle, i) => ({ id: `gid://shopify/Product/${i}`, handle, status: 'ACTIVE', updatedAt: '2026-09-05', descriptionHtml: outdatedDelivery })) };

test('description-only apply whitelists mutation fields and detects concurrency', () => {
  const plan = prepareDeliveryCopyPlan(source, delivery);
  validateApprovedPlan(plan, source, delivery);
  const change = plan.changes[0];
  assert.deepEqual(Object.keys(updateInput({ ...change, price: 1, seo: {} })), ['id', 'descriptionHtml']);
  assertVersion(source.products[0], change);
  assert.throws(() => assertVersion({ ...source.products[0], updatedAt: 'later' }, change), /Concurrent edit/);
  assert.throws(() => assertVersion({ ...source.products[0], descriptionHtml: 'new' }, change), /Description drift/);
  assert.equal(descriptionHash(outdatedDelivery), change.expectedDescriptionSha256);
  assert.deepEqual(unchangedFields({ id: '1', descriptionHtml: 'x', updatedAt: 'y', seo: {} }), { id: '1', seo: {} });
});

test('apply rejects changed wording, extra products and missing products', () => {
  const plan = prepareDeliveryCopyPlan(source, delivery);
  const modified = structuredClone(plan);
  modified.changes[0].descriptionHtml += '<p>Unapproved</p>';
  assert.throws(() => validateApprovedPlan(modified, source, delivery));
  assert.throws(() => validateApprovedPlan({ ...plan, changes: plan.changes.slice(1) }, source, delivery));
  assert.throws(() => validateApprovedPlan({ ...plan, changes: [...plan.changes, plan.changes[0]] }, source, delivery));
});
