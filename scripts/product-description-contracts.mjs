import { createHash } from 'node:crypto';

export const stripHtml = (value = '') => value
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

const normalizedHtml = (value = '') => value.replace(/>\s+</g, '><').trim();

export function productContentFingerprint(product) {
  return createHash('sha256').update(JSON.stringify({
    descriptionHtml: normalizedHtml(product.descriptionHtml || ''),
    seoTitle: product.seoTitle ?? product.seo?.title ?? '',
    seoDescription: product.seoDescription ?? product.seo?.description ?? ''
  })).digest('hex');
}

export function buildProductDescriptionInput(id, update) {
  return {
    id,
    descriptionHtml: update.descriptionHtml,
    seo: { title: update.seoTitle, description: update.seoDescription }
  };
}

const forbiddenCopy = [
  /elevate your (?:style|look|wardrobe)/i,
  /timeless elegance/i,
  /more than just (?:a |an )?/i,
  /look no further/i,
  /must-have accessory/i,
  /there is no better way/i,
  /treasure (?:it|this|something) forever/i,
  /perfect accessory for/i,
  /whether you(?:'re| are) (?:looking|shopping|heading|dressing)/i,
  /having problems with our interactive map/i,
  /latlong\.net/i,
  /guaranteed photo proof|photo proof[^.]{0,60}before (?:your )?(?:order|gift|piece) ships?/i
];

export function validateProductDescriptionUpdate(update) {
  const errors = [];
  const html = update.descriptionHtml || '';
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).length : 0;
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  const listItemCount = (html.match(/<li\b/gi) || []).length;
  const paragraphCount = (html.match(/<p\b/gi) || []).length;
  const seoTitle = (update.seoTitle || '').trim();
  const seoDescription = (update.seoDescription || '').trim();

  if (!update.handle) errors.push('missing handle');
  if (!update.expectedUpdatedAt) errors.push('missing expectedUpdatedAt');
  if (seoTitle.length < 30 || seoTitle.length > 65) errors.push(`SEO title has ${seoTitle.length} characters; expected 30-65`);
  if (seoDescription.length < 110 || seoDescription.length > 165) errors.push(`SEO description has ${seoDescription.length} characters; expected 110-165`);
  if (words < 120 || words > 360) errors.push(`description has ${words} words; expected 120-360`);
  if (h2Count < 2 || h2Count > 4) errors.push(`description has ${h2Count} H2 elements; expected 2-4`);
  if (listItemCount < 3 || listItemCount > 10) errors.push(`description has ${listItemCount} list items; expected 3-10`);
  if (paragraphCount < 3) errors.push(`description has only ${paragraphCount} paragraphs`);
  if (/<h1\b/i.test(html)) errors.push('description contains an H1');
  if (/<meta\b|<font\b|data-mce-|style\s*=|class\s*=/i.test(html)) errors.push('description contains editor or presentation markup');
  if (/href=["']https?:\/\//i.test(html)) errors.push('description contains an external link');
  for (const pattern of forbiddenCopy) {
    if (pattern.test(text)) errors.push(`description contains forbidden copy pattern: ${pattern.source}`);
    if (pattern.test(seoDescription)) errors.push(`SEO description contains forbidden copy pattern: ${pattern.source}`);
  }

  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => stripHtml(match[1]));
  if (headings.some((heading) => heading.length > 8 && heading === heading.toUpperCase())) {
    errors.push('description contains an all-caps heading');
  }

  return { errors, metrics: { words, h2Count, listItemCount, paragraphCount } };
}

const sentences = (html) => stripHtml(html)
  .split(/(?<=[.!?])\s+/)
  .map((sentence) => sentence.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim())
  .filter((sentence) => sentence.split(' ').length >= 10);

export function validateDescriptionBatch(updates) {
  const errors = [];
  const seenSentences = new Map();
  const structuralSignatures = new Map();

  for (const update of updates) {
    for (const sentence of sentences(update.descriptionHtml)) {
      const priorHandle = seenSentences.get(sentence);
      if (priorHandle) errors.push(`${update.handle} repeats a long sentence from ${priorHandle}`);
      else seenSentences.set(sentence, update.handle);
    }

    const html = update.descriptionHtml || '';
    const signature = [
      (html.match(/<h2\b/gi) || []).length,
      (html.match(/<p\b/gi) || []).length,
      (html.match(/<li\b/gi) || []).length,
      (html.match(/<ol\b/gi) || []).length
    ].join('/');
    structuralSignatures.set(signature, [...(structuralSignatures.get(signature) || []), update.handle]);
  }

  for (const [signature, handles] of structuralSignatures) {
    if (handles.length > 3) errors.push(`structural signature ${signature} is repeated by ${handles.join(', ')}`);
  }

  return errors;
}
