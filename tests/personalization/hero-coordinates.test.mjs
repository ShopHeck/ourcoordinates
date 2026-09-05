import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const hero = readFileSync(new URL('../../sections/atelier-hero.liquid', import.meta.url), 'utf8');
const coordinates = '48.8584° N, 2.2945° E';
function runAnimation(reduced) {
  const text = { textContent: coordinates };
  const line = { style: {}, getTotalLength: () => 512 };
  const spark = { setAttribute() {} };
  const timers = [];
  const intervals = new Map();
  let nextId = 0;
  const script = hero.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace('{{ s.etch_text | json }}', JSON.stringify(coordinates));
  vm.runInNewContext(script, {
    document: { getElementById: () => ({ querySelector: selector => ({ '.ah-etch-text': text, '.ah-etch-line': line, '.ah-spark': spark, '.ah-spark-halo': spark })[selector] }) },
    window: { matchMedia: () => ({ matches: reduced }) },
    setTimeout: fn => timers.push(fn),
    setInterval: fn => { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id)
  });
  return { text, line, timers, intervals };
}

test('hero coordinates restore once without moving the reserved SVG box', () => {
  const run = runAnimation(false);
  assert.equal(run.text.textContent, '');
  run.timers.shift()();
  for (let i = 0; i < coordinates.length; i++) [...run.intervals.values()].forEach(fn => fn());
  assert.equal(run.text.textContent, coordinates);
  assert.equal(run.line.style.strokeDashoffset, 0);
  assert.equal(run.intervals.size, 0);
  assert.match(hero, /viewBox="0 0 520 54"/);
  assert.match(hero, /\.ah-etch\{margin-top:12px;max-width:360px\}/);
});

test('reduced motion and no-JavaScript customers receive static coordinates', () => {
  const run = runAnimation(true);
  assert.equal(run.text.textContent, coordinates);
  assert.equal(run.timers.length, 0);
  assert.equal(run.intervals.size, 0);
  assert.match(hero, /class="ah-etch-text"[^>]*>\{\{ s\.etch_text \| escape \}\}<\/text>/);
  assert.match(hero, /if s\.etch_caption != blank/);
});
