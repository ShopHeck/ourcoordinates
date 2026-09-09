const test = require('node:test');
const assert = require('node:assert/strict');
const { countCharacters, validateName } = require('../../assets/bubble-necklace.js');

test('name counting preserves symbols, spaces and Unicode; trims only outer whitespace', () => {
  assert.equal(countCharacters('K&Y'), 3);
  assert.equal(countCharacters('LAUREN'), 6);
  assert.equal(countCharacters('  ANNA MARIE  '), 10);
  assert.equal(countCharacters('ÉVA'), 3);
});
test('name must fit the selected letter-count variant', () => {
  assert.equal(validateName('K&Y', '3-4 Letters'), '');
  assert.equal(validateName('LAUREN', '5-6 Letters'), '');
  assert.match(validateName('LAUREN', '1-2 Letters'), /6 characters/);
  assert.match(validateName('A', '3-4 Letters'), /1 character/);
  assert.match(validateName(' ', '1-2 Letters'), /Enter/);
  assert.match(validateName('ABCDEFGHIJKLMNO', '13-14 Letters'), /14/);
  assert.match(validateName('LAUREN', 'unknown'), /Choose/);
});
test('all seven variant bands accept their boundaries and reject neighbors', () => {
  for (let min=1;min<=13;min+=2) {
    const range=`${min}-${min+1} Letters`;
    assert.equal(validateName('A'.repeat(min), range), '');
    assert.equal(validateName('A'.repeat(min+1), range), '');
    assert.notEqual(validateName('A'.repeat(min+2), range), '');
    if (min>1) assert.notEqual(validateName('A'.repeat(min-1), range), '');
  }
});
