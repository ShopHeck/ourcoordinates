import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const STORE_URL = 'https://ourcoordinates.com';
const auditBaseUrl = (process.env.BLOG_AUDIT_BASE_URL || STORE_URL).replace(/\/$/, '');
const BLOG_SITEMAP_URL = `${auditBaseUrl}/sitemap_blogs_1.xml`;
const DEFAULT_OUTPUT = 'docs/blog-content-quality-audit-2026-08-24.md';
const outputPath = resolve(process.argv[2] || DEFAULT_OUTPUT);
const cachePath = resolve('.blog-audit-cache/article-results.json');
const targetManifestPaths = [
  resolve('scripts/blog-content-targets.json'),
  resolve('scripts/blog-content-wave-two-targets.json')
];
const remediatedHandles = new Set(targetManifestPaths
  .filter((path) => existsSync(path))
  .flatMap((path) => JSON.parse(readFileSync(path, 'utf8')).articles));
const requestDelay = Number.parseInt(process.env.BLOG_AUDIT_DELAY_MS || '500', 10);
const refreshCache = process.env.BLOG_AUDIT_REFRESH === '1';
const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

const decodeHtml = (value = '') => value
  .replace(/&amp;/gi, '&')
  .replace(/&amp;/gi, '&')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&ndash;/gi, '–')
  .replace(/&mdash;/gi, '—')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>');

const cleanText = (value = '') => decodeHtml(value)
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const extract = (html, expression) => cleanText(html.match(expression)?.[1] || '');
const count = (html, expression) => (html.match(expression) || []).length;
const normalizeUrl = (url) => url.replace(/[?#].*$/, '').replace(/\/$/, '');
const markdownCell = (value) => String(value).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();

async function fetchHtml(url) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; OurCoordinatesContentAudit/1.0; +https://ourcoordinates.com)'
  };

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, { headers, redirect: 'follow' });
    const html = await response.text();
    const challenged = response.status === 429 || /<title>\s*Verifying your connection/i.test(html);
    if (!challenged) return { response, html };
    if (attempt < 6) await wait(attempt * 5000);
  }

  throw new Error(`Shopify rate-limited ${url} after six retries`);
}

