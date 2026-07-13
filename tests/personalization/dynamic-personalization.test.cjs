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

test('couple rings preserve both engravings and both size/style values', () => {
  assert.deepEqual(api.resolveRingProperties('ALWAYS', 'FOREVER', '10 / Man', '7 / Woman'), {
    engraving1: 'ALWAYS',
    engraving2: 'FOREVER',
    ring1: '10 / Man',
    ring2: '7 / Woman'
  });
});
