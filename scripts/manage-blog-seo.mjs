import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const updatesPath = valueAfter('--updates');
const rollbackPath = valueAfter('--rollback');
const store = (process.env.SHOPIFY_STORE || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || '2026-07';
const SEO_KEYS = ['title_tag', 'description_tag'];

if (!store || !token) throw new Error('Set Shopify Admin credentials; no request was attempted.');
if (!updatesPath && !rollbackPath) throw new Error('Use --updates <path> or --rollback <snapshot>.');

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
  query ArticleSeoCatalog {
    blogs(first: 50) {
      nodes {
        articles(first: 250) {
          nodes {
            id handle title summary updatedAt
            seoMetafields: metafields(first: 20, namespace: "global") {
              nodes { id namespace key type value }
              pageInfo { hasNextPage }
            }
          }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

const SET_MUTATION = `
  mutation SetArticleSeo($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { ownerType namespace key type value }
      userErrors { code field message }
    }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteArticleSeo($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { ownerId namespace key }
      userErrors { code field message }
    }
  }
`;

async function fetchCatalog() {
  const data = await graphql(CATALOG_QUERY);
  if (data.blogs.pageInfo.hasNextPage || data.blogs.nodes.some((blog) => blog.articles.pageInfo.hasNextPage)) {
    throw new Error('Blog catalog pagination is incomplete; no mutation was attempted.');
  }
  const articles = data.blogs.nodes.flatMap((blog) => blog.articles.nodes);
  if (articles.some((article) => article.seoMetafields.pageInfo.hasNextPage)) {
    throw new Error('SEO metafield pagination is incomplete; no mutation was attempted.');
  }
  return articles;
}

const seoMap = (article) => new Map(article.seoMetafields.nodes
  .filter((field) => SEO_KEYS.includes(field.key))
  .map((field) => [field.key, field]));

async function writeSnapshot(articles, reason) {
  const directory = resolve(ROOT, '.blog-admin-backups');
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}-${reason}.json`);
  await writeFile(path, `${JSON.stringify({ store, createdAt: new Date().toISOString(), reason, articles }, null, 2)}\n`);
  return path;
}

async function setMetafields(metafields) {
  for (let index = 0; index < metafields.length; index += 25) {
    const data = await graphql(SET_MUTATION, { metafields: metafields.slice(index, index + 25) });
    if (data.metafieldsSet.userErrors.length) {
      throw new Error(`Shopify rejected SEO fields: ${JSON.stringify(data.metafieldsSet.userErrors)}`);
    }
  }
}

async function deleteMetafields(metafields) {
  if (!metafields.length) return;
  const data = await graphql(DELETE_MUTATION, { metafields });
  if (data.metafieldsDelete.userErrors.length) {
    throw new Error(`Shopify rejected SEO field deletion: ${JSON.stringify(data.metafieldsDelete.userErrors)}`);
  }
}

const catalog = await fetchCatalog();
const byHandle = new Map(catalog.map((article) => [article.handle, article]));

if (rollbackPath) {
  const snapshot = JSON.parse(await readFile(resolve(rollbackPath), 'utf8'));
  const restore = [];
  const remove = [];
  for (const original of snapshot.articles) {
    const current = byHandle.get(original.handle);
    if (!current) throw new Error(`Rollback target is missing: ${original.handle}`);
    const originalFields = seoMap(original);
    for (const key of SEO_KEYS) {
      const field = originalFields.get(key);
      if (field) restore.push({ ownerId: current.id, namespace: 'global', key, type: field.type, value: field.value });
      else remove.push({ ownerId: current.id, namespace: 'global', key });
    }
  }
  console.log(JSON.stringify({ apply, restore: restore.length, remove: remove.length }, null, 2));
  if (!apply) process.exit(0);
  await setMetafields(restore);
  await deleteMetafields(remove);
  console.log(`Restored SEO fields for ${snapshot.articles.length} articles.`);
  process.exit(0);
}

const updates = JSON.parse(await readFile(resolve(updatesPath), 'utf8')).articles;
if (!Array.isArray(updates) || new Set(updates.map((article) => article.handle)).size !== updates.length) {
  throw new Error('Update document must contain a unique articles array.');
}

const selected = updates.map((update) => {
  const current = byHandle.get(update.handle);
  if (!current) throw new Error(`Missing Shopify article: ${update.handle}`);
  if (current.title !== update.title || current.summary !== update.summary) {
    throw new Error(`Article content drift detected for ${update.handle}; no SEO mutation was attempted.`);
  }
  const seoTitle = update.seoTitle || update.title;
  if (seoTitle.length < 30 || seoTitle.length > 65 || update.summary.length < 110 || update.summary.length > 165) {
    throw new Error(`Invalid SEO length for ${update.handle}; no mutation was attempted.`);
  }
  return current;
});

const snapshotPath = await writeSnapshot(selected, apply ? 'seo-pre-apply' : 'seo-dry-run');
const metafields = updates.flatMap((update) => {
  const ownerId = byHandle.get(update.handle).id;
  return [
    { ownerId, namespace: 'global', key: 'title_tag', type: 'string', value: update.seoTitle || update.title },
    { ownerId, namespace: 'global', key: 'description_tag', type: 'string', value: update.summary }
  ];
});

console.log(JSON.stringify({ apply, snapshotPath, articles: selected.length, metafields: metafields.length }, null, 2));
if (!apply) {
  console.log('Dry run only. Re-run with --apply after review.');
  process.exit(0);
}

await setMetafields(metafields);
const verified = await fetchCatalog();
const verifiedByHandle = new Map(verified.map((article) => [article.handle, article]));
for (const update of updates) {
  const fields = seoMap(verifiedByHandle.get(update.handle));
  if (fields.get('title_tag')?.value !== (update.seoTitle || update.title) || fields.get('description_tag')?.value !== update.summary) {
    throw new Error(`SEO verification failed for ${update.handle}; stopped.`);
  }
}
console.log(`Applied and verified SEO fields for ${updates.length} articles. Rollback snapshot: ${snapshotPath}`);
