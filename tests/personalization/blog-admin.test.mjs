import assert from 'node:assert/strict';
import test from 'node:test';
import { articleFingerprint, buildArticleInput, validateArticleUpdate } from '../../scripts/blog-admin-contracts.mjs';

const body = `
  <p>${'A useful sentence about meaningful travel and personalized gifts. '.repeat(85)}</p>
  <h2>Choose the place</h2>
  <p><a href="/collections/all">Shop coordinates jewelry</a></p>
  <h2>Keep the story</h2>
  <p><a href="/blogs/travel-tips/how-to-order">Read the ordering guide</a></p>
`;

test('blog update validation enforces useful structure and safe claims', () => {
  const valid = validateArticleUpdate({
    handle: 'example',
    expectedUpdatedAt: '2026-08-24T00:00:00Z',
    title: 'A Complete Guide to Meaningful Coordinates Gifts',
    summary: 'Learn how to choose a meaningful place, find its coordinates, and turn the story into personalized jewelry with practical ordering guidance.',
    body
  });
  assert.deepEqual(valid.errors, []);

  const invalid = validateArticleUpdate({
    handle: 'example',
    expectedUpdatedAt: '2026-08-24T00:00:00Z',
    title: 'Too short',
    summary: 'Too short',
    body: '<h1>Duplicate</h1><p>Guaranteed photo proof before your order ships.</p>'
  });
  assert.ok(invalid.errors.some((error) => error.includes('H1')));
  assert.ok(invalid.errors.some((error) => error.includes('photo-proof guarantee')));
  assert.ok(invalid.errors.some((error) => error.includes('product or collection link')));
});

test('blog mutations whitelist content fields and produce stable fingerprints', () => {
  const update = {
    id: 'ignored',
    handle: 'example',
    expectedUpdatedAt: 'ignored',
    title: 'Example title',
    body: '<p>Example</p>',
    summary: 'Example summary',
    tags: ['Guide']
  };
  assert.deepEqual(buildArticleInput(update), {
    title: update.title,
    body: update.body,
    summary: update.summary,
    tags: update.tags
  });
  assert.equal(articleFingerprint(update), articleFingerprint({ ...update }));
  assert.equal(
    articleFingerprint({ ...update, body: '<ul><li><strong>Place</strong></li></ul>' }),
    articleFingerprint({ ...update, body: '<ul>\n<li>\n<strong>Place</strong>\n</li>\n</ul>' })
  );
  assert.notEqual(articleFingerprint(update), articleFingerprint({ ...update, body: '<p>Changed</p>' }));
});
