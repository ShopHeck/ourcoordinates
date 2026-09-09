import { parseShopifyJson } from './shopify-json.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareDeliveryCopyPlan } from './prepare-delivery-copy-plan.mjs';

export const APPROVED_HANDLES = [
  '925-sterling-silver-airplane-bracelet', 'coordinates-bracelet',
  'coordinates-flat-band-ring', 'custom-birthstone-rings', 'coordinates-necklace',
  'leather-coordinate-bracelet', 'lock-bracelet-matching-key-necklace-set',
  'magnetic-bead-bracelet-set', 'magnetic-couples-bracelet-set',
  'magnetic-couple-necklace', 'personalized-lock-necklace', 'star-map-necklace'
];

export const QUERY = `query DeliveryCopyProduct($id: ID!) {
  product(id: $id) {
    id handle title status updatedAt vendor productType tags templateSuffix descriptionHtml
    seo { title description }
    options { name optionValues { name } }
    variants(first: 100) {
      nodes { id title sku price compareAtPrice availableForSale selectedOptions { name value } }
      pageInfo { hasNextPage }
    }
    media(first: 100) { nodes { id mediaContentType alt } pageInfo { hasNextPage } }
  }
}`;
export const MUTATION = `mutation DeliveryCopyUpdate($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id handle status updatedAt descriptionHtml }
    userErrors { field message }
  }
}`;
export const descriptionHash = html => createHash('sha256').update(html).digest('hex');
const normalizeStore = value => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
export const updateInput = change => ({ id: change.id, descriptionHtml: change.descriptionHtml });
export function unchangedFields(product) {
  const { descriptionHtml, updatedAt, ...rest } = product;
  return rest;
}
export function assertVersion(current, change) {
  assert.ok(current, `Missing product: ${change.handle}`);
  assert.equal(current.id, change.id, 'Product ID mismatch');
  assert.equal(current.handle, change.handle, 'Product handle mismatch');
  assert.equal(current.status, 'ACTIVE', `Product no longer active: ${change.handle}`);
  assert.equal(current.updatedAt, change.expectedUpdatedAt, `Concurrent edit: ${change.handle}`);
  assert.equal(descriptionHash(current.descriptionHtml), change.expectedDescriptionSha256, `Description drift: ${change.handle}`);
}
export function validateApprovedPlan(plan, source, delivery) {
  assert.equal(plan.apply, false, 'Expected an offline review plan');
  assert.deepEqual(plan.changes.map(p => p.handle).sort(), [...APPROVED_HANDLES].sort(), 'Only the approved 12 products may change');
  assert.equal(new Set(plan.changes.map(p => p.id)).size, 12, 'Duplicate product IDs');
  const regenerated = prepareDeliveryCopyPlan(source, delivery);
  assert.deepEqual(plan, regenerated, 'Plan differs from exact approved replacements and source backup');
}

async function run() {
  const args = process.argv.slice(2);
  const value = flag => args[args.indexOf(flag) + 1];
  assert.ok(args.includes('--plan') && args.includes('--source-backup'), 'Required: --plan <path> --source-backup <path> [--apply]');
  const apply = args.includes('--apply');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const plan = JSON.parse(await readFile(resolve(value('--plan')), 'utf8'));
  const source = JSON.parse(await readFile(resolve(value('--source-backup')), 'utf8'));
  const { delivery } = parseShopifyJson(await readFile(resolve(root, 'locales/en.default.json'), 'utf8'));
  validateApprovedPlan(plan, source, delivery);
  const store = normalizeStore(process.env.SHOPIFY_STORE || '');
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  assert.ok(store && token, 'Shopify credentials unavailable');
  assert.equal(store, normalizeStore(source.store), 'Source backup belongs to a different store');

  async function graphql(query, variables) {
    const response = await fetch(`https://${store}/admin/api/2026-07/graphql.json`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': token },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000)
    });
    const body = await response.json();
    // Never automatically retry an uncertain mutation. A new run first reads current state.
    assert.ok(response.ok && !body.errors, `Shopify request failed (${response.status}); inspect current product state before retrying`);
    return body.data;
  }
  async function product(id) {
    const { product: item } = await graphql(QUERY, { id });
    assert.ok(item && !item.variants.pageInfo.hasNextPage && !item.media.pageInfo.hasNextPage, 'Incomplete product snapshot; stopped');
    return item;
  }

  const before = [];
  const pending = [];
  for (const change of plan.changes) {
    const current = await product(change.id);
    assert.equal(current.handle, change.handle);
    assert.equal(current.status, 'ACTIVE');
    if (current.descriptionHtml === change.descriptionHtml) {
      console.log(`Already matches approved copy: ${change.handle}`);
      continue;
    }
    assertVersion(current, change);
    before.push(current);
    pending.push(change);
  }
  console.log(JSON.stringify({ apply, pending: pending.map(p => p.handle) }));
  if (!apply || !pending.length) return;

  const directory = resolve(root, '.product-admin-backups');
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(directory, `${stamp}-delivery-pre-apply.json`);
  const receiptPath = resolve(directory, `${stamp}-delivery-receipt.json`);
  await writeFile(backupPath, JSON.stringify({ store, createdAt: new Date().toISOString(), products: before }, null, 2) + '\n', { flag: 'wx' });
  const receipt = { store, backupPath, approvedCount: 12, verified: [] };
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(`Pre-apply backup: ${backupPath}`);

  for (const change of pending) {
    const fresh = await product(change.id);
    assertVersion(fresh, change);
    const original = before.find(p => p.id === change.id);
    assert.deepEqual(unchangedFields(fresh), unchangedFields(original), `Product metadata changed before apply: ${change.handle}`);
    const result = await graphql(MUTATION, { product: updateInput(change) });
    assert.equal(result.productUpdate.userErrors.length, 0, `Shopify rejected ${change.handle}`);
    const after = await product(change.id);
    assert.equal(after.descriptionHtml, change.descriptionHtml, `Saved description mismatch: ${change.handle}`);
    assert.deepEqual(unchangedFields(after), unchangedFields(original), `Unrelated product data changed: ${change.handle}; stopped for review`);
    receipt.verified.push({ id: after.id, handle: after.handle, updatedAt: after.updatedAt, descriptionSha256: descriptionHash(after.descriptionHtml), unchangedProductData: true });
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    console.log(`Updated and verified: ${change.handle}`);
  }
  console.log(`Receipt: ${receiptPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}
