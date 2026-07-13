import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMutationVariables,
  commercialFingerprint,
  planAssignments,
  validateCatalogContract
} from '../../scripts/personalization/admin-contracts.mjs';

const manifest = {
  products: [
    { handle: 'gift', templateSuffix: 'non-custom', mutable: true },
    { handle: 'bar', templateSuffix: 'four-sided', mutable: false }
  ]
};

const products = [
  {
    id: 'gid://shopify/Product/1',
    handle: 'gift',
    templateSuffix: null,
    title: 'Gift',
    status: 'ACTIVE',
    publishedAt: '2026-01-01T00:00:00Z',
    onlineStoreUrl: 'https://example.com/products/gift',
    variants: { nodes: [], pageInfo: { hasNextPage: false } },
    media: { nodes: [], pageInfo: { hasNextPage: false } }
  },
  {
    id: 'gid://shopify/Product/2',
    handle: 'bar',
    templateSuffix: 'vertical-bar',
    title: 'Bar',
    status: 'ACTIVE',
    publishedAt: '2026-01-01T00:00:00Z',
    onlineStoreUrl: 'https://example.com/products/bar',
    variants: { nodes: [], pageInfo: { hasNextPage: false } },
    media: { nodes: [], pageInfo: { hasNextPage: false } }
  }
];

test('mutation variables contain only id and templateSuffix', () => {
  assert.deepEqual(buildMutationVariables('gid://shopify/Product/1', 'non-custom'), {
    product: { id: 'gid://shopify/Product/1', templateSuffix: 'non-custom' }
  });
});

test('plan excludes immutable products and reports their mismatch', () => {
  const plan = planAssignments(manifest, products);
  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0].handle, 'gift');
  assert.deepEqual(plan.verificationMismatches, [
    { handle: 'bar', expected: 'four-sided', actual: 'vertical-bar' }
  ]);
});

test('commercial fingerprint ignores template suffix but catches catalog drift', () => {
  const first = commercialFingerprint(products[0]);
  const templateOnly = commercialFingerprint({ ...products[0], templateSuffix: 'non-custom' });
  const repriced = commercialFingerprint({
    ...products[0],
    variants: {
      nodes: [{
        id: 'v1',
        title: 'Default',
        price: '9.99',
        compareAtPrice: null,
        media: { nodes: [], pageInfo: { hasNextPage: false } }
      }],
      pageInfo: { hasNextPage: false }
    }
  });
  assert.equal(first, templateOnly);
  assert.notEqual(first, repriced);
});

test('commercial fingerprint fails closed on incomplete nested media pagination', () => {
  assert.throws(
    () => commercialFingerprint({
      ...products[0],
      variants: {
        nodes: [{
          id: 'v1',
          title: 'Default',
          price: '9.99',
          compareAtPrice: null,
          media: { nodes: [], pageInfo: { hasNextPage: true } }
        }],
        pageInfo: { hasNextPage: false }
      }
    }),
    /Variant media pagination incomplete/
  );
});

test('dynamic catalog values fail closed when they leave the approved contract', () => {
  const item = { handle: 'chain-link-necklace-custom-charms' };
  const valid = {
    variants: {
      nodes: [
        { selectedOptions: [{ name: 'Names', value: '2 names' }] },
        { selectedOptions: [{ name: 'Names', value: '8 names' }] }
      ]
    }
  };
  assert.doesNotThrow(() => validateCatalogContract(item, valid));
  assert.throws(
    () => validateCatalogContract(item, {
      variants: { nodes: [{ selectedOptions: [{ name: 'Names', value: '9 names' }] }] }
    }),
    /Unsupported Names option/
  );
});