function auditArticle(url, response, html) {
  const mainHtml = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const articleBodyHtml = mainHtml.match(
    /<!-- article-audit-content:start -->([\s\S]*?)<!-- article-audit-content:end -->/i
  )?.[1] || mainHtml;
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extract(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  ) || extract(
    html,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i
  );
  const descriptionTag = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0]
    || html.match(/<meta[^>]+content=["'][^"']*["'][^>]+name=["']description["'][^>]*>/i)?.[0]
    || '';
  const canonical = extract(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
  ) || extract(
    html,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i
  );
  const publishedAt = extract(
    html,
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ) || extract(html, /"datePublished"\s*:\s*"([^"]+)"/i)
    || extract(html, /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
  const bodyText = cleanText(articleBodyHtml);
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const h1Count = count(mainHtml, /<h1\b/gi);
  const h2Count = count(articleBodyHtml, /<h2\b/gi);
  const imageTags = [...articleBodyHtml.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const missingAltCount = imageTags.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag)).length;
  const productLinks = new Set([...articleBodyHtml.matchAll(/href=["']([^"']*\/products\/[^"'#?]+)/gi)]
    .map((match) => normalizeUrl(new URL(match[1], STORE_URL).href)));
  const collectionLinks = new Set([...articleBodyHtml.matchAll(/href=["']([^"']*\/collections\/[^"'#?]+)/gi)]
    .map((match) => normalizeUrl(new URL(match[1], STORE_URL).href)));
  const articleLinks = new Set([...articleBodyHtml.matchAll(/href=["']([^"']*\/blogs\/[^"'#?]+)/gi)]
    .map((match) => normalizeUrl(new URL(match[1], STORE_URL).href))
    .filter((link) => link !== normalizeUrl(url)));
  const articleSchema = /"@type"\s*:\s*"(?:Article|BlogPosting)"/i.test(html);
  const canonicalMatches = normalizeUrl(canonical) === normalizeUrl(url);

  const issues = [];
  const addIssue = (severity, label, penalty) => issues.push({ severity, label, penalty });

  if (response.status !== 200) addIssue('critical', `HTTP ${response.status}`, 50);
  if (!canonical) addIssue('critical', 'missing canonical', 30);
  else if (!canonicalMatches) addIssue('critical', 'canonical points elsewhere', 30);
  if (h1Count !== 1) addIssue('high', `${h1Count} H1 elements`, 20);
  if (!articleSchema) addIssue('high', 'missing Article schema', 15);
  if (!description) addIssue('high', 'missing meta description', 20);
  else if (/&amp;(?:#\d+|#x[\da-f]+|quot|apos|amp);/i.test(descriptionTag)) {
    addIssue('medium', 'double-encoded meta description', 6);
  }
  else if (description.length < 110) addIssue('medium', `short meta (${description.length})`, 6);
  else if (description.length > 165) addIssue('medium', `long meta (${description.length})`, 6);
  if (!title) addIssue('high', 'missing title', 20);
  else if (title.length < 30) addIssue('medium', `short title (${title.length})`, 5);
  else if (title.length > 65) addIssue('medium', `long title (${title.length})`, 5);
  if (wordCount < 400) addIssue('high', `thin content (${wordCount} words)`, 20);
  else if (wordCount < 700) addIssue('medium', `light content (${wordCount} words)`, 8);
  if (h2Count === 0) addIssue('high', 'no H2 structure', 15);
  else if (h2Count < 2) addIssue('medium', 'only one H2', 5);
  if (productLinks.size + collectionLinks.size === 0) addIssue('high', 'no commercial internal link', 15);
  if (articleLinks.size === 0) addIssue('medium', 'no related-article link', 7);
  if (missingAltCount > 0) addIssue('medium', `${missingAltCount} image alt gap${missingAltCount === 1 ? '' : 's'}`, 4);
  if (!publishedAt) addIssue('low', 'publication date not exposed', 2);

  return {
    url,
    slug: new URL(url).pathname.split('/').filter(Boolean).at(-1),
    status: response.status,
    title,
    titleLength: title.length,
    description,
    descriptionLength: description.length,
    canonical,
    canonicalMatches,
    publishedAt,
    wordCount,
    h1Count,
    h2Count,
    imageCount: imageTags.length,
    missingAltCount,
    productLinkCount: productLinks.size,
    collectionLinkCount: collectionLinks.size,
    articleLinkCount: articleLinks.size,
    articleSchema,
    issues,
    score: Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.penalty, 0))
  };
}

function applyDuplicateIssues(results, field, label) {
  const groups = new Map();
  for (const result of results) {
    if (!result[field]) continue;
    const normalized = result[field].toLowerCase().replace(/\s+/g, ' ').trim();
    groups.set(normalized, [...(groups.get(normalized) || []), result]);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const result of group) {
      result.issues.push({ severity: 'high', label, penalty: 15 });
      result.score = Math.max(0, result.score - 15);
    }
  }
}

function priorityFor(result) {
  if (result.issues.some((issue) => issue.severity === 'critical')) return 'Critical';
  if (result.issues.some((issue) => issue.severity === 'high') || result.score < 60) return 'High';
  if (result.issues.some((issue) => issue.severity === 'medium') || result.score < 85) return 'Medium';
  return 'Low';
}

function buildReport(results, landingPageCount) {
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  for (const result of results) result.priority = priorityFor(result);
  results.sort((left, right) => (
    priorityOrder[left.priority] - priorityOrder[right.priority]
    || left.score - right.score
    || left.title.localeCompare(right.title)
  ));

  const priorityCounts = Object.fromEntries(['Critical', 'High', 'Medium', 'Low']
    .map((priority) => [priority, results.filter((result) => result.priority === priority).length]));
  const issueCounts = new Map();
  for (const result of results) {
    for (const issue of result.issues) {
      const groupedLabel = issue.label
        .replace(/ \(\d+ words\)$/, '')
        .replace(/ \(\d+\)$/, '')
        .replace(/^\d+ image alt gaps?$/, 'image alt gaps');
      issueCounts.set(groupedLabel, (issueCounts.get(groupedLabel) || 0) + 1);
    }
  }
  const commonIssues = [...issueCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12);
  const averageWords = Math.round(results.reduce((sum, result) => sum + result.wordCount, 0) / results.length);
  const averageScore = Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length);
  const auditedAt = new Date().toISOString();
  const remediatedResults = results.filter((result) => remediatedHandles.has(result.slug));
  const remediatedClean = remediatedResults.filter((result) => result.score === 100 && result.issues.length === 0).length;
  const onlyEncodingIssues = results.some((result) => result.issues.length > 0)
    && results.every((result) => result.issues.every((issue) => issue.label === 'double-encoded meta description'));
  const reviewOrder = onlyEncodingIssues
    ? [
      '1. Deploy the theme metadata normalization and refresh the public audit to confirm the encoded descriptions are gone.',
      '2. Verify a representative article in rendered HTML and a browser, including its title, description, canonical, headings, links, and mobile layout.',
      '3. Continue the manual editorial phase by business priority: search intent, factual freshness, first-hand usefulness, unsupported claims, and conversion alignment.',
      '4. Revisit search performance after the revised pages have had time to be crawled; use impressions, click-through rate, and conversions to prioritize later rewrites.'
    ]
    : [
      '1. Fix critical indexing, canonical, heading, or schema failures.',
      '2. Rewrite high-priority thin articles and add a relevant product or collection path.',
      '3. Build topic clusters by linking each article to at least one related article and one commercial destination.',
      '4. Tighten titles and descriptions after content intent is confirmed; do not optimize snippets before weak content is rewritten.',
      '5. Manually review the highest-priority group for accuracy, first-hand usefulness, unsupported claims, dated information, and alignment with the OurCoordinates brand story.'
    ];

  const lines = [
    '# OurCoordinates Blog Content Quality Audit',
    '',
    `Audited ${results.length} storefront-rendered article pages on ${auditedAt}.`,
    '',
    '## Executive summary',
    '',
    `- Average automated quality score: **${averageScore}/100**`,
    `- Average article length: **${averageWords} words**`,
    `- Priority mix: **${priorityCounts.Critical} critical**, **${priorityCounts.High} high**, **${priorityCounts.Medium} medium**, **${priorityCounts.Low} low**`,
    `- Articles with a product or collection link: **${results.filter((result) => result.productLinkCount + result.collectionLinkCount > 0).length}/${results.length}**`,
    `- Articles with a related-article link: **${results.filter((result) => result.articleLinkCount > 0).length}/${results.length}**`,
    `- Articles with valid Article structured data: **${results.filter((result) => result.articleSchema).length}/${results.length}**`,
    `- Priority remediation batch with no automated gaps: **${remediatedClean}/${remediatedResults.length}**`,
    `- Blog landing pages excluded from article scoring: **${landingPageCount}**`,
    '',
    'This is the first-pass, page-by-page technical and structural audit. Article-body word counts, headings, images, and internal links intentionally exclude reusable template modules such as related reading and shopping paths. It identifies which articles deserve manual editorial review first; it does not claim to judge factual accuracy, originality, search demand, backlinks, or conversion performance from HTML alone.',
    '',
    '## Most common findings',
    '',
    '| Finding | Articles |',
    '|---|---:|',
    ...commonIssues.map(([issue, issueCount]) => `| ${markdownCell(issue)} | ${issueCount} |`),
    '',
    '## Recommended review order',
    '',
    ...reviewOrder,
    '',
    '## Page-by-page inventory',
    '',
    '| Priority | Score | Article | Words | H2 | Product / collection links | Related article links | Metadata | Issues |',
    '|---|---:|---|---:|---:|---:|---:|---|---|',
    ...results.map((result) => {
      const metadata = `${result.titleLength} title / ${result.descriptionLength} description`;
      const issueText = result.issues.length ? result.issues.map((issue) => issue.label).join('; ') : 'No automated gaps';
      return `| ${result.priority} | ${result.score} | [${markdownCell(result.title || result.slug)}](${result.url}) | ${result.wordCount} | ${result.h2Count} | ${result.productLinkCount + result.collectionLinkCount} | ${result.articleLinkCount} | ${metadata} | ${markdownCell(issueText)} |`;
    }),
    '',
    '## Audit rules',
    '',
    '- Critical: non-200 response, missing canonical, or canonical pointing elsewhere.',
    '- High: heading/schema failure, missing title or description, fewer than 400 words, no H2 structure, duplicate snippets, or no commercial internal path.',
    '- Medium: 400–699 words, weak heading depth, title/description length outside the review range, no related-article link, or image-alt gaps.',
    '- Low: no automated structural gap or only a minor metadata signal.',
    '- Metadata length flags are review prompts, not automatic rewrite orders. Search engines may display different snippets.',
    '',
    '## Next manual phase',
    '',
    onlyEncodingIssues
      ? 'Once the metadata normalization is live and verified, the automated structural backlog is clear. The next phase is a manual content-quality review ordered by commercial opportunity and search performance, with special attention to dated travel guidance and unsupported superlatives.'
      : 'Begin with the first 15 High-priority articles in this report. For each one, confirm search intent, update or remove unsupported claims, add first-hand OurCoordinates expertise, improve the opening answer, strengthen headings, and connect the article to the most relevant product, collection, and related guide.'
  ];

  return `${lines.join('\n')}\n`;
}

const sitemapResponse = await fetch(BLOG_SITEMAP_URL, {
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; OurCoordinatesContentAudit/1.0)' }
});
if (!sitemapResponse.ok) throw new Error(`Blog sitemap returned ${sitemapResponse.status}`);
const sitemapXml = await sitemapResponse.text();
const blogUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/[^<]+\/blogs\/[^<]+)<\/loc>/g)]
  .map((match) => `${STORE_URL}${new URL(decodeHtml(match[1])).pathname}`)
const articleUrls = blogUrls.filter((url) => new URL(url).pathname.split('/').filter(Boolean).length > 2);
const landingPageCount = blogUrls.length - articleUrls.length;

const results = [];
const cachedResults = !refreshCache && existsSync(cachePath)
  ? JSON.parse(readFileSync(cachePath, 'utf8'))
  : {};
for (const [index, url] of articleUrls.entries()) {
  if (cachedResults[url]) {
    results.push(cachedResults[url]);
    continue;
  }

  const fetchUrl = `${auditBaseUrl}${new URL(url).pathname}`;
  const { response, html } = await fetchHtml(fetchUrl);
  const result = auditArticle(url, response, html);
  results.push(result);
  cachedResults[url] = result;
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify(cachedResults, null, 2)}\n`);
  if (index < articleUrls.length - 1) await wait(requestDelay);
}

applyDuplicateIssues(results, 'title', 'duplicate title');
applyDuplicateIssues(results, 'description', 'duplicate meta description');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buildReport(results, landingPageCount));

const priorityCounts = Object.fromEntries(['Critical', 'High', 'Medium', 'Low']
  .map((priority) => [priority, results.filter((result) => priorityFor(result) === priority).length]));
console.log(JSON.stringify({ outputPath, articles: results.length, priorityCounts }, null, 2));
