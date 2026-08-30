import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const applyAdditional = args.includes('--apply-additional');
const manifestFlag = args.indexOf('--manifest');
const manifestPath = resolve(
  ROOT,
  manifestFlag >= 0 ? args[manifestFlag + 1] : 'scripts/product-media-improvements.json'
);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

function normalizeStore(value = '') {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function validateManifest(document) {
  const errors = [];
  if (document.mode !== 'append-only') errors.push('Manifest mode must be append-only.');
  if (!Array.isArray(document.products) || document.products.length === 0) errors.push('Manifest products are required.');
  const handles = new Set();
  const altTexts = new Set();
  for (const product of document.products || []) {
    if (!product.handle || handles.has(product.handle)) errors.push(`Duplicate or missing product handle: ${product.handle || '(blank)'}`);
    handles.add(product.handle);
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(product.expectedProductId || '')) {
      errors.push(`Invalid expected product ID for ${product.handle}.`);
    }
    if (product.expectedStatus !== 'ACTIVE') errors.push(`Expected status must be ACTIVE for ${product.handle}.`);
    if (!Array.isArray(product.media) || product.media.length === 0) errors.push(`Media are required for ${product.handle}.`);
    for (const media of product.media || []) {
      if (!/-v2\.webp$/.test(media.filename || '')) errors.push(`Invalid optimized filename: ${media.filename || '(blank)'}`);
      if (!media.alt || media.alt.length < 20 || media.alt.length > 125) errors.push(`Invalid alt text for ${media.filename}.`);
      if (altTexts.has(media.alt)) errors.push(`Duplicate alt text: ${media.alt}`);
      altTexts.add(media.alt);
    }
  }
  if (errors.length) throw new Error(errors.join(' '));
}

async function validateAssets() {
  const assetRoot = resolve(ROOT, manifest.assetRoot);
  const assets = [];
  for (const product of manifest.products) {
    for (const media of product.media) {
      const path = resolve(assetRoot, media.filename);
      const details = await stat(path);
      if (!details.isFile() || details.size < 70_000 || details.size > 250_000) {
        throw new Error(`Optimized asset is outside the approved size range: ${media.filename} (${details.size} bytes).`);
      }
      const header = await readFile(path);
      if (header.subarray(0, 4).toString() !== 'RIFF' || header.subarray(8, 12).toString() !== 'WEBP') {
        throw new Error(`Asset is not a WebP file: ${media.filename}`);
      }
      assets.push({ ...media, path, bytes: details.size, productHandle: product.handle });
    }
  }
  return assets;
}

validateManifest(manifest);
const assets = await validateAssets();

if (checkOnly) {
  console.log(JSON.stringify({
    release: manifest.release,
    mode: manifest.mode,
    products: manifest.products.length,
    assets: assets.map(({ filename, productHandle, bytes }) => ({ filename, productHandle, bytes }))
  }, null, 2));
  process.exit(0);
}

const store = normalizeStore(process.env.SHOPIFY_STORE);
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

const PRODUCT_QUERY = `
  query ProductMediaSnapshot($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
      status
      updatedAt
      media(first: 250) {
        nodes {
          id
          alt
          mediaContentType
          preview { status }
          ... on MediaImage { image { width height } }
        }
        pageInfo { hasNextPage }
      }
    }
  }
`;

const STAGED_UPLOAD_MUTATION = `
  mutation CreateProductImageUploadTargets($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;

const ADD_MEDIA_MUTATION = `
  mutation AddProductMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product { id handle status updatedAt }
      userErrors { field message }
    }
  }
`;

async function fetchProduct(handle) {
  const data = await graphql(PRODUCT_QUERY, { handle });
  const product = data.productByIdentifier;
  if (!product) throw new Error(`Missing Shopify product: ${handle}`);
  if (product.media.pageInfo.hasNextPage) throw new Error(`Product media pagination is incomplete for ${handle}; no mutation was attempted.`);
  return product;
}

function mediaFingerprint(product) {
  return JSON.stringify(product.media.nodes.map((media) => [media.id, media.alt, media.mediaContentType]));
}

function assertProductIdentity(product, target) {
  if (product.id !== target.expectedProductId || product.handle !== target.handle || product.status !== target.expectedStatus) {
    throw new Error(`Product identity or status changed for ${target.handle}; no mutation was attempted.`);
  }
}

async function writeSnapshot(products, reason) {
  const directory = resolve(ROOT, '.product-admin-backups');
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}-product-media-${reason}.json`);
  await writeFile(path, `${JSON.stringify({
    store,
    release: manifest.release,
    mode: manifest.mode,
    createdAt: new Date().toISOString(),
    products
  }, null, 2)}\n`);
  return path;
}

