import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleFingerprint, buildArticleInput, validateArticleUpdate } from './blog-admin-contracts.mjs';

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
const targetsPath = resolve(valueAfter('--targets') || resolve(ROOT, 'scripts/blog-content-targets.json'));
const store = (process.env.SHOPIFY_STORE || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || '2026-07';

if (!store || !token) {
  throw new Error('Set SHOPIFY_STORE and SHOPIFY_ADMIN_ACCESS_TOKEN; no Admin request was attempted.');
}

async function graphql(query, variables = {}) {
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
    throw new Error(`Shopify Admin request failed: ${JSON.stringify(payload.errors || { status: response.status })}`);
  }
  return payload.data;
}

const CATALOG_QUERY = `
  query BlogAdminCatalog {
    blogs(first: 50) {
      nodes {
        id
        handle
        title
        articles(first: 250) {
          nodes {
            id
            handle
            title
            body
            summary
            tags
            isPublished
            publishedAt
            updatedAt
            image { altText url }
            blog { id handle title }
          }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateAuditedArticle($id: ID!, $article: ArticleUpdateInput!) {
    articleUpdate(id: $id, article: $article) {
      article { id handle title body summary tags isPublished updatedAt }
      userErrors { code field message }
    }
  }
`;

async function fetchCatalog() {
  const data = await graphql(CATALOG_QUERY);
  if (data.blogs.pageInfo.hasNextPage || data.blogs.nodes.some((blog) => blog.articles.pageInfo.hasNextPage)) {
    throw new Error('Blog catalog pagination is incomplete; no mutation was attempted.');
  }
  return data.blogs.nodes.flatMap((blog) => blog.articles.nodes);
}

async function updateArticle(id, article) {
  const data = await graphql(UPDATE_MUTATION, { id, article });
  if (data.articleUpdate.userErrors.length) {
    throw new Error(`Shopify rejected article update: ${JSON.stringify(data.articleUpdate.userErrors)}`);
  }
  return data.articleUpdate.article;
}

async function writeSnapshot(articles, reason) {
  const directory = resolve(ROOT, '.blog-admin-backups');
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}-${reason}.json`);
  await writeFile(path, `${JSON.stringify({ store, createdAt: new Date().toISOString(), reason, articles }, null, 2)}\n`);
  return path;
}

const catalog = await fetchCatalog();
const byHandle = new Map(catalog.map((article) => [article.handle, article]));

if (rollbackPath) {
  const snapshot = JSON.parse(await readFile(resolve(rollbackPath), 'utf8'));
  const missing = snapshot.articles.filter((article) => !byHandle.has(article.handle));
  if (missing.length) throw new Error(`Rollback targets are missing: ${missing.map((article) => article.handle).join(', ')}`);
  if (!apply) {
    console.log(JSON.stringify({ rollback: snapshot.articles.map((article) => article.handle), apply: false }, null, 2));
    process.exit(0);
  }
  for (const article of snapshot.articles) {
    const current = byHandle.get(article.handle);
    const restored = await updateArticle(current.id, buildArticleInput(article));
    if (!restored.isPublished) throw new Error(`Rollback unpublished ${article.handle}; stopped.`);
  }
  console.log(`Rolled back ${snapshot.articles.length} articles.`);
  process.exit(0);
}

const targets = JSON.parse(await readFile(targetsPath, 'utf8')).articles;
if (!Array.isArray(targets) || new Set(targets).size !== targets.length) {
  throw new Error('Target manifest must contain a unique articles array.');
}
const selected = targets.map((handle) => {
  const article = byHandle.get(handle);
  if (!article) throw new Error(`Missing Shopify article: ${handle}`);
  return article;
});

if (backupOnly) {
  const snapshotPath = await writeSnapshot(selected, 'manual-backup');
  console.log(JSON.stringify({ snapshotPath, articles: selected.map((article) => ({ handle: article.handle, updatedAt: article.updatedAt })) }, null, 2));
  process.exit(0);
}

if (!updatesPath) throw new Error('Use --backup, --updates <path>, or --rollback <snapshot>.');
const updateDocument = JSON.parse(await readFile(resolve(updatesPath), 'utf8'));
const updates = updateDocument.articles;
if (!Array.isArray(updates) || new Set(updates.map((update) => update.handle)).size !== updates.length) {
  throw new Error('Update document must contain a unique articles array.');
}
const unexpected = updates.filter((update) => !targets.includes(update.handle));
if (unexpected.length) throw new Error(`Updates outside approved targets: ${unexpected.map((update) => update.handle).join(', ')}`);

const plan = updates.map((update) => {
  const before = byHandle.get(update.handle);
  if (!before) throw new Error(`Missing Shopify article: ${update.handle}`);
  if (before.updatedAt !== update.expectedUpdatedAt) {
    throw new Error(`Concurrent edit detected for ${update.handle}: expected ${update.expectedUpdatedAt}, found ${before.updatedAt}`);
  }
  const validation = validateArticleUpdate(update);
  if (validation.errors.length) throw new Error(`${update.handle}: ${validation.errors.join('; ')}`);
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
  const updated = await updateArticle(item.before.id, buildArticleInput(item.update));
  if (!updated.isPublished) throw new Error(`Update unpublished ${item.update.handle}; stopped.`);
  if (articleFingerprint(updated) !== articleFingerprint({ ...item.before, ...buildArticleInput(item.update) })) {
    throw new Error(`Post-update content mismatch for ${item.update.handle}; stopped.`);
  }
  console.log(`Updated and verified ${item.update.handle}.`);
}

console.log(`Applied and verified ${plan.length} article updates. Rollback snapshot: ${snapshotPath}`);
