const assert = require('node:assert/strict');
const test = require('node:test');
const api = require('../../assets/personalization-dynamic.js');

test('shared matching engraving copies A to B', () => {
  assert.deepEqual(api.resolveMatchingProperties('27.7676 N', 'old', false), {
    a: '27.7676 N',
    b: '27.7676 N'
  });
});

test('separate matching engraving preserves both values', () => {
  assert.deepEqual(api.resolveMatchingProperties('A', 'B', true), { a: 'A', b: 'B' });
});