async function createStagedTargets(items) {
  const input = items.map((item) => ({
    filename: item.filename,
    mimeType: 'image/webp',
    httpMethod: 'POST',
    resource: 'PRODUCT_IMAGE'
  }));
  const data = await graphql(STAGED_UPLOAD_MUTATION, { input });
  if (data.stagedUploadsCreate.userErrors.length) {
    throw new Error(`Shopify rejected staged uploads: ${JSON.stringify(data.stagedUploadsCreate.userErrors)}`);
  }
  if (data.stagedUploadsCreate.stagedTargets.length !== items.length) {
    throw new Error('Shopify returned an incomplete staged-upload target set.');
  }
  return data.stagedUploadsCreate.stagedTargets;
}

async function uploadToTarget(target, item) {
  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  const bytes = await readFile(item.path);
  form.append('file', new Blob([bytes], { type: 'image/webp' }), basename(item.path));
  const response = await fetch(target.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Staged upload failed for ${item.filename} with HTTP ${response.status}.`);
}

async function addMedia(productId, targets, items) {
  const media = targets.map((target, index) => ({
    originalSource: target.resourceUrl,
    alt: items[index].alt,
    mediaContentType: 'IMAGE'
  }));
  const data = await graphql(ADD_MEDIA_MUTATION, { product: { id: productId }, media });
  const result = data.productUpdate;
  if (result.userErrors.length) throw new Error(`Shopify rejected product media: ${JSON.stringify(result.userErrors)}`);
  return result.product;
}

async function waitForMedia(handle, expectedAltTexts) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const product = await fetchProduct(handle);
    const matches = product.media.nodes.filter((media) => expectedAltTexts.includes(media.alt));
    if (matches.length === expectedAltTexts.length && matches.every((media) => media.preview?.status === 'READY')) return product;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  throw new Error(`Timed out waiting for Shopify to process new media for ${handle}.`);
}

const snapshots = [];
const plan = [];
for (const target of manifest.products) {
  const product = await fetchProduct(target.handle);
  assertProductIdentity(product, target);
  snapshots.push(product);
  const existingAltTexts = new Set(product.media.nodes.map((media) => media.alt).filter(Boolean));
  const additions = target.media
    .filter((media) => !existingAltTexts.has(media.alt))
    .map((media) => assets.find((asset) => asset.productHandle === target.handle && asset.filename === media.filename));
  plan.push({ target, product, additions });
}

const snapshotPath = await writeSnapshot(snapshots, applyAdditional ? 'pre-apply' : 'dry-run');
console.log(JSON.stringify({
  applyAdditional,
  snapshotPath,
  plan: plan.map(({ target, product, additions }) => ({
    handle: target.handle,
    currentMediaCount: product.media.nodes.length,
    additions: additions.map(({ filename, role, alt, bytes }) => ({ filename, role, alt, bytes }))
  }))
}, null, 2));

if (!applyAdditional) {
  console.log('Dry run only. No media were uploaded or attached.');
  process.exit(0);
}

for (const item of plan) {
  if (item.additions.length === 0) {
    console.log(`No new media needed for ${item.target.handle}.`);
    continue;
  }
  const current = await fetchProduct(item.target.handle);
  assertProductIdentity(current, item.target);
  if (current.updatedAt !== item.product.updatedAt || mediaFingerprint(current) !== mediaFingerprint(item.product)) {
    throw new Error(`Concurrent product or media edit detected for ${item.target.handle}; stopped before upload.`);
  }
  const targets = await createStagedTargets(item.additions);
  for (let index = 0; index < targets.length; index += 1) await uploadToTarget(targets[index], item.additions[index]);
  const updated = await addMedia(current.id, targets, item.additions);
  if (updated.status !== 'ACTIVE') throw new Error(`Media update changed product status for ${item.target.handle}; stopped.`);
  const verified = await waitForMedia(item.target.handle, item.additions.map((media) => media.alt));
  if (verified.media.nodes.length !== current.media.nodes.length + item.additions.length) {
    throw new Error(`Unexpected media count after updating ${item.target.handle}; stopped.`);
  }
  console.log(`Added and verified ${item.additions.length} gallery image(s) for ${item.target.handle}.`);
}

console.log(`Append-only product media update complete. Snapshot: ${snapshotPath}`);
