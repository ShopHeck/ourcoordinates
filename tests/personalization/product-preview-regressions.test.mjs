import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('star-map astronomy is isolated to a conditionally loaded product asset', () => {
  const section = read('sections/main-product.liquid');
  const global = read('assets/global.js');

  assert.doesNotMatch(global, /Math\.round\(loc\.lng\s*\/\s*15\)/);
  assert.doesNotMatch(global, /STAR MAP — the real night sky/);
  assert.match(
    section,
    /if preview_type == 'star-map'[\s\S]*astronomy-engine\.min\.js[\s\S]*tz-lookup\.min\.js[\s\S]*star-map\.js[\s\S]*endif/
  );
});

test('star-map form preserves the exact calculated moment for fulfillment', () => {
  const snippet = read('snippets/pdp-preview-star-map.liquid');

  assert.match(snippet, /data-sm-status/);
  assert.match(snippet, /data-sm-timezone[^>]*name="properties\[_Star Map Time Zone\]"/);
  assert.match(snippet, /data-sm-utc[^>]*name="properties\[_Star Map UTC\]"/);
  assert.match(snippet, /data-sm-input-location[^>]*aria-describedby="sm-location-help sm-status"/);
});

test('interlocking ring metal is controlled only by the selected variant', () => {
  const snippet = read('snippets/pdp-preview-interlocking-circles.liquid');
  const critical = read('snippets/critical-css.liquid');
  const section = read('sections/main-product.liquid');

  assert.doesNotMatch(snippet, /ep__ring-band"\s+style=/);
  assert.match(critical, /\[data-metal=gold\] \.ep__ring-band\{stroke:url\(#ep-metal-gold\)\}/);
  assert.match(critical, /\[data-metal=silver\] \.ep__ring-band\{stroke:url\(#ep-metal-silver\)\}/);
  assert.match(section, /variant_options_text[\s\S]*data-metal="\{\{ initial_metal \}\}"/);
});

test('theme provides a favicon when no merchant favicon is configured', () => {
  const layout = read('layout/theme.liquid');
  assert.match(layout, /if settings\.favicon != blank[\s\S]*else[\s\S]*ourcoordinates-logo-mark\.svg[\s\S]*endif/);
});

test('mobile header moves its duplicate CTA into the menu without horizontal overflow', () => {
  const critical = read('snippets/critical-css.liquid');
  const header = read('sections/header.liquid');

  assert.match(critical, /@media \(max-width:860px\)[\s\S]*\.site-header__cta\{display:none\}/);
  assert.match(header, /@media \(max-width: 860px\)[\s\S]*\.site-header__cta \{ display: none; \}/);
  assert.match(header, /site-nav__mobile-cta/);
});

test('star-map runtime converts local civil time with daylight-saving rules', () => {
  const runtimePath = join(ROOT, 'assets/star-map.js');
  assert.ok(existsSync(runtimePath), 'assets/star-map.js must exist');
  const require = createRequire(import.meta.url);
  const sky = require(runtimePath);

  assert.equal(
    sky.zonedLocalTimeToUtc('2024-07-04', '21:00', 'America/New_York').toISOString(),
    '2024-07-05T01:00:00.000Z'
  );
  assert.equal(
    sky.zonedLocalTimeToUtc('2024-01-04', '21:00', 'America/New_York').toISOString(),
    '2024-01-05T02:00:00.000Z'
  );
});

test('star-map runtime accepts exact coordinates and rejects place-name guesses', () => {
  const require = createRequire(import.meta.url);
  const sky = require(join(ROOT, 'assets/star-map.js'));

  assert.deepEqual(sky.parseCoordinates('40.7128\u00b0 N, 74.0060\u00b0 W'), { lat: 40.7128, lng: -74.006 });
  assert.deepEqual(sky.parseCoordinates('33.8688 S, 151.2093 E'), { lat: -33.8688, lng: 151.2093 });
  assert.equal(sky.parseCoordinates('New York, NY'), null);
});

test('manual star-map location edits invalidate coordinates chosen by the finder', () => {
  const runtime = read('assets/star-map.js');

  assert.match(runtime, /event\.target === locationInput && !locationInput\.dataset\.fromLocator/);
  assert.match(runtime, /function clearPinnedLocation\(\)[\s\S]*exactCoordinates\.value = ''/);
  assert.match(runtime, /function clearPinnedLocation\(\)[\s\S]*searchedPlace\.value = ''/);
  assert.match(runtime, /function clearPinnedLocation\(\)[\s\S]*verificationMap\.value = ''/);
});

test('star-map runtime projects Polaris near the observer latitude', () => {
  const runtimePath = join(ROOT, 'assets/star-map.js');
  assert.ok(existsSync(runtimePath), 'assets/star-map.js must exist');
  const require = createRequire(import.meta.url);
  const sky = require(runtimePath);
  const moment = sky.zonedLocalTimeToUtc('2024-07-04', '21:00', 'America/New_York');
  const projected = sky.projectSky(moment, 40.7128, -74.0060);
  const polaris = projected.find((star) => star.id === 'polaris');

  assert.ok(polaris);
  assert.ok(Math.abs(polaris.altitude - 40.7128) < 1, `unexpected Polaris altitude: ${polaris.altitude}`);
  assert.ok(polaris.azimuth < 2 || polaris.azimuth > 358, `unexpected Polaris azimuth: ${polaris.azimuth}`);
});

test('constellation label anchors use catalog right ascension in degrees', () => {
  const require = createRequire(import.meta.url);
  const catalog = require(join(ROOT, 'assets/star-map-catalog.js'));
  const orion = catalog.constellations.find((item) => item.id === 'Ori');
  const sagittarius = catalog.constellations.find((item) => item.id === 'Sgr');

  assert.ok(orion.label[0] > 80 && orion.label[0] < 90, `unexpected Orion RA: ${orion.label[0]}`);
  assert.ok(sagittarius.label[0] > 285 && sagittarius.label[0] < 300, `unexpected Sagittarius RA: ${sagittarius.label[0]}`);
});
