import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMutationVariables,
  commercialFingerprint,
  planAssignments,
  validateCatalogContract
} from './admin-contracts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(resolve(ROOT, 'scripts/personalization/product-contracts.json'), 'utf8'));
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rollbackIndex = args.indexOf('--rollback');
const rollbackPath = rollbackIndex >= 0 ? args[rollbackIndex + 1] : null;
const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || '2026-07';

if (!store || !token) {
  throw new Error('Set SHOPIFY_STORE and SHOPIFY_ADMIN_ACCESS_TOKEN; no mutation was attempted.');
}

async function graphql(query, variables) {
  const response = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': token
    },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(JSON.stringify(payload.errors || payload));
  }
  return payload.data;
}

const SNAPSHOT_QUERY = `
  query ProductSnapshot($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
      templateSuffix
      status
      publishedAt
      onlineStoreUrl
      variants(first: 250) {
        nodes {
          id
          title
          price
          compareAtPrice
          inventoryQuantity
          inventoryPolicy
          availableForSale
          selectedOptions { name value }
          media(first: 50) {
            nodes { id }
            pageInfo { hasNextPage }
          }
        }
        pageInfo { hasNextPage }
      }
      media(first: 250) {
        nodes { id mediaContentType }
        pageInfo { hasNextPage }
      }
    }
  }
`;

const UPDATE_MUTATION = `
  mutation AssignTemplate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle templateSuffix }
      userErrors { field message }
    }
  }
`;

async function fetchSnapshot(handle) {
  const data = await graphql(SNAPSHOT_QUERY, { handle });
  if (!data.productByIdentifier) throw new Error(`Missing product: ${handle}`);
  commercialFingerprint(data.productByIdentifier);
  return data.productByIdentifier;
}

async function updateTemplate(id, templateSuffix) {
  const data = await graphql(UPDATE_MUTATION, buildMutationVariables(id, templateSuffix));
  const result = data.productUpdate;
  if (result.userErrors.length) throw new Error(JSON.stringify(result.userErrors));
  return result.product;
}

async function writeSnapshot(products, changes) {
  const directory = resolve(ROOT, '.personalization-snapshots');
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(path, `${JSON.stringify({ release: manifest.release, products, changes }, null, 2)}\n`);
  return path;
}

if (rollbackPath) {
  const rollback = JSON.parse(await readFile(resolve(rollbackPath), 'utf8'));
  if (!apply) {
    console.log(JSON.stringify(rollback.changes.map((item) => ({
      handle: item.handle,
      templateSuffix: item.before
    })), null, 2));
    process.exit(0);
  }
  for (const item of rollback.changes) await updateTemplate(item.id, item.before || '');
  console.log(`Rolled back ${rollback.changes.length} template assignments.`);
  process.exit(0);
}

const products = [];
for (const item of manifest.products) {
  await access(resolve(ROOT, `templates/product.${item.templateSuffix}.json`));
  const product = await fetchSnapshot(item.handle);
  validateCatalogContract(item, product);
  products.push(product);
}
const plan = planAssignments(manifest, products);
const snapshotPath = await writeSnapshot(products, plan.changes);

console.log(JSON.stringify({
  snapshotPath,
  changes: plan.changes.map(({ fingerprint, ...item }) => item),
  verificationMismatches: plan.verificationMismatches
}, null, 2));

if (plan.verificationMismatches.length) {
  throw new Error('Verification-only product mismatch; scope review is required before apply.');
}

if (!apply) {
  console.log('Dry run only. Re-run with --apply after reviewing the snapshot.');
  process.exit(0);
}

for (const item of plan.changes) await updateTemplate(item.id, item.after);

for (const item of plan.changes) {
  const after = await fetchSnapshot(item.handle);
  if (commercialFingerprint(after) !== item.fingerprint) {
    throw new Error(`Commercial catalog drift detected after ${item.handle}`);
  }
  if ((after.templateSuffix || '') !== item.after) {
    throw new Error(`Template assignment did not persist for ${item.handle}`);
  }
}

console.log(`Applied and verified ${plan.changes.length} template assignments.`);
