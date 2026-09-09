import assert from 'node:assert/strict';
import test from 'node:test';
import { parseShopifyJson } from '../../scripts/shopify-json.mjs';

test('Shopify JSON accepts only the generated leading comment', () => {
  assert.deepEqual(parseShopifyJson('{"value":1}'), {value:1});
  assert.deepEqual(parseShopifyJson('/*\n * IMPORTANT: The contents of this file are auto-generated.\n */\n{"value":1}'), {value:1});
  for (const invalid of ['/* arbitrary */ {"value":1}', '{"value":/* comment */1}', '{"value":1,}']) {
    assert.throws(() => parseShopifyJson(invalid), SyntaxError);
  }
});
