import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { prepareDeliveryCopyPlan, outdatedDelivery, outdatedProof } from '../../scripts/prepare-delivery-copy-plan.mjs';
const { delivery } = JSON.parse(readFileSync(new URL('../../locales/en.default.json', import.meta.url), 'utf8'));
const product = (descriptionHtml, handle = 'coordinates-bracelet') => ({ id: 'gid://shopify/Product/1', handle, status: 'ACTIVE', updatedAt: '2026-09-05', descriptionHtml });

test('delivery plan changes only exact stale paragraphs and preserves product content', () => {
  const before = '<h2>Original product facts</h2><p>Keep this unique description.</p>' + outdatedDelivery + outdatedProof;
  const plan = prepareDeliveryCopyPlan({ products: [product(before)] }, delivery);
  assert.equal(plan.apply, false);
  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0].edits.length, 2);
  assert.match(plan.changes[0].descriptionHtml, /^<h2>Original product facts<\/h2><p>Keep this unique description\.<\/p>/);
  assert.match(plan.changes[0].descriptionHtml, /5 business days/);
  assert.match(plan.changes[0].expectedDescriptionSha256, /^[a-f0-9]{64}$/);
  assert.equal(plan.needsReview.length, 0);
  assert.equal(prepareDeliveryCopyPlan({ products: [product(plan.changes[0].descriptionHtml)] }, delivery).changes.length, 0);
});

test('delivery plan preserves the magnetic shipping exception and flags unknown copy', () => {
  const plan = prepareDeliveryCopyPlan({ products: [product(outdatedDelivery, 'magnetic-couples-bracelet-set'), product('<p>Wait 7–20 days for delivery.</p>', 'other')] }, delivery);
  assert.match(plan.changes[0].descriptionHtml, /same day when ordered by 12 PM ET/);
  assert.doesNotMatch(plan.changes[0].descriptionHtml, /5 business days/);
  assert.deepEqual(plan.needsReview.map(p => p.handle), ['other']);
  assert.throws(() => prepareDeliveryCopyPlan({ products: [product(outdatedDelivery + outdatedDelivery)] }, delivery), /Ambiguous/);
});
