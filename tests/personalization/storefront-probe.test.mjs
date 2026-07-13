import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertLiveContract,
  collectReleaseProbes,
  inspectProductHtml
} from '../../scripts/personalization/probe-storefront.mjs';

test('inspects release, contract, and unique line-item properties', () => {
  const html = `
    <section data-personalization-release="oc-order-safe-2026-07-13-1"
             data-personalization-contract="matching-necklaces">
      <input name="properties[Engraving - Necklace A]">
      <input name="properties[Engraving - Necklace B]">
      <input name="properties[Engraving - Necklace B]">
    </section>`;
  assert.deepEqual(inspectProductHtml(html), {
    release: 'oc-order-safe-2026-07-13-1',
    contract: 'matching-necklaces',
    properties: ['Engraving - Necklace A', 'Engraving - Necklace B']
  });
});

test('missing marker fails inspection', () => {
  assert.throws(() => inspectProductHtml('<main></main>'), /release marker/);
});

test('contract comparison rejects an extra public property', () => {
  assert.throws(
    () => assertLiveContract(
      { handle: 'gift', contract: 'none', properties: [] },
      { contract: 'none', properties: ['Engraving'] }
    ),
    /gift: expected no public properties, got Engraving/
  );
});

test('sequential release probes pause between cache-busted requests', async () => {
  const delays = [];
  let fetches = 0;
  const releases = await collectReleaseProbes({
    url: 'https://example.com/products/test',
    expectedRelease: 'release-1',
    count: 3,
    delayMs: 5,
    fetchInspectionFn: async () => {
      fetches += 1;
      return { release: 'release-1', contract: 'test', properties: [] };
    },
    wait: async (milliseconds) => delays.push(milliseconds)
  });
  assert.equal(fetches, 3);
  assert.deepEqual(delays, [5, 5]);
  assert.deepEqual(releases, ['release-1', 'release-1', 'release-1']);
});
