import { parseShopifyJson } from './shopify-json.mjs';
// Offline review plan only. This script has no network or mutation capability.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const outdatedDelivery = '<p>Every piece is engraved to order. Engraving takes 2–3 business days, then standard US delivery runs about 7–20 business days. Express engraving and shipping is available at checkout: 3 business days to engrave, then 4–7 days in transit. Standard US shipping is free on orders over $50.</p>';
export const outdatedExpress = '<p>Every piece is engraved to order and ships within 5 business days. We do not promise a Sunday doorstep date. Need it faster? Express engraving and shipping is available at checkout. Standard US shipping is free on orders over $50.</p>';
export const outdatedProof = '<p>Yes. The live preview on this page renders your exact text on the piece as you type, and custom orders receive a photo proof before engraving begins. Because each piece is cut for one person, engraved items cannot be re-cut — so check spelling and dates at both checkpoints.</p>';
const hash = (html) => createHash('sha256').update(html).digest('hex');
const escapeHtml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function prepareDeliveryCopyPlan(snapshot, delivery) {
  const changes = [];
  const needsReview = [];
  for (const product of snapshot.products) {
    if (product.status !== 'ACTIVE') continue;
    const before = product.descriptionHtml;
    const production = product.handle === 'magnetic-couples-bracelet-set'
      ? 'In stock and ships the same day when ordered by 12 PM ET.' : delivery.production;
    const replacements = [
      [outdatedDelivery, `<p>${escapeHtml([production, delivery.transit, delivery.rates].join(' '))}</p>`],
      [outdatedExpress, `<p>${escapeHtml([production, delivery.transit, delivery.rates].join(' '))}</p>`],
      [outdatedProof, `<p>${escapeHtml(delivery.proof)}</p>`]
    ];
    let after = before;
    const edits = [];
    for (const [from, to] of replacements) {
      if (!after.includes(from)) continue;
      if (after.split(from).length !== 2) throw new Error(`Ambiguous repeated paragraph: ${product.handle}`);
      after = after.replace(from, to);
      edits.push({ from, to });
    }
    if (after !== before) changes.push({
      id: product.id, handle: product.handle, expectedUpdatedAt: product.updatedAt,
      expectedDescriptionSha256: hash(before), descriptionHtml: after, edits
    });
    const residual = [...after.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)]
      .map(match => match[0])
      .filter(text => /7[–-]20|2[–-]3 business|express engraving|photo.?proof|proof.?photo/i.test(text))
      .filter(text => !text.includes(escapeHtml(delivery.proof)));
    if (residual.length) needsReview.push({ handle: product.handle, paragraphs: residual });
  }
  return { apply: false, sourceCreatedAt: snapshot.createdAt, changes, needsReview };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [snapshotPath, outputPath = '.product-admin-work/delivery-copy-plan.json'] = process.argv.slice(2);
  if (!snapshotPath) throw new Error('Usage: node scripts/prepare-delivery-copy-plan.mjs <catalog-backup.json> [review-plan.json]');
  const snapshot = JSON.parse(await readFile(resolve(snapshotPath), 'utf8'));
  const locale = parseShopifyJson(await readFile(new URL('../locales/en.default.json', import.meta.url), 'utf8'));
  const plan = prepareDeliveryCopyPlan(snapshot, locale.delivery);
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), JSON.stringify(plan, null, 2) + '\n');
  console.log(JSON.stringify({ apply: false, outputPath: resolve(outputPath), products: plan.changes.map(p => p.handle), needsReview: plan.needsReview.map(p => p.handle) }, null, 2));
  console.log('Review only. Applying requires separate approval, a fresh drift check, and a pre-apply backup. No Shopify content was changed.');
}
