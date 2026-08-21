import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const productSection = read('sections/main-product.liquid');
const announcementBar = read('sections/announcement-bar.liquid');

test('magnetic bracelet set advertises its in-stock same-day shipping cutoff', () => {
  assert.match(
    productSection,
    /product\.handle == 'magnetic-couples-bracelet-set'[\s\S]*?assign same_day_shipping = true[\s\S]*?assign prod_seconds = 0/
  );
  assert.match(
    productSection,
    /In stock &mdash; order by 12 PM ET for same-day shipping,/
  );
  assert.match(
    productSection,
    /In stock and ships the same day when ordered by 12 PM ET\./
  );
  assert.match(
    announcementBar,
    /product\.handle == 'magnetic-couples-bracelet-set'[\s\S]*?Order by 12 PM ET for same-day shipping/
  );
});

test('other products retain the global production lead time', () => {
  assert.match(productSection, /assign prod_seconds = settings\.production_days \| times: 86400/);
  assert.match(productSection, /ships in \{\{ settings\.production_days \}\} business days/);
  assert.match(productSection, /Ships within \{\{ settings\.production_days \}\} business days/);
  assert.match(announcementBar, /Ships in \{\{ settings\.production_days \}\} business days/);
});
