import { createHash } from 'node:crypto';

const stripHtml = (value = '') => value
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

export function articleFingerprint(article) {
  return createHash('sha256').update(JSON.stringify({
    title: article.title,
    // Shopify inserts insignificant line breaks between nested HTML tags on save.
    // Collapse only inter-tag whitespace so text content remains byte-sensitive.
    body: (article.body || '').replace(/>\s+</g, '><').trim(),
    summary: article.summary,
    tags: article.tags
  })).digest('hex');
}

export function buildArticleInput(update) {
  const allowed = ['title', 'body', 'summary', 'tags'];
  return Object.fromEntries(allowed
    .filter((field) => Object.hasOwn(update, field))
    .map((field) => [field, update[field]]));
}

export function validateArticleUpdate(update) {
  const errors = [];
  const title = stripHtml(update.title || '');
  const summary = stripHtml(update.summary || '');
  const body = update.body || '';
  const bodyText = stripHtml(body);
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const h2Count = (body.match(/<h2\b/gi) || []).length;
  const commercialLinks = new Set([
    ...body.matchAll(/href=["'][^"']*\/(?:products|collections)\/[^"'#?]+/gi)
  ]).size;
  const relatedLinks = new Set([
    ...body.matchAll(/href=["'][^"']*\/blogs\/[^"'#?]+/gi)
  ]).size;

  if (!update.handle) errors.push('missing handle');
  if (!update.expectedUpdatedAt) errors.push('missing expectedUpdatedAt');
  if (title.length < 30 || title.length > 65) errors.push(`title length ${title.length} is outside 30-65`);
  if (summary.length < 110 || summary.length > 165) errors.push(`summary length ${summary.length} is outside 110-165`);
  if (wordCount < 700) errors.push(`body has only ${wordCount} words`);
  if (h2Count < 2) errors.push(`body has only ${h2Count} H2 elements`);
  if (commercialLinks < 1) errors.push('body has no product or collection link');
  if (relatedLinks < 1) errors.push('body has no related article link');
  if (/<h1\b/i.test(body)) errors.push('body contains an H1');
  if (/guaranteed photo proof|guarantee(?:d)?[^.]{0,40}photo proof|photo proof[^.]{0,50}before (?:your )?(?:order|gift|piece) ships?/i.test(bodyText)) {
    errors.push('body contains a photo-proof guarantee');
  }

  return { errors, metrics: { titleLength: title.length, summaryLength: summary.length, wordCount, h2Count, commercialLinks, relatedLinks } };
}
