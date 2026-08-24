import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProductDescriptionInput,
  productContentFingerprint,
  validateDescriptionBatch,
  validateProductDescriptionUpdate
} from './product-description-contracts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const backupOnly = args.includes('--backup');
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const updatesPath = valueAfter('--updates');
const rollbackPath = valueAfter('--rollback');
const targetsPath = valueAfter('--targets');
const store = (process.env.SHOPIFY_STORE || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || '2026-07';

if (!store || !token) throw new Error('Shopify Admin credentials are unavailable; no request was attempted.');

async function graphql(query, variables = {}) {
  const response = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-shopify-access-token': token },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(`Shopify Admin request failed: ${JSON.stringify(payload.errors || { status: response.status })}`);
  }
  return payload.data;
}

const CATALOG_QUERY = `
  query ProductDescriptionCatalog($after: String) {
    products(first: 100, after: $after, sortKey: TITLE) {
      nodes {
        id handle title status updatedAt vendor productType tags templateSuffix descriptionHtml
        seo { title description }
        options { name optionValues { name } }
        variants(first: 100) {
          nodes { id title sku price compareAtPrice availableForSale selectedOptions { name value } }
          pageInfo { hasNextPage }
        }
        media(first: 100) {
          nodes { id mediaContentType alt }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateProductDescription($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle status updatedAt descriptionHtml seo { title description } }
      userErrors { field message }
    }
  }
`;

async function fetchCatalog() {
  const products = [];
  let after = null;
  do {
    const data = await graphql(CATALOG_QUERY, { after });
    if (data.products.nodes.some((product) => product.variants.pageInfo.hasNextPage || product.media.pageInfo.hasNextPage)) {
      throw new Error('Nested product pagination is incomplete; no mutation was attempted.');
    }
    products.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  return products;
}

async function updateContent(id, update) {
  const data = await graphql(UPDATE_MUTATION, { product: buildProductDescriptionInput(id, update) });
  if (data.productUpdate.userErrors.length) {
    throw new Error(`Shopify rejected product update: ${JSON.stringify(data.productUpdate.userErrors)}`);
  }
  return data.productUpdate.product;
}

async function writeSnapshot(products, reason) {
  const directory = resolve(ROOT, '.product-admin-backups');
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}-${reason}.json`);
  await writeFile(path, `${JSON.stringify({ store, createdAt: new Date().toISOString(), reason, products }, null, 2)}\n`);
  return path;
}

const catalog = await fetchCatalog();
const byHandle = new Map(catalog.map((product) => [product.handle, product]));

if (rollbackPath) {
  const snapshot = JSON.parse(await readFile(resolve(rollbackPath), 'utf8'));
  const missing = snapshot.products.filter((product) => !byHandle.has(product.handle));
  if (missing.length) throw new Error(`Rollback targets are missing: ${missing.map((product) => product.handle).join(', ')}`);
  console.log(JSON.stringify({ apply, rollback: snapshot.products.map((product) => product.handle) }, null, 2));
  if (!apply) process.exit(0);
  for (const original of snapshot.products) {
    const current = byHandle.get(original.handle);
    const restored = await updateContent(current.id, {
      descriptionHtml: original.descriptionHtml,
      seoTitle: original.seo.title,
      seoDescription: original.seo.description
    });
    if (restored.status !== original.status) throw new Error(`Rollback changed product status for ${original.handle}; stopped.`);
  }
  console.log(`Rolled back ${snapshot.products.length} product descriptions.`);
  process.exit(0);
}

let targetHandles;
if (targetsPath) {
  const manifest = JSON.parse(await readFile(resolve(targetsPath), 'utf8'));
  targetHandles = manifest.products;
  if (!Array.isArray(targetHandles) || new Set(targetHandles).size !== targetHandles.length) {
    throw new Error('Target manifest must contain a unique products array.');
  }
} else {
  targetHandles = catalog.filter((product) => product.status === 'ACTIVE').map((product) => product.handle);
}

const selected = targetHandles.map((handle) => {
  const product = byHandle.get(handle);
  if (!product) throw new Error(`Missing Shopify product: ${handle}`);
  if (product.status !== 'ACTIVE') throw new Error(`Target is not active: ${handle}`);
  return product;
});

if (backupOnly) {
  const snapshotPath = await writeSnapshot(selected, 'manual-backup');
  console.log(JSON.stringify({ snapshotPath, products: selected.map((product) => ({ handle: product.handle, updatedAt: product.updatedAt })) }, null, 2));
  process.exit(0);
}

if (!updatesPath) throw new Error('Use --backup, --updates <path>, or --rollback <snapshot>.');
const updateDocument = JSON.parse(await readFile(resolve(updatesPath), 'utf8'));
const updates = updateDocument.products;
if (!Array.isArray(updates) || new Set(updates.map((update) => update.handle)).size !== updates.length) {
  throw new Error('Update document must contain a unique products array.');
}
const unexpected = updates.filter((update) => !targetHandles.includes(update.handle));
if (unexpected.length) throw new Error(`Updates outside approved targets: ${unexpected.map((update) => update.handle).join(', ')}`);
const batchErrors = validateDescriptionBatch(updates);
if (batchErrors.length) throw new Error(batchErrors.join('; '));

const plan = updates.map((update) => {
  const before = byHandle.get(update.handle);
  if (!before) throw new Error(`Missing Shopify product: ${update.handle}`);
  if (before.updatedAt !== update.expectedUpdatedAt) {
    throw new Error(`Concurrent edit detected for ${update.handle}: expected ${update.expectedUpdatedAt}, found ${before.updatedAt}`);
  }
  const validation = validateProductDescriptionUpdate(update);
  if (validation.errors.length) throw new Error(`${update.handle}: ${validation.errors.join('; ')}`);
  if (productContentFingerprint(before) !== update.expectedContentFingerprint) {
    throw new Error(`Product content drift detected for ${update.handle}; no mutation was attempted.`);
  }
  return { update, before, metrics: validation.metrics };
});

const snapshotPath = await writeSnapshot(plan.map((item) => item.before), apply ? 'pre-apply' : 'dry-run');
console.log(JSON.stringify({
  apply,
  snapshotPath,
  changes: plan.map((item) => ({ handle: item.update.handle, metrics: item.metrics }))
}, null, 2));

if (!apply) {
  console.log('Dry run only. Re-run with --apply after reviewing the snapshot and plan.');
  process.exit(0);
}

for (const item of plan) {
  const updated = await updateContent(item.before.id, item.update);
  if (updated.status !== 'ACTIVE') throw new Error(`Update changed product status for ${item.update.handle}; stopped.`);
  if (productContentFingerprint(updated) !== productContentFingerprint(item.update)) {
    throw new Error(`Post-update product content mismatch for ${item.update.handle}; stopped.`);
  }
  console.log(`Updated and verified ${item.update.handle}.`);
}

console.log(`Applied and verified ${plan.length} product descriptions. Rollback snapshot: ${snapshotPath}`);
