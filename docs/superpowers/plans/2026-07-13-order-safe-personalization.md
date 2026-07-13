# Order-Safe Product Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish dedicated, order-safe Shopify product templates for the approved products, preserve the catalog, and update only verified template assignments after propagation and rollback checks pass.

**Architecture:** Alternate JSON product templates configure the existing shared `main-product` section, which dispatches to focused Liquid/SVG snippets. Native line-item properties remain inside Shopify's product form; a dependency-free deferred asset enhances only the three dynamic contracts. Version-controlled Node tests, a manifest-driven Admin API tool, and a storefront probe enforce the release contract.

**Tech Stack:** Shopify Online Store 2.0 JSON templates, Liquid, SVG/CSS, native browser JavaScript, Node.js 22 built-ins (`node:test`, `fetch`, `crypto`), Shopify GraphQL Admin API `2026-07`, Shopify CLI Theme Check, GitHub Actions.

## Global Constraints

- Do not modify `templates/product.four-sided.json` or `snippets/pdp-preview-four-sided.liquid`; their SHA-256 baselines are `a94096c080f0c78b75d894b73e12922fd5488af853130f775b47b7c3930dee74` and `c1f30f2a7e1aaa0eaa566c1caae248169931aaff4d04cd217985e506a66f0527`.
- Do not add, delete, rename, reprice, enable, disable, or restock variants.
- Do not change inventory, media, descriptions, handles, tags, titles, or publication state.
- Product mutations may contain only `id` and `templateSuffix`.
- Use native `properties[...]` inputs inside `{% form 'product' %}`.
- Use no storefront framework or third-party personalization dependency.
- Keep `assets/personalization-dynamic.js` at or below 16,384 bytes unminified.
- Keep new scoped CSS below 8,192 bytes on any one product page.
- Load the new deferred asset only for `matching-necklaces`, `couple-rings`, and `charm-name-necklace`.
- Preserve the current 50-character schema-option-label guard and the requirement that `{% endschema %}` ends every section file.
- Require 20 consecutive uncached responses with release `oc-order-safe-2026-07-13-1` before any product assignment mutation.
- Treat the current sold-out state as catalog truth. Live cart mutation is required only for products with an available variant; sold-out contracts use browser form-serialization verification.
- `custom-bar-necklace` is verification-only in the approved scope. Current live probes show `vertical-bar`; the assignment preflight must report this mismatch and stop before applying other assignments.
- `SHOPIFY_ADMIN_ACCESS_TOKEN` and `SHOPIFY_STORE` are currently unavailable in the environment. Theme publication can proceed through GitHub sync; catalog assignment waits for authenticated Admin access.

## File Map

- `scripts/personalization/product-contracts.json`: handle-to-template/property manifest and release version.
- `tests/personalization/theme-contracts.test.mjs`: static Liquid, JSON-template, baseline-hash, conditional-loading, and asset-budget tests.
- `assets/personalization-dynamic.js`: IIFE-scoped matching-necklace, couple-ring, and charm-count enhancement; CommonJS export only under Node tests.
- `tests/personalization/dynamic-personalization.test.cjs`: unit tests against the actual browser asset.
- `snippets/pdp-preview-*.liquid`: one focused renderer and native property contract per product family.
- `templates/product.*.json`: dedicated alternate templates.
- `sections/main-product.liquid`: release marker, renderer dispatch, schema options, and conditional deferred asset include.
- `scripts/personalization/admin-contracts.mjs`: pure assignment planning, mutation construction, and commercial-fingerprint functions.
- `scripts/personalization/assign-templates.mjs`: dry-run/apply/rollback CLI for Shopify Admin.
- `tests/personalization/admin-assignments.test.mjs`: mutation allowlist and drift-protection tests.
- `scripts/personalization/probe-storefront.mjs`: uncached release and live-contract verifier.
- `tests/personalization/storefront-probe.test.mjs`: HTML inspection and mixed-release tests.
- `.github/workflows/theme-ci.yml`: Node personalization checks before Theme Check.
- `.gitignore`: local rollback snapshots.
- `docs/deployment.md`: exact release, assignment, and rollback commands.

---

### Task 1: Contract Manifest, Immutable Baseline, and Release Marker

**Files:**
- Create: `scripts/personalization/product-contracts.json`
- Create: `tests/personalization/theme-contracts.test.mjs`
- Modify: `sections/main-product.liquid:1-12`

**Interfaces:**
- Consumes: existing alternate-template settings and four-sided files.
- Produces: manifest shape `{ release, products[] }`, `byHandle` test map, and the rendered `data-personalization-release` / `data-personalization-contract` attributes used by all subsequent tasks.

- [ ] **Step 1: Write the failing manifest and baseline tests**

Create `tests/personalization/theme-contracts.test.mjs`:

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const sha256 = (path) => createHash('sha256').update(read(path)).digest('hex');
const manifest = json('scripts/personalization/product-contracts.json');
const byHandle = new Map(manifest.products.map((item) => [item.handle, item]));

test('manifest has one unique, versioned contract per approved handle', () => {
  assert.equal(manifest.release, 'oc-order-safe-2026-07-13-1');
  assert.equal(manifest.products.length, 10);
  assert.equal(byHandle.size, manifest.products.length);
  for (const item of manifest.products) {
    assert.match(item.handle, /^[a-z0-9-]+$/);
    assert.match(item.templateSuffix, /^[a-z0-9-]+$/);
    assert.ok(Array.isArray(item.properties));
    assert.equal(typeof item.mutable, 'boolean');
    assert.equal(typeof item.javascript, 'boolean');
  }
});

test('non-custom services collect no properties', () => {
  for (const handle of ['premium-gift-packaging', 'routeins']) {
    assert.deepEqual(byHandle.get(handle).properties, []);
    assert.equal(byHandle.get(handle).templateSuffix, 'non-custom');
  }
  const template = json('templates/product.non-custom.json');
  assert.equal(template.sections.main.settings.show_engraving, false);
});

test('four-sided source remains byte-for-byte unchanged', () => {
  assert.equal(
    sha256('templates/product.four-sided.json'),
    'a94096c080f0c78b75d894b73e12922fd5488af853130f775b47b7c3930dee74'
  );
  assert.equal(
    sha256('snippets/pdp-preview-four-sided.liquid'),
    'c1f30f2a7e1aaa0eaa566c1caae248169931aaff4d04cd217985e506a66f0527'
  );
  assert.equal(byHandle.get('custom-bar-necklace').mutable, false);
});

test('main product renders the release and effective contract markers', () => {
  const section = read('sections/main-product.liquid');
  assert.match(section, /oc-order-safe-2026-07-13-1/);
  assert.match(section, /data-personalization-release=/);
  assert.match(section, /data-personalization-contract=/);
});
```

- [ ] **Step 2: Run the tests and confirm the missing-manifest failure**

Run: `node --test tests/personalization/theme-contracts.test.mjs`

Expected: FAIL with `ENOENT` for `scripts/personalization/product-contracts.json`.

- [ ] **Step 3: Add the exact product manifest**

Create `scripts/personalization/product-contracts.json`:

```json
{
  "release": "oc-order-safe-2026-07-13-1",
  "products": [
    {
      "handle": "premium-gift-packaging",
      "templateSuffix": "non-custom",
      "contract": "none",
      "properties": [],
      "javascript": false,
      "mutable": true
    },
    {
      "handle": "routeins",
      "templateSuffix": "non-custom",
      "contract": "none",
      "properties": [],
      "javascript": false,
      "mutable": true
    },
    {
      "handle": "personalized-heart-pendant-necklace",
      "templateSuffix": "heart-necklace",
      "contract": "heart-necklace",
      "properties": ["Engraving - Front"],
      "javascript": false,
      "mutable": true
    },
    {
      "handle": "matching-coordinates-necklaces",
      "templateSuffix": "matching-necklaces",
      "contract": "matching-necklaces",
      "properties": ["Engraving - Necklace A", "Engraving - Necklace B"],
      "javascript": true,
      "mutable": true
    },
    {
      "handle": "personalized-couple-rings",
      "templateSuffix": "couple-rings",
      "contract": "couple-rings",
      "properties": [
        "Engraving - Ring 1",
        "Engraving - Ring 2",
        "Ring 1 Size / Style",
        "Ring 2 Size / Style"
      ],
      "javascript": true,
      "mutable": true
    },
    {
      "handle": "chain-link-necklace-custom-charms",
      "templateSuffix": "charm-name-necklace",
      "contract": "charm-name-necklace",
      "properties": ["Name 1", "Name 2", "Name 3", "Name 4", "Name 5", "Name 6", "Name 7", "Name 8"],
      "javascript": true,
      "mutable": true
    },
    {
      "handle": "custom-birthstone-rings",
      "templateSuffix": "birthstone-ring",
      "contract": "birthstone-ring",
      "properties": ["Birth Month", "Engraving"],
      "javascript": false,
      "mutable": true
    },
    {
      "handle": "personalized-nameplate-necklace",
      "templateSuffix": "nameplate",
      "contract": "nameplate",
      "properties": ["Name"],
      "javascript": false,
      "mutable": true
    },
    {
      "handle": "vertical-name-necklace",
      "templateSuffix": "vertical-name",
      "contract": "vertical-name",
      "properties": ["Name"],
      "javascript": false,
      "mutable": true
    },
    {
      "handle": "custom-bar-necklace",
      "templateSuffix": "four-sided",
      "contract": "four-sided",
      "properties": ["Engraving — Front", "Engraving — Back", "Engraving — Left", "Engraving — Right"],
      "javascript": false,
      "mutable": false
    }
  ]
}
```

- [ ] **Step 4: Render a stable release marker without changing existing preview behavior**

Patch the opening Liquid assignment and section tag in `sections/main-product.liquid`:

```liquid
{%- liquid
  assign current_variant = product.selected_or_first_available_variant
  assign ships_by = 'now' | date: '%s' | plus: 0
  assign prod_seconds = settings.production_days | times: 86400
  assign transit_seconds = settings.transit_days | times: 86400
  assign delivery_low = ships_by | plus: prod_seconds | plus: transit_seconds
  assign delivery_high = delivery_low | plus: 259200
  assign preview_type = section.settings.preview_type | default: 'horizontal-bar'
  assign personalization_release = 'oc-order-safe-2026-07-13-1'
  assign personalization_contract = preview_type
  unless section.settings.show_engraving
    assign personalization_contract = 'none'
  endunless
-%}

<section class="section" data-product
         data-preview-type="{{ preview_type }}"
         data-personalization-release="{{ personalization_release }}"
         data-personalization-contract="{{ personalization_contract }}">
```

- [ ] **Step 5: Run the contract tests**

Run: `node --test tests/personalization/theme-contracts.test.mjs`

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/personalization/product-contracts.json tests/personalization/theme-contracts.test.mjs sections/main-product.liquid
git commit -m "test: establish personalization contracts"
```

---

### Task 2: Heart Necklace Contract

**Files:**
- Create: `snippets/pdp-preview-heart-necklace.liquid`
- Create: `templates/product.heart-necklace.json`
- Modify: `sections/main-product.liquid:141-170,340-350`
- Modify: `tests/personalization/theme-contracts.test.mjs`

**Interfaces:**
- Consumes: manifest entry `heart-necklace`, existing SVG metal gradients, and existing generic `[data-engrave-input]` listener.
- Produces: one required `Engraving - Front` input and the `heart-necklace` renderer branch.

- [ ] **Step 1: Add a failing heart contract test**

Append:

```js
function assertTemplateContract(handle, snippetPath) {
  const item = byHandle.get(handle);
  const template = json(`templates/product.${item.templateSuffix}.json`);
  const snippet = read(snippetPath);
  const section = read('sections/main-product.liquid');
  assert.equal(template.sections.main.settings.preview_type, item.contract);
  assert.equal(template.sections.main.settings.show_engraving, item.contract !== 'none');
  for (const property of item.properties) {
    assert.ok(snippet.includes(`name="properties[${property}]"`), `${handle} missing ${property}`);
  }
  assert.ok(section.includes(`preview_type == '${item.contract}'`));
}

test('heart necklace has one front engraving and no side controls', () => {
  assertTemplateContract(
    'personalized-heart-pendant-necklace',
    'snippets/pdp-preview-heart-necklace.liquid'
  );
  const snippet = read('snippets/pdp-preview-heart-necklace.liquid');
  assert.doesNotMatch(snippet, /Back|Left side|Right side|side-count/);
});
```

- [ ] **Step 2: Confirm the missing-template failure**

Run: `node --test --test-name-pattern="heart necklace" tests/personalization/theme-contracts.test.mjs`

Expected: FAIL with `ENOENT` for `templates/product.heart-necklace.json`.

- [ ] **Step 3: Add the dedicated template**

Create `templates/product.heart-necklace.json` with `main-product`, `preview_type: "heart-necklace"`, `show_engraving: true`, `engraving_required: true`, `engraving_placeholder: "YOUR MESSAGE"`, `engraving_max: 25`, and `atc_label: "Add to cart — free engraving"`. Reuse the existing necklace cross-sell section and keep all schema-setting values valid.

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "details": {
          "type": "accordion",
          "settings": {
            "title": "Product details",
            "content": "<p>Choose the current color and chain length, then enter the message for the front of the heart.</p>"
          }
        }
      },
      "block_order": ["details"],
      "settings": {
        "preview_type": "heart-necklace",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "YOUR MESSAGE",
        "engraving_max": 25,
        "atc_label": "Add to cart — free engraving"
      }
    },
    "cross": {
      "type": "featured-collection",
      "settings": {
        "eyebrow": "Complete the set",
        "heading": "Pairs well with",
        "collection": "necklaces",
        "limit": 4,
        "hide_sold_out": true
      }
    }
  },
  "order": ["main", "cross"]
}
```

- [ ] **Step 4: Add the focused Liquid/SVG renderer**

Create `snippets/pdp-preview-heart-necklace.liquid`:

```liquid
{% style %}
  .ep--heart svg { display:block; width:min(230px, 80%); height:auto; margin:0 auto; }
  .ep--heart .ep__heart-chain { fill:none; stroke:#8b8b95; stroke-width:1.4; }
  .ep--heart .ep__engrave-text { font-size:9px; letter-spacing:.08em; }
{% endstyle %}
<div class="engrave-field" data-heart-engraving>
  <label class="option-group buy-step" for="engrave-heart-front">Front engraving</label>
  <div class="ep ep--heart" aria-hidden="true">
    <svg viewBox="0 0 260 220">
      <path class="ep__heart-chain" d="M8 0 L130 44 L252 0"/>
      <path class="ep__metal" d="M130 196 C112 177 62 139 62 95 C62 60 105 49 130 79 C155 49 198 60 198 95 C198 139 148 177 130 196 Z"/>
      <text x="130" y="123" class="ep__engrave-text"
            data-engrave-preview data-fit="108" data-fit-chars="15"
            data-placeholder="{{ engraving_placeholder | escape }}">{{ engraving_placeholder }}</text>
    </svg>
    <p class="ep__hint">Front engraving preview</p>
  </div>
  <input id="engrave-heart-front" type="text" data-engrave-input
         name="properties[Engraving - Front]"
         maxlength="{{ engraving_max }}"
         placeholder="{{ engraving_placeholder | escape }}"
         {% if engraving_required %}required{% endif %}
         autocomplete="off">
  <div class="field-row"><span data-engrave-count>0 / {{ engraving_max }}</span></div>
</div>
```

- [ ] **Step 5: Dispatch and expose the new schema value**

Add this branch before the existing four-sided branch:

```liquid
{%- if preview_type == 'heart-necklace' -%}
  {% render 'pdp-preview-heart-necklace',
    engraving_placeholder: section.settings.engraving_placeholder,
    engraving_max: section.settings.engraving_max,
    engraving_required: section.settings.engraving_required %}
{%- elsif preview_type == 'four-sided' -%}
```

Add this schema option, whose label is under 50 characters:

```json
{ "value": "heart-necklace", "label": "Heart pendant (front engraving)" }
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
node --test tests/personalization/theme-contracts.test.mjs
npx --yes @shopify/cli@latest theme check --fail-level error
git diff --check
```

Expected: all contract tests PASS, Theme Check has 0 errors, and `git diff --check` is silent.

```bash
git add snippets/pdp-preview-heart-necklace.liquid templates/product.heart-necklace.json sections/main-product.liquid tests/personalization/theme-contracts.test.mjs
git commit -m "feat: add heart necklace personalization contract"
```

---

### Task 3: Matching-Necklace Contract and Dynamic Asset Foundation

**Files:**
- Create: `assets/personalization-dynamic.js`
- Create: `tests/personalization/dynamic-personalization.test.cjs`
- Create: `snippets/pdp-preview-matching-necklaces.liquid`
- Create: `templates/product.matching-necklaces.json`
- Modify: `sections/main-product.liquid`
- Modify: `tests/personalization/theme-contracts.test.mjs`

**Interfaces:**
- Consumes: `matching-necklaces` manifest contract and existing metal gradients.
- Produces: `resolveMatchingProperties(a, b, separate) -> { a, b }`, `init(document)`, explicit A/B fields, and the conditional deferred script include.

- [ ] **Step 1: Write failing dynamic and static tests**

Create `tests/personalization/dynamic-personalization.test.cjs`:

```js
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
```

Append to the static test:

```js
test('matching necklaces submit explicit A and B properties', () => {
  assertTemplateContract(
    'matching-coordinates-necklaces',
    'snippets/pdp-preview-matching-necklaces.liquid'
  );
  const section = read('sections/main-product.liquid');
  assert.match(section, /personalization-dynamic\.js/);
  assert.match(section, /matching-necklaces/);
});
```

- [ ] **Step 2: Confirm both tests fail**

Run:

```bash
node --test tests/personalization/dynamic-personalization.test.cjs
node --test --test-name-pattern="matching necklaces" tests/personalization/theme-contracts.test.mjs
```

Expected: first command fails because the asset is missing; second fails because the template is missing.

- [ ] **Step 3: Create the tested IIFE asset with matching behavior**

Create `assets/personalization-dynamic.js`:

```js
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', function () { api.init(root.document); });
  } else {
    api.init(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function resolveMatchingProperties(a, b, separate) {
    var first = String(a || '').trim();
    return { a: first, b: separate ? String(b || '').trim() : first };
  }

  function renderText(element, value, placeholder) {
    if (!element) return;
    element.textContent = value || placeholder;
    element.style.opacity = value ? '1' : '0.4';
  }

  function initMatching(document) {
    var rig = document.querySelector('[data-matching-necklaces]');
    if (!rig) return;
    var inputA = rig.querySelector('[data-match-input="a"]');
    var inputB = rig.querySelector('[data-match-input="b"]');
    var previewA = rig.querySelector('[data-match-preview="a"]');
    var previewB = rig.querySelector('[data-match-preview="b"]');
    var separate = rig.querySelector('[data-match-separate]');
    var enhancement = rig.querySelector('[data-match-enhancement]');
    var fieldB = rig.querySelector('[data-match-field-b]');
    if (!inputA || !inputB || !separate) return;

    function sync() {
      var values = resolveMatchingProperties(inputA.value, inputB.value, separate.checked);
      if (!separate.checked) inputB.value = values.b;
      if (fieldB) fieldB.hidden = !separate.checked;
      renderText(previewA, values.a, previewA.dataset.placeholder || 'NECKLACE A');
      renderText(previewB, values.b, previewB.dataset.placeholder || 'NECKLACE B');
    }

    if (enhancement) enhancement.hidden = false;
    inputA.addEventListener('input', sync);
    inputB.addEventListener('input', sync);
    separate.addEventListener('change', sync);
    sync();
  }

  function init(document) {
    initMatching(document);
  }

  return {
    init: init,
    resolveMatchingProperties: resolveMatchingProperties
  };
});
```

- [ ] **Step 4: Create two-necklace markup with order-safe no-JS fields**

Create `snippets/pdp-preview-matching-necklaces.liquid` with two vertical-bar pendant SVGs, two required text inputs named exactly `properties[Engraving - Necklace A]` and `properties[Engraving - Necklace B]`, and these data hooks:

```liquid
{% style %}
  .ep--matching { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .ep--matching svg { display:block; width:70px; height:auto; margin:0 auto; }
  .ep--matching-fields { display:grid; gap:10px; }
  @media (max-width:420px) { .ep--matching { gap:8px; } }
{% endstyle %}
<div class="engrave-field" data-matching-necklaces>
  <p class="option-group buy-step">Your necklace engravings</p>
  <div class="ep ep--matching" aria-hidden="true">
    {% for key in (1..2) %}
      {% assign letter = 'a' %}
      {% if key == 2 %}{% assign letter = 'b' %}{% endif %}
      <div>
        <svg viewBox="0 0 70 200">
          <path d="M4 0 L35 28 L66 0" fill="none" class="ep__chain-line"/>
          <rect x="16" y="26" width="38" height="160" rx="4" class="ep__metal"/>
          <text x="35" y="105" class="ep__engrave-text ep__engrave-text--vertical"
                data-match-preview="{{ letter }}"
                data-placeholder="NECKLACE {{ key }}">NECKLACE {{ key }}</text>
        </svg>
        <span class="ep__face-label">Necklace {{ key }}</span>
      </div>
    {% endfor %}
  </div>
  <label data-match-enhancement hidden>
    <input type="checkbox" data-match-separate> Use a different engraving on Necklace B
  </label>
  <div class="ep--matching-fields">
    <div>
      <label for="matching-a">Necklace A</label>
      <input id="matching-a" type="text" data-match-input="a"
             name="properties[Engraving - Necklace A]"
             maxlength="{{ engraving_max }}" required autocomplete="off">
    </div>
    <div data-match-field-b>
      <label for="matching-b">Necklace B</label>
      <input id="matching-b" type="text" data-match-input="b"
             name="properties[Engraving - Necklace B]"
             maxlength="{{ engraving_max }}" required autocomplete="off">
    </div>
  </div>
</div>
```

Without JavaScript, both required fields remain visible and usable.

- [ ] **Step 5: Add the template, dispatch, schema value, and conditional asset**

Create `templates/product.matching-necklaces.json`:

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "details": {
          "type": "accordion",
          "settings": {
            "title": "Product details",
            "content": "<p>Enter the coordinates for Necklace A and Necklace B. Use the same engraving on both or personalize them separately.</p>"
          }
        }
      },
      "block_order": ["details"],
      "settings": {
        "preview_type": "matching-necklaces",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "27.7676° N, 82.6403° W",
        "engraving_max": 30,
        "atc_label": "Add to cart — free engraving"
      }
    },
    "cross": {
      "type": "featured-collection",
      "settings": {
        "eyebrow": "Complete the set",
        "heading": "Pairs well with",
        "collection": "necklaces",
        "limit": 4,
        "hide_sold_out": true
      }
    }
  },
  "order": ["main", "cross"]
}
```

Add the renderer branch:

```liquid
{%- elsif preview_type == 'matching-necklaces' -%}
  {% render 'pdp-preview-matching-necklaces',
    engraving_max: section.settings.engraving_max %}
```

Add schema option:

```json
{ "value": "matching-necklaces", "label": "Matching necklaces (two engravings)" }
```

Before `{% schema %}`, load the asset only for this contract:

```liquid
{%- if preview_type == 'matching-necklaces' -%}
  <script src="{{ 'personalization-dynamic.js' | asset_url }}" defer></script>
{%- endif -%}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
node --test tests/personalization/theme-contracts.test.mjs tests/personalization/dynamic-personalization.test.cjs
node --check assets/personalization-dynamic.js
npx --yes @shopify/cli@latest theme check --fail-level error
```

Expected: all tests PASS, syntax passes, Theme Check has 0 errors.

```bash
git add assets/personalization-dynamic.js tests/personalization/dynamic-personalization.test.cjs snippets/pdp-preview-matching-necklaces.liquid templates/product.matching-necklaces.json sections/main-product.liquid tests/personalization/theme-contracts.test.mjs
git commit -m "feat: add matching necklace contract"
```

---

### Task 4: Couple-Ring Contract

**Files:**
- Create: `snippets/pdp-preview-couple-rings.liquid`
- Create: `templates/product.couple-rings.json`
- Modify: `assets/personalization-dynamic.js`
- Modify: `tests/personalization/dynamic-personalization.test.cjs`
- Modify: `tests/personalization/theme-contracts.test.mjs`
- Modify: `sections/main-product.liquid`

**Interfaces:**
- Consumes: underlying selected variant as Ring 1 size/style and current product variant titles as valid Ring 2 values.
- Produces: `resolveRingProperties(engraving1, engraving2, ring1, ring2)` and four explicit fulfillment properties.

- [ ] **Step 1: Write failing ring-property tests**

Append:

```js
test('couple rings preserve both engravings and both size/style values', () => {
  assert.deepEqual(api.resolveRingProperties('ALWAYS', 'FOREVER', '10 / Man', '7 / Woman'), {
    engraving1: 'ALWAYS',
    engraving2: 'FOREVER',
    ring1: '10 / Man',
    ring2: '7 / Woman'
  });
});
```

Append to the static test:

```js
test('couple rings expose two engravings and two fulfillment styles', () => {
  assertTemplateContract('personalized-couple-rings', 'snippets/pdp-preview-couple-rings.liquid');
});
```

Run both targeted tests and expect missing function/template failures.

- [ ] **Step 2: Extend the actual browser asset**

Add:

```js
function resolveRingProperties(engraving1, engraving2, ring1, ring2) {
  return {
    engraving1: String(engraving1 || '').trim(),
    engraving2: String(engraving2 || '').trim(),
    ring1: String(ring1 || '').trim(),
    ring2: String(ring2 || '').trim()
  };
}

function selectedVariant(root) {
  var idInput = root.querySelector('form[data-product-form] input[name="id"]');
  var json = root.querySelector('[data-product-json]');
  if (!idInput || !json) return null;
  var product = JSON.parse(json.textContent);
  return product.variants.find(function (variant) {
    return String(variant.id) === String(idInput.value);
  }) || null;
}

function initCoupleRings(document) {
  var root = document.querySelector('[data-product][data-preview-type="couple-rings"]');
  var rig = root && root.querySelector('[data-couple-rings]');
  if (!rig) return;
  var engraving1 = rig.querySelector('[data-ring-engraving="1"]');
  var engraving2 = rig.querySelector('[data-ring-engraving="2"]');
  var ring1 = rig.querySelector('[data-ring1-style]');
  var ring2 = rig.querySelector('[data-ring2-style]');
  var preview1 = rig.querySelector('[data-ring-preview="1"]');
  var preview2 = rig.querySelector('[data-ring-preview="2"]');

  function sync() {
    var variant = selectedVariant(root);
    if (variant && ring1) ring1.value = variant.title;
    var values = resolveRingProperties(
      engraving1 && engraving1.value,
      engraving2 && engraving2.value,
      ring1 && ring1.value,
      ring2 && ring2.value
    );
    renderText(preview1, values.engraving1, 'RING 1');
    renderText(preview2, values.engraving2, 'RING 2');
  }

  root.addEventListener('change', function () { setTimeout(sync, 0); });
  engraving1.addEventListener('input', sync);
  engraving2.addEventListener('input', sync);
  ring2.addEventListener('change', sync);
  sync();
}
```

Call `initCoupleRings(document)` from `init` and export `resolveRingProperties`.

- [ ] **Step 3: Create the renderer and template**

Create `snippets/pdp-preview-couple-rings.liquid` exactly as follows:

```liquid
{% style %}
  .ep--couple-rings { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .ep--couple-rings svg { width:100%; max-width:220px; margin:0 auto; }
  .couple-ring-fields { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .couple-ring-fields label { display:block; margin:8px 0 4px; }
  .couple-ring-fields select { width:100%; }
  @media (max-width:520px) {
    .ep--couple-rings, .couple-ring-fields { grid-template-columns:1fr; }
  }
{% endstyle %}
<div class="engrave-field" data-couple-rings>
  <p class="option-group buy-step">Personalize both rings</p>
  <p class="ep__set-sub">The size and style selected above are for Ring 1.</p>
  <div class="ep ep--couple-rings" aria-hidden="true">
    {% for index in (1..2) %}
      <svg viewBox="0 0 220 130" class="ep__ring-svg">
        <ellipse cx="110" cy="65" rx="78" ry="38" fill="none" stroke-width="18" class="ep__ring-band"/>
        <text x="110" y="70" class="ep__engrave-text"
              data-ring-preview="{{ index }}">RING {{ index }}</text>
      </svg>
    {% endfor %}
  </div>
  <div class="couple-ring-fields">
    <div>
      <label for="ring-engraving-1">Ring 1 engraving</label>
      <input id="ring-engraving-1" type="text" data-ring-engraving="1"
             name="properties[Engraving - Ring 1]" maxlength="{{ engraving_max }}" required>
      <input type="hidden" data-ring1-style
             name="properties[Ring 1 Size / Style]" value="{{ current_variant.title | escape }}">
    </div>
    <div>
      <label for="ring-engraving-2">Ring 2 engraving</label>
      <input id="ring-engraving-2" type="text" data-ring-engraving="2"
             name="properties[Engraving - Ring 2]" maxlength="{{ engraving_max }}" required>
      <label for="ring-2-style">Ring 2 size / style</label>
      <select id="ring-2-style" data-ring2-style
              name="properties[Ring 2 Size / Style]" required>
        <option value="">Choose Ring 2</option>
        {% for variant in product.variants %}
          {% if variant.available %}
            <option value="{{ variant.title | escape }}">{{ variant.title }}</option>
          {% endif %}
        {% endfor %}
      </select>
    </div>
  </div>
</div>
```

Create `templates/product.couple-rings.json`:

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "details": {
          "type": "accordion",
          "settings": {
            "title": "Product details",
            "content": "<p>Choose Ring 1 above, then enter both engravings and the verified size/style for Ring 2.</p>"
          }
        }
      },
      "block_order": ["details"],
      "settings": {
        "preview_type": "couple-rings",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "FOREVER",
        "engraving_max": 20,
        "atc_label": "Add to cart — free engraving"
      }
    },
    "cross": {
      "type": "featured-collection",
      "settings": {
        "eyebrow": "Complete the set",
        "heading": "Pairs well with",
        "collection": "rings",
        "limit": 4,
        "hide_sold_out": true
      }
    }
  },
  "order": ["main", "cross"]
}
```

- [ ] **Step 4: Dispatch and conditionally enhance**

Add the renderer branch:

```liquid
{%- elsif preview_type == 'couple-rings' -%}
  {% render 'pdp-preview-couple-rings',
    engraving_max: section.settings.engraving_max,
    current_variant: current_variant %}
```

Add schema option:

```json
{ "value": "couple-rings", "label": "Couple rings (two-ring preview)" }
```

Expand the conditional asset include to:

```liquid
{%- if preview_type == 'matching-necklaces' or preview_type == 'couple-rings' -%}
  <script src="{{ 'personalization-dynamic.js' | asset_url }}" defer></script>
{%- endif -%}
```

- [ ] **Step 5: Verify and commit**

Run the two Node test files, `node --check`, Theme Check, and `git diff --check`; expect all to pass.

```bash
git add snippets/pdp-preview-couple-rings.liquid templates/product.couple-rings.json assets/personalization-dynamic.js tests/personalization/dynamic-personalization.test.cjs tests/personalization/theme-contracts.test.mjs sections/main-product.liquid
git commit -m "feat: add couple ring fulfillment contract"
```

---

### Task 5: Variant-Driven Charm-Name Contract

**Files:**
- Create: `snippets/pdp-preview-charm-name-necklace.liquid`
- Create: `templates/product.charm-name-necklace.json`
- Modify: `assets/personalization-dynamic.js`
- Modify: `tests/personalization/dynamic-personalization.test.cjs`
- Modify: `tests/personalization/theme-contracts.test.mjs`
- Modify: `sections/main-product.liquid`

**Interfaces:**
- Consumes: existing `Names` option values `2 names` through `8 names`.
- Produces: `parseCharmCount(value) -> integer|null`, `activeNameIndexes(count) -> integer[]`, and exactly N enabled/required `Name N` inputs.

- [ ] **Step 1: Write failing count tests**

Append:

```js
test('charm count accepts only supported paid variant values', () => {
  assert.equal(api.parseCharmCount('2 names'), 2);
  assert.equal(api.parseCharmCount('8 names'), 8);
  assert.equal(api.parseCharmCount('9 names'), null);
  assert.equal(api.parseCharmCount('names'), null);
});

test('active charm fields match the paid count', () => {
  assert.deepEqual(api.activeNameIndexes(4), [1, 2, 3, 4]);
  assert.deepEqual(api.activeNameIndexes(null), []);
});
```

Append a static contract test for `chain-link-necklace-custom-charms`, then run and confirm missing function/template failures.

- [ ] **Step 2: Add exact parsing and field-state logic**

Add:

```js
function parseCharmCount(value) {
  var match = String(value || '').match(/\b([2-8])\s*names?\b/i);
  return match ? parseInt(match[1], 10) : null;
}

function activeNameIndexes(count) {
  if (!Number.isInteger(count) || count < 2 || count > 8) return [];
  return Array.from({ length: count }, function (_, index) { return index + 1; });
}

function initCharms(document) {
  var root = document.querySelector('[data-product][data-preview-type="charm-name-necklace"]');
  var rig = root && root.querySelector('[data-charm-names]');
  if (!rig) return;
  var alert = rig.querySelector('[data-contract-error]');

  function countFromSelection() {
    var group = root.querySelector(`[data-option-index="${rig.dataset.namesOption}"]`);
    var checked = group && group.querySelector('input:checked');
    return parseCharmCount(checked && checked.value);
  }

  function sync() {
    var count = countFromSelection();
    var active = activeNameIndexes(count);
    rig.querySelectorAll('[data-charm-field]').forEach(function (field) {
      var index = parseInt(field.dataset.charmField, 10);
      var enabled = active.indexOf(index) !== -1;
      var input = field.querySelector('input');
      field.hidden = !enabled;
      input.disabled = !enabled;
      input.required = enabled;
      var preview = rig.querySelector(`[data-charm-preview="${index}"]`);
      if (preview) preview.closest('[data-charm-preview-wrap]').hidden = !enabled;
    });
    if (alert) alert.hidden = Boolean(count);
    document.querySelectorAll('[data-atc]').forEach(function (button) {
      if (!count) {
        button.dataset.contractBlocked = 'true';
        button.disabled = true;
      } else if (button.dataset.contractBlocked) {
        delete button.dataset.contractBlocked;
        var variant = selectedVariant(root);
        button.disabled = !variant || !variant.available;
      }
    });
  }

  root.addEventListener('change', sync);
  rig.querySelectorAll('[data-charm-field] input').forEach(function (input) {
    input.addEventListener('input', function () {
      renderText(
        rig.querySelector(`[data-charm-preview="${input.dataset.charmInput}"]`),
        input.value.trim(),
        `NAME ${input.dataset.charmInput}`
      );
    });
  });
  sync();
}
```

Call `initCharms(document)` from `init`, and export `parseCharmCount` and `activeNameIndexes`.

- [ ] **Step 3: Build the Liquid renderer**

Create `snippets/pdp-preview-charm-name-necklace.liquid`:

```liquid
{%- liquid
  assign names_option = -1
  for option in product.options_with_values
    assign probe = option.name | append: ' ' | append: option.values | downcase
    if probe contains 'name'
      assign names_option = forloop.index0
      break
    endif
  endfor

  assign initial_count = 0
  if names_option >= 0
    assign selected_names = current_variant.options[names_option] | downcase
    if selected_names contains '8'
      assign initial_count = 8
    elsif selected_names contains '7'
      assign initial_count = 7
    elsif selected_names contains '6'
      assign initial_count = 6
    elsif selected_names contains '5'
      assign initial_count = 5
    elsif selected_names contains '4'
      assign initial_count = 4
    elsif selected_names contains '3'
      assign initial_count = 3
    elsif selected_names contains '2'
      assign initial_count = 2
    endif
  endif
-%}
{% style %}
  .ep--charms { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; }
  .ep__charm { width:64px; }
  .ep__charm svg { display:block; width:48px; margin:0 auto; }
  .ep__charm .ep__engrave-text { font-size:7px; letter-spacing:.04em; }
  .charm-name-fields { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .charm-name-fields label { display:block; margin-bottom:4px; }
  .charm-contract-error { color:#8b1e1e; font-weight:600; }
  @media (max-width:520px) { .charm-name-fields { grid-template-columns:1fr; } }
{% endstyle %}
<div class="engrave-field" data-charm-names data-names-option="{{ names_option }}">
  <p class="option-group buy-step">Names for your charms</p>
  <p class="charm-contract-error" role="alert" data-contract-error
     {% if initial_count >= 2 and initial_count <= 8 %}hidden{% endif %}>
    This product's Names variant could not be mapped safely. Please contact support.
  </p>
  <div class="ep ep--charms" aria-hidden="true">
    {% for index in (1..8) %}
      <div class="ep__charm" data-charm-preview-wrap
           {% if index > initial_count %}hidden{% endif %}>
        <svg viewBox="0 0 64 92">
          <circle cx="32" cy="10" r="5" class="ep__hole"/>
          <rect x="9" y="13" width="46" height="68" rx="8" class="ep__metal"/>
          <text x="32" y="51" class="ep__engrave-text"
                data-charm-preview="{{ index }}">NAME {{ index }}</text>
        </svg>
      </div>
    {% endfor %}
  </div>
  <div class="charm-name-fields">
{% for index in (1..8) %}
    <div data-charm-field="{{ index }}" {% if index > initial_count %}hidden{% endif %}>
      <label for="charm-name-{{ index }}">Name {{ index }}</label>
      <input id="charm-name-{{ index }}" type="text"
             data-charm-input="{{ index }}"
             name="properties[Name {{ index }}]"
             maxlength="{{ engraving_max }}"
             {% if index <= initial_count %}required{% else %}disabled{% endif %}
             autocomplete="off">
    </div>
{% endfor %}
  </div>
  <noscript>
    <p>Choose the paid number of names by reloading one of these variants:</p>
    {%- assign seen_names = '|' -%}
    {%- for variant in product.variants -%}
      {%- assign names_value = variant.options[names_option] -%}
      {%- capture token -%}|{{ names_value }}|{%- endcapture -%}
      {%- unless seen_names contains token -%}
        <a href="{{ product.url }}?variant={{ variant.id }}">{{ names_value }}</a>
        {%- assign seen_names = seen_names | append: names_value | append: '|' -%}
      {%- endunless -%}
    {%- endfor -%}
  </noscript>
</div>
```

- [ ] **Step 4: Add template and dispatch**

Create `templates/product.charm-name-necklace.json`:

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "details": {
          "type": "accordion",
          "settings": {
            "title": "Product details",
            "content": "<p>The existing Names variant controls exactly how many personalized charm fields are required.</p>"
          }
        }
      },
      "block_order": ["details"],
      "settings": {
        "preview_type": "charm-name-necklace",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "ALEX",
        "engraving_max": 15,
        "atc_label": "Add to cart — free personalization"
      }
    },
    "cross": {
      "type": "featured-collection",
      "settings": {
        "eyebrow": "Complete the set",
        "heading": "Pairs well with",
        "collection": "necklaces",
        "limit": 4,
        "hide_sold_out": true
      }
    }
  },
  "order": ["main", "cross"]
}
```

Add:

```liquid
{%- elsif preview_type == 'charm-name-necklace' -%}
  {% render 'pdp-preview-charm-name-necklace',
    engraving_max: section.settings.engraving_max,
    current_variant: current_variant %}
```

Add schema label:

```json
{ "value": "charm-name-necklace", "label": "Charm necklace (variant name count)" }
```

Extend the asset condition to:

```liquid
{%- if preview_type == 'matching-necklaces' or preview_type == 'couple-rings' or preview_type == 'charm-name-necklace' -%}
  <script src="{{ 'personalization-dynamic.js' | asset_url }}" defer></script>
{%- endif -%}
```

- [ ] **Step 5: Verify and commit**

Run all Node tests, `node --check`, Theme Check, and confirm the dynamic asset remains under 16,384 bytes with `wc -c assets/personalization-dynamic.js`.

```bash
git add snippets/pdp-preview-charm-name-necklace.liquid templates/product.charm-name-necklace.json assets/personalization-dynamic.js tests/personalization/dynamic-personalization.test.cjs tests/personalization/theme-contracts.test.mjs sections/main-product.liquid
git commit -m "feat: add variant-driven charm names"
```

---

### Task 6: Birthstone Ring Contract Without Additional JavaScript

**Files:**
- Create: `snippets/pdp-preview-birthstone-ring.liquid`
- Create: `templates/product.birthstone-ring.json`
- Modify: `sections/main-product.liquid`
- Modify: `tests/personalization/theme-contracts.test.mjs`

**Interfaces:**
- Consumes: existing generic engraving input listener.
- Produces: required `Birth Month` and `Engraving` properties; CSS-only gemstone preview selection.

- [ ] **Step 1: Add and run the failing static test**

Append:

```js
test('birthstone ring collects month and engraving without dynamic asset dependency', () => {
  assertTemplateContract('custom-birthstone-rings', 'snippets/pdp-preview-birthstone-ring.liquid');
  assert.equal(byHandle.get('custom-birthstone-rings').javascript, false);
});
```

Expected: FAIL because the template is missing.

- [ ] **Step 2: Create CSS-only birth-month and engraving markup**

Create `snippets/pdp-preview-birthstone-ring.liquid`:

```liquid
{%- assign months = 'January,February,March,April,May,June,July,August,September,October,November,December' | split: ',' -%}
{% style %}
  .birthstone-contract .birthstone-gem { fill:#d8d8dc; stroke:#fff; stroke-width:2; }
  .birthstone-contract:has([value="January"]:checked) .birthstone-gem { fill:#7b1f32; }
  .birthstone-contract:has([value="February"]:checked) .birthstone-gem { fill:#7652a8; }
  .birthstone-contract:has([value="March"]:checked) .birthstone-gem { fill:#74c7c7; }
  .birthstone-contract:has([value="April"]:checked) .birthstone-gem { fill:#eef4ff; }
  .birthstone-contract:has([value="May"]:checked) .birthstone-gem { fill:#258b57; }
  .birthstone-contract:has([value="June"]:checked) .birthstone-gem { fill:#e7d7dc; }
  .birthstone-contract:has([value="July"]:checked) .birthstone-gem { fill:#c51f3a; }
  .birthstone-contract:has([value="August"]:checked) .birthstone-gem { fill:#8dbb50; }
  .birthstone-contract:has([value="September"]:checked) .birthstone-gem { fill:#315ea8; }
  .birthstone-contract:has([value="October"]:checked) .birthstone-gem { fill:#e28bb7; }
  .birthstone-contract:has([value="November"]:checked) .birthstone-gem { fill:#d99a32; }
  .birthstone-contract:has([value="December"]:checked) .birthstone-gem { fill:#45a6a6; }
  .birthstone-months { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; }
  .birthstone-months label { font-size:.78rem; }
  @media (max-width:420px) { .birthstone-months { grid-template-columns:repeat(2, 1fr); } }
{% endstyle %}
<div class="engrave-field birthstone-contract" data-birthstone-ring>
  <p class="option-group buy-step">Choose the birth month</p>
  <div class="ep ep--ring" aria-hidden="true">
    <svg viewBox="0 0 260 180" class="ep__ring-svg">
      <ellipse cx="130" cy="103" rx="84" ry="44" fill="none" stroke-width="20" class="ep__ring-band"/>
      <path d="M103 58 L116 40 H144 L157 58 L145 78 H115 Z" class="birthstone-gem"/>
      <text x="130" y="112" data-engrave-preview class="ep__engrave-text"
            data-placeholder="{{ engraving_placeholder | escape }}">{{ engraving_placeholder }}</text>
    </svg>
    <p class="ep__hint">Birthstone and engraving preview</p>
  </div>
  <fieldset class="birthstone-months">
    <legend class="visually-hidden">Birth month</legend>
    {% for month in months %}
      <div>
        <input id="birth-month-{{ month | handleize }}" type="radio"
               name="properties[Birth Month]" value="{{ month }}"
               {% if forloop.first %}required{% endif %}>
        <label for="birth-month-{{ month | handleize }}">{{ month }}</label>
      </div>
    {% endfor %}
  </fieldset>
  <label for="birthstone-engraving">Name or date to engrave</label>
  <input id="birthstone-engraving" type="text" data-engrave-input
         name="properties[Engraving]"
         maxlength="{{ engraving_max }}"
         placeholder="{{ engraving_placeholder | escape }}"
         required autocomplete="off">
  <div class="field-row"><span data-engrave-count>0 / {{ engraving_max }}</span></div>
</div>
```

Unsupported `:has` browsers retain a neutral gemstone while the native required month field and cart contract continue to work.

- [ ] **Step 3: Add template and dispatch**

Create `templates/product.birthstone-ring.json`:

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "details": {
          "type": "accordion",
          "settings": {
            "title": "Product details",
            "content": "<p>Select the birth month and enter the name or date for engraving. The existing product price and variant remain unchanged.</p>"
          }
        }
      },
      "block_order": ["details"],
      "settings": {
        "preview_type": "birthstone-ring",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "ALEX",
        "engraving_max": 20,
        "atc_label": "Add to cart — free engraving"
      }
    },
    "cross": {
      "type": "featured-collection",
      "settings": {
        "eyebrow": "Complete the set",
        "heading": "Pairs well with",
        "collection": "rings",
        "limit": 4,
        "hide_sold_out": true
      }
    }
  },
  "order": ["main", "cross"]
}
```

Add:

```liquid
{%- elsif preview_type == 'birthstone-ring' -%}
  {% render 'pdp-preview-birthstone-ring',
    engraving_placeholder: section.settings.engraving_placeholder,
    engraving_max: section.settings.engraving_max %}
```

Add schema option:

```json
{ "value": "birthstone-ring", "label": "Birthstone ring (month and name)" }
```

Do not add this type to the dynamic script condition.

- [ ] **Step 4: Verify and commit**

Run static tests and Theme Check; expect PASS and 0 errors.

```bash
git add snippets/pdp-preview-birthstone-ring.liquid templates/product.birthstone-ring.json sections/main-product.liquid tests/personalization/theme-contracts.test.mjs
git commit -m "feat: add birthstone ring contract"
```

---

### Task 7: Horizontal and Vertical Nameplate Contracts

**Files:**
- Create: `snippets/pdp-preview-nameplate.liquid`
- Create: `snippets/pdp-preview-vertical-name.liquid`
- Create: `templates/product.nameplate.json`
- Create: `templates/product.vertical-name.json`
- Modify: `sections/main-product.liquid`
- Modify: `tests/personalization/theme-contracts.test.mjs`

**Interfaces:**
- Consumes: existing generic engraving listener and metal gradients.
- Produces: one required `Name` property for each dedicated orientation.

- [ ] **Step 1: Add failing tests for both templates**

Append:

```js
test('horizontal nameplate has one required Name property', () => {
  assertTemplateContract('personalized-nameplate-necklace', 'snippets/pdp-preview-nameplate.liquid');
});

test('vertical nameplate has one required Name property', () => {
  assertTemplateContract('vertical-name-necklace', 'snippets/pdp-preview-vertical-name.liquid');
});
```

Run the pattern `nameplate|vertical name`; expect missing-template failures.

- [ ] **Step 2: Create orientation-specific renderers**

Create `snippets/pdp-preview-nameplate.liquid`:

```liquid
{% style %}
  .ep--nameplate svg { display:block; width:min(330px, 100%); margin:0 auto; }
  .ep--nameplate .ep__engrave-text { font-size:16px; font-family:var(--f-display); letter-spacing:.06em; }
{% endstyle %}
<div class="engrave-field" data-nameplate>
  <label class="option-group buy-step" for="nameplate-name">Your name</label>
  <div class="ep ep--nameplate" aria-hidden="true">
    <svg viewBox="0 0 280 180">
      <path d="M0 15 L32 64 M280 15 L248 64" fill="none" class="ep__chain-line"/>
      <path class="ep__metal" d="M35 54 H245 C255 54 263 62 263 72 V108 C263 118 255 126 245 126 H35 C25 126 17 118 17 108 V72 C17 62 25 54 35 54 Z"/>
      <text x="140" y="96" data-engrave-preview class="ep__engrave-text"
            data-fit="205" data-fit-chars="14"
            data-placeholder="{{ engraving_placeholder | escape }}">{{ engraving_placeholder }}</text>
    </svg>
    <p class="ep__hint">Horizontal name preview</p>
  </div>
  <input id="nameplate-name" type="text" data-engrave-input
         name="properties[Name]" maxlength="{{ engraving_max }}"
         placeholder="{{ engraving_placeholder | escape }}"
         required autocomplete="name">
  <div class="field-row"><span data-engrave-count>0 / {{ engraving_max }}</span></div>
</div>
```

Create `snippets/pdp-preview-vertical-name.liquid`:

```liquid
{% style %}
  .ep--vertical-name svg { display:block; width:min(150px, 72%); margin:0 auto; }
  .ep--vertical-name .ep__engrave-text { font-family:var(--f-display); font-size:14px; }
{% endstyle %}
<div class="engrave-field" data-vertical-name>
  <label class="option-group buy-step" for="vertical-name">Your name</label>
  <div class="ep ep--vertical-name" aria-hidden="true">
    <svg viewBox="0 0 200 300">
      <path d="M20 0 L100 32 L180 0" fill="none" class="ep__chain-line"/>
      <rect x="65" y="24" width="70" height="252" rx="10" class="ep__metal"/>
      <text x="100" y="150" data-engrave-preview
            class="ep__engrave-text ep__engrave-text--vertical"
            data-fit="205" data-fit-chars="14"
            data-placeholder="{{ engraving_placeholder | escape }}">{{ engraving_placeholder }}</text>
    </svg>
    <p class="ep__hint">Vertical name preview</p>
  </div>
  <input id="vertical-name" type="text" data-engrave-input
         name="properties[Name]" maxlength="{{ engraving_max }}"
         placeholder="{{ engraving_placeholder | escape }}"
         required autocomplete="name">
  <div class="field-row"><span data-engrave-count>0 / {{ engraving_max }}</span></div>
</div>
```

- [ ] **Step 3: Add templates and dispatch**

Create `templates/product.nameplate.json`:

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {},
      "block_order": [],
      "settings": {
        "preview_type": "nameplate",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "ALEXANDRA",
        "engraving_max": 20,
        "atc_label": "Add to cart — free personalization"
      }
    }
  },
  "order": ["main"]
}
```

Create `templates/product.vertical-name.json`:

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {},
      "block_order": [],
      "settings": {
        "preview_type": "vertical-name",
        "show_engraving": true,
        "engraving_required": true,
        "engraving_placeholder": "ALEXANDRA",
        "engraving_max": 20,
        "atc_label": "Add to cart — free personalization"
      }
    }
  },
  "order": ["main"]
}
```

Add:

```liquid
{%- elsif preview_type == 'nameplate' -%}
  {% render 'pdp-preview-nameplate',
    engraving_placeholder: section.settings.engraving_placeholder,
    engraving_max: section.settings.engraving_max %}
{%- elsif preview_type == 'vertical-name' -%}
  {% render 'pdp-preview-vertical-name',
    engraving_placeholder: section.settings.engraving_placeholder,
    engraving_max: section.settings.engraving_max %}
```

Add schema options:

```json
{ "value": "nameplate", "label": "Horizontal nameplate" },
{ "value": "vertical-name", "label": "Vertical nameplate" }
```

Neither type loads the dynamic asset.

- [ ] **Step 4: Verify and commit**

Run all static tests, Theme Check, and `git diff --check`; expect PASS.

```bash
git add snippets/pdp-preview-nameplate.liquid snippets/pdp-preview-vertical-name.liquid templates/product.nameplate.json templates/product.vertical-name.json sections/main-product.liquid tests/personalization/theme-contracts.test.mjs
git commit -m "feat: add dedicated nameplate contracts"
```

---

### Task 8: Complete Static Coverage, Asset Budgets, and CI

**Files:**
- Modify: `tests/personalization/theme-contracts.test.mjs`
- Modify: `.github/workflows/theme-ci.yml:121-130`

**Interfaces:**
- Consumes: all manifest entries, templates, snippets, and the dynamic asset.
- Produces: one local/CI command that enforces the complete release contract.

- [ ] **Step 1: Add failing release-wide guards**

Append:

```js
test('every mutable personalized contract has a matching template, snippet, and exact properties', () => {
  const snippetByContract = {
    'heart-necklace': 'snippets/pdp-preview-heart-necklace.liquid',
    'matching-necklaces': 'snippets/pdp-preview-matching-necklaces.liquid',
    'couple-rings': 'snippets/pdp-preview-couple-rings.liquid',
    'charm-name-necklace': 'snippets/pdp-preview-charm-name-necklace.liquid',
    'birthstone-ring': 'snippets/pdp-preview-birthstone-ring.liquid',
    'nameplate': 'snippets/pdp-preview-nameplate.liquid',
    'vertical-name': 'snippets/pdp-preview-vertical-name.liquid'
  };
  for (const item of manifest.products.filter((entry) => entry.mutable && entry.contract !== 'none')) {
    assertTemplateContract(item.handle, snippetByContract[item.contract]);
  }
});

test('dynamic JavaScript stays dependency-free, scoped, and within budget', () => {
  const asset = read('assets/personalization-dynamic.js');
  assert.ok(Buffer.byteLength(asset) <= 16384);
  assert.doesNotMatch(asset, /\binnerHTML\b/);
  assert.doesNotMatch(asset, /\b(jQuery|React|Vue|Angular)\b/);
  const section = read('sections/main-product.liquid');
  const include = section.match(
    /\{%- if preview_type == 'matching-necklaces' or preview_type == 'couple-rings' or preview_type == 'charm-name-necklace' -%\}[\s\S]*?personalization-dynamic\.js[\s\S]*?\{%- endif -%\}/
  );
  assert.ok(include, 'dynamic asset include is not the approved allowlist');
  for (const contract of ['heart-necklace', 'birthstone-ring', 'nameplate', 'vertical-name']) {
    assert.doesNotMatch(include[0], new RegExp(contract));
    const entry = manifest.products.find((item) => item.contract === contract);
    assert.equal(entry.javascript, false);
  }
});

test('new product-scoped CSS remains below the per-page budget', () => {
  const snippets = [
    'snippets/pdp-preview-heart-necklace.liquid',
    'snippets/pdp-preview-matching-necklaces.liquid',
    'snippets/pdp-preview-couple-rings.liquid',
    'snippets/pdp-preview-charm-name-necklace.liquid',
    'snippets/pdp-preview-birthstone-ring.liquid',
    'snippets/pdp-preview-nameplate.liquid',
    'snippets/pdp-preview-vertical-name.liquid'
  ];
  for (const path of snippets) assert.ok(Buffer.byteLength(read(path)) <= 8192, `${path} exceeds 8 KB`);
});
```

Run all tests. Expected: any missing conditional or oversized file fails with its exact assertion.

- [ ] **Step 2: Add Node checks to Theme CI**

After `actions/setup-node@v4`, add:

```yaml
      - name: Personalization contract tests
        run: node --test tests/personalization/*.test.*

      - name: JavaScript syntax
        run: |
          node --check assets/global.js
          node --check assets/personalization-dynamic.js
```

Keep the existing schema, size, endschema, and Theme Check guards unchanged.

- [ ] **Step 3: Run the complete local gate**

```bash
node --test tests/personalization/*.test.*
node --check assets/global.js
node --check assets/personalization-dynamic.js
npx --yes @shopify/cli@latest theme check --fail-level error
git diff --check
```

Expected: all tests PASS, syntax passes, Theme Check has 0 errors, and no whitespace errors.

- [ ] **Step 4: Commit**

```bash
git add tests/personalization/theme-contracts.test.mjs .github/workflows/theme-ci.yml
git commit -m "ci: enforce personalization release contracts"
```

---

### Task 9: Dry-Run-First Shopify Assignment Tool

**Files:**
- Create: `scripts/personalization/admin-contracts.mjs`
- Create: `scripts/personalization/assign-templates.mjs`
- Create: `tests/personalization/admin-assignments.test.mjs`
- Modify or Create: `.gitignore`

**Interfaces:**
- Consumes: manifest and Shopify `productByIdentifier` snapshots.
- Produces: `planAssignments(manifest, products)`, `buildMutationVariables(id, suffix)`, `commercialFingerprint(product)`, dry-run snapshot, apply, and rollback.

- [ ] **Step 1: Write failing pure-function tests**

Create `tests/personalization/admin-assignments.test.mjs`:

```js
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
```

Run: `node --test tests/personalization/admin-assignments.test.mjs`

Expected: FAIL with missing module.

- [ ] **Step 2: Implement the mutation allowlist and stable fingerprint**

Create `scripts/personalization/admin-contracts.mjs`:

```js
import { createHash } from 'node:crypto';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

export function buildMutationVariables(id, templateSuffix) {
  return { product: { id, templateSuffix } };
}

export function commercialFingerprint(product) {
  if (product.variants.pageInfo.hasNextPage || product.media.pageInfo.hasNextPage) {
    throw new Error(`Snapshot pagination incomplete for ${product.handle}`);
  }
  for (const variant of product.variants.nodes) {
    if (variant.media && variant.media.pageInfo.hasNextPage) {
      throw new Error(`Variant media pagination incomplete for ${product.handle}`);
    }
  }
  const value = {
    handle: product.handle,
    title: product.title,
    status: product.status,
    publishedAt: product.publishedAt,
    onlineStoreUrl: product.onlineStoreUrl,
    variants: [...product.variants.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    media: [...product.media.nodes].sort((a, b) => a.id.localeCompare(b.id))
  };
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function validateCatalogContract(item, product) {
  if (item.handle === 'chain-link-necklace-custom-charms') {
    for (const variant of product.variants.nodes) {
      const option = variant.selectedOptions.find((value) => value.name === 'Names');
      if (!option || !/^[2-8]\s+names?$/i.test(option.value)) {
        throw new Error(`Unsupported Names option: ${option ? option.value : 'missing'}`);
      }
    }
  }
  if (item.handle === 'personalized-couple-rings') {
    for (const variant of product.variants.nodes) {
      const names = variant.selectedOptions.map((value) => value.name).sort();
      if (names.join('|') !== 'Ring Size|Style') {
        throw new Error(`Unexpected couple-ring options: ${names.join(', ')}`);
      }
    }
  }
}

export function planAssignments(manifest, products) {
  const byHandle = new Map(products.map((product) => [product.handle, product]));
  const changes = [];
  const verificationMismatches = [];
  for (const item of manifest.products) {
    const product = byHandle.get(item.handle);
    if (!product) throw new Error(`Missing product: ${item.handle}`);
    const actual = product.templateSuffix || '';
    if (!item.mutable) {
      if (actual !== item.templateSuffix) {
        verificationMismatches.push({ handle: item.handle, expected: item.templateSuffix, actual });
      }
      continue;
    }
    if (actual !== item.templateSuffix) {
      changes.push({
        id: product.id,
        handle: item.handle,
        before: actual,
        after: item.templateSuffix,
        fingerprint: commercialFingerprint(product)
      });
    }
  }
  return { changes, verificationMismatches };
}
```

- [ ] **Step 3: Implement the Admin API CLI**

Create `scripts/personalization/assign-templates.mjs` with:

```js
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMutationVariables,
  commercialFingerprint,
  planAssignments,
  validateCatalogContract
} from './admin-contracts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(resolve(ROOT, 'scripts/personalization/product-contracts.json'), 'utf8'));
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rollbackIndex = args.indexOf('--rollback');
const rollbackPath = rollbackIndex >= 0 ? args[rollbackIndex + 1] : null;
const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || '2026-07';

if (!store || !token) {
  throw new Error('Set SHOPIFY_STORE and SHOPIFY_ADMIN_ACCESS_TOKEN; no mutation was attempted.');
}

async function graphql(query, variables) {
  const response = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': token
    },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(JSON.stringify(payload.errors || payload));
  }
  return payload.data;
}

const SNAPSHOT_QUERY = `
  query ProductSnapshot($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
      templateSuffix
      status
      publishedAt
      onlineStoreUrl
      variants(first: 250) {
        nodes {
          id
          title
          price
          compareAtPrice
          inventoryQuantity
          inventoryPolicy
          availableForSale
          selectedOptions { name value }
          media(first: 50) {
            nodes { id }
            pageInfo { hasNextPage }
          }
        }
        pageInfo { hasNextPage }
      }
      media(first: 250) {
        nodes { id mediaContentType }
        pageInfo { hasNextPage }
      }
    }
  }
`;

const UPDATE_MUTATION = `
  mutation AssignTemplate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle templateSuffix }
      userErrors { field message }
    }
  }
`;

async function fetchSnapshot(handle) {
  const data = await graphql(SNAPSHOT_QUERY, { handle });
  if (!data.productByIdentifier) throw new Error(`Missing product: ${handle}`);
  commercialFingerprint(data.productByIdentifier);
  return data.productByIdentifier;
}

async function updateTemplate(id, templateSuffix) {
  const data = await graphql(UPDATE_MUTATION, buildMutationVariables(id, templateSuffix));
  const result = data.productUpdate;
  if (result.userErrors.length) throw new Error(JSON.stringify(result.userErrors));
  return result.product;
}

async function writeSnapshot(products, changes) {
  const directory = resolve(ROOT, '.personalization-snapshots');
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(path, `${JSON.stringify({ release: manifest.release, products, changes }, null, 2)}\n`);
  return path;
}

if (rollbackPath) {
  const rollback = JSON.parse(await readFile(resolve(rollbackPath), 'utf8'));
  if (!apply) {
    console.log(JSON.stringify(rollback.changes.map((item) => ({
      handle: item.handle,
      templateSuffix: item.before
    })), null, 2));
    process.exit(0);
  }
  for (const item of rollback.changes) await updateTemplate(item.id, item.before || '');
  console.log(`Rolled back ${rollback.changes.length} template assignments.`);
  process.exit(0);
}

const products = [];
for (const item of manifest.products) {
  await access(resolve(ROOT, `templates/product.${item.templateSuffix}.json`));
  const product = await fetchSnapshot(item.handle);
  validateCatalogContract(item, product);
  products.push(product);
}
const plan = planAssignments(manifest, products);
const snapshotPath = await writeSnapshot(products, plan.changes);

console.log(JSON.stringify({
  snapshotPath,
  changes: plan.changes.map(({ fingerprint, ...item }) => item),
  verificationMismatches: plan.verificationMismatches
}, null, 2));

if (plan.verificationMismatches.length) {
  throw new Error('Verification-only product mismatch; scope review is required before apply.');
}

if (!apply) {
  console.log('Dry run only. Re-run with --apply after reviewing the snapshot.');
  process.exit(0);
}

for (const item of plan.changes) await updateTemplate(item.id, item.after);

for (const item of plan.changes) {
  const after = await fetchSnapshot(item.handle);
  if (commercialFingerprint(after) !== item.fingerprint) {
    throw new Error(`Commercial catalog drift detected after ${item.handle}`);
  }
  if ((after.templateSuffix || '') !== item.after) {
    throw new Error(`Template assignment did not persist for ${item.handle}`);
  }
}

console.log(`Applied and verified ${plan.changes.length} template assignments.`);
```

Add to `.gitignore`:

```gitignore
.personalization-snapshots/
```

- [ ] **Step 4: Verify dry-run safety locally without credentials**

Run:

```bash
node --test tests/personalization/admin-assignments.test.mjs
node --check scripts/personalization/admin-contracts.mjs
node --check scripts/personalization/assign-templates.mjs
node scripts/personalization/assign-templates.mjs
```

Expected: tests PASS; syntax passes; CLI exits before network access with `Set SHOPIFY_STORE and SHOPIFY_ADMIN_ACCESS_TOKEN`.

- [ ] **Step 5: Commit**

```bash
git add scripts/personalization/admin-contracts.mjs scripts/personalization/assign-templates.mjs tests/personalization/admin-assignments.test.mjs .gitignore
git commit -m "feat: add safe template assignment tooling"
```

---

### Task 10: Storefront Propagation and Contract Probe

**Files:**
- Create: `scripts/personalization/probe-storefront.mjs`
- Create: `tests/personalization/storefront-probe.test.mjs`
- Modify: `docs/deployment.md`

**Interfaces:**
- Consumes: live HTML markers and manifest.
- Produces: `inspectProductHtml(html)` and a CLI that fails on missing/mixed releases or property contracts.

- [ ] **Step 1: Write failing HTML inspection tests**

Create:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertLiveContract,
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
```

Run and expect a missing-module failure.

- [ ] **Step 2: Implement the sequential uncached probe**

Create `scripts/personalization/probe-storefront.mjs`:

```js
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function inspectProductHtml(html) {
  const release = html.match(/data-personalization-release="([^"]+)"/)?.[1];
  const contract = html.match(/data-personalization-contract="([^"]+)"/)?.[1];
  if (!release) throw new Error('Missing personalization release marker');
  if (!contract) throw new Error('Missing personalization contract marker');
  const properties = [...html.matchAll(/name="properties\[([^\]]+)\]"/g)].map((match) => match[1]);
  return { release, contract, properties: [...new Set(properties)].sort() };
}

export function assertLiveContract(item, inspection) {
  if (inspection.contract !== item.contract) {
    throw new Error(`${item.handle}: expected ${item.contract}, got ${inspection.contract}`);
  }
  const actualProperties = inspection.properties.filter((property) => !property.startsWith('_')).sort();
  const expectedProperties = [...item.properties].sort();
  if (JSON.stringify(actualProperties) !== JSON.stringify(expectedProperties)) {
    const expected = expectedProperties.length ? expectedProperties.join(', ') : 'no public properties';
    const actual = actualProperties.length ? actualProperties.join(', ') : 'no public properties';
    throw new Error(`${item.handle}: expected ${expected}, got ${actual}`);
  }
}

async function fetchInspection(url) {
  const probe = new URL(url);
  probe.searchParams.set('_oc_release_probe', `${Date.now()}-${Math.random()}`);
  const response = await fetch(probe, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' }
  });
  if (!response.ok) throw new Error(`${response.status} ${probe}`);
  return inspectProductHtml(await response.text());
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[args.indexOf('--url') + 1];
  const expectedRelease = args[args.indexOf('--release') + 1];
  const countValue = args.includes('--count') ? args[args.indexOf('--count') + 1] : '20';
  const count = Number.parseInt(countValue, 10);
  const contractsMode = args.includes('--contracts');
  if (!url || !expectedRelease || !Number.isInteger(count) || count < 1) {
    throw new Error('Use --url URL --release RELEASE [--count N] [--contracts]');
  }

  const releases = [];
  for (let index = 0; index < count; index += 1) {
    const inspection = await fetchInspection(url);
    releases.push(inspection.release);
    if (inspection.release !== expectedRelease) {
      throw new Error(`Probe ${index + 1} returned ${inspection.release}`);
    }
  }
  if (new Set(releases).size !== 1) throw new Error(`Mixed releases: ${releases.join(', ')}`);

  if (contractsMode) {
    const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
    const manifest = JSON.parse(await readFile(resolve(root, 'scripts/personalization/product-contracts.json'), 'utf8'));
    const origin = new URL(url).origin;
    for (const item of manifest.products.filter((entry) => entry.mutable)) {
      const inspection = await fetchInspection(`${origin}/products/${item.handle}`);
      assertLiveContract(item, inspection);
    }
  }

  console.log(`Verified ${count} consecutive responses for ${expectedRelease}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 3: Document exact publish and rollback commands**

Add to `docs/deployment.md`:

````markdown
## Order-safe personalization release

Before assignments:

```sh
node scripts/personalization/probe-storefront.mjs \
  --url https://ourcoordinates.com/products/matching-coordinates-necklaces \
  --release oc-order-safe-2026-07-13-1 \
  --count 20
```

Assignment dry run:

```sh
SHOPIFY_STORE=store.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=token \
node scripts/personalization/assign-templates.mjs
```

Apply only after reviewing the snapshot:

```sh
SHOPIFY_STORE=store.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=token \
node scripts/personalization/assign-templates.mjs --apply
```

Rollback:

```sh
SHOPIFY_STORE=store.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=token \
node scripts/personalization/assign-templates.mjs \
  --rollback .personalization-snapshots/<snapshot>.json \
  --apply
```
````

Replace `store.myshopify.com`, `token`, and `<snapshot>` with runtime values; none are committed.

- [ ] **Step 4: Verify and commit**

Run storefront-probe tests, all personalization tests, and syntax checks; expect PASS.

```bash
git add scripts/personalization/probe-storefront.mjs tests/personalization/storefront-probe.test.mjs docs/deployment.md
git commit -m "feat: add personalization release probe"
```

---

### Task 11: Pre-Publish Verification and Visual/Performance Review

**Files:**
- No committed files unless a verification defect requires a TDD fix.
- User-facing evidence: `/Users/heckholdings/Documents/Codex/2026-07-12/github-plugin-github-claude-plugins-official/outputs/ourcoordinates-personalization-verification.md`

**Interfaces:**
- Consumes: completed branch.
- Produces: a clean full-gate result, desktop/mobile evidence, form serialization evidence for sold-out products, and a before/after performance comparison.

- [ ] **Step 1: Run the full static gate from a clean branch**

```bash
git status --short
node --test tests/personalization/*.test.*
node --check assets/global.js
node --check assets/personalization-dynamic.js
npx --yes @shopify/cli@latest theme check --fail-level error
git diff --check origin/main...HEAD
```

Expected: clean status, all tests pass, 0 Theme Check errors, no whitespace failures.

- [ ] **Step 2: Confirm the immutable four-sided hashes**

```bash
shasum -a 256 templates/product.four-sided.json snippets/pdp-preview-four-sided.liquid
```

Expected: the two values from Global Constraints exactly.

- [ ] **Step 3: Review each renderer in a real browser**

Use a Shopify preview/development theme when authenticated. If no preview credential is available, perform this step immediately after GitHub publication and before assignments using preview URLs where possible.

For each dedicated renderer, verify:

- desktop 1440×900 and mobile 390×844 layout;
- correct number and shape of jewelry pieces;
- typed text updates with `textContent`;
- metal selection preserves existing price and variant ID behavior;
- required inputs block empty submission;
- keyboard focus and 200% zoom remain usable;
- only dynamic contracts request `personalization-dynamic.js`.

Expected: no console errors, overflow, duplicate property names, or generic bar/four-sided controls.

- [ ] **Step 4: Verify sold-out form serialization without changing availability**

For heart, couple rings, charm necklace, birthstone ring, horizontal nameplate, and vertical nameplate, intercept the product-form submission in the browser and inspect `new FormData(form)` rather than calling `/cart/add.js`.

Expected: heart, couple-ring, birthstone, and nameplate forms contain exactly their manifest properties. The charm form contains `Name 1` through the selected paid count only; later disabled charm fields are absent from `FormData`.

For the currently available matching necklaces, add a temporary test line to cart, verify A/B properties in `/cart.js`, then remove the test line. Do not place an order.

- [ ] **Step 5: Compare performance**

Measure an existing personalized product and a non-personalized product before and after with the `web-perf` workflow. Record:

- transferred JavaScript;
- script request count;
- LCP, CLS, and INP observations;
- whether `personalization-dynamic.js` is absent from non-dynamic products;
- the raw byte sizes enforced by CI.

Expected: no new request on standard/non-custom products and no material regression attributable to this release.

- [ ] **Step 6: Record evidence**

Create the verification report with commands, outputs, screenshots, unavailable-product limitations, and the known `custom-bar-necklace` assignment mismatch. Do not claim live cart coverage for sold-out products.

---

### Task 12: GitHub Publication, Propagation Gate, Template Assignments, and Rollback

**Files:**
- No source changes unless verification finds a defect.

**Interfaces:**
- Consumes: verified branch, GitHub authentication, and optional Shopify Admin credentials.
- Produces: merged `main`, live theme release, then verified template-only assignments or a safe account-access handoff.

- [ ] **Step 1: Rebase safety check and publish branch**

```bash
git fetch origin --prune
git log --oneline --left-right origin/main...HEAD
git status --short
git push -u origin codex/order-safe-personalization
gh pr create --repo ShopHeck/ourcoordinates \
  --base main \
  --head codex/order-safe-personalization \
  --title "Add order-safe product personalization templates" \
  --body "Adds dedicated, order-safe personalization contracts for the approved product set while preserving product, variant, price, inventory, publication, and media data. Includes manifest and static contract tests, JavaScript and per-page asset budgets, dry-run-first template assignment tooling, release propagation checks, and rollback commands. Sold-out products are verified through form serialization rather than live cart mutation. The existing four-sided bar renderer files remain hash-locked; its current live templateSuffix mismatch is intentionally blocked from mutation pending an explicit scope decision."
```

The PR body above records the contracts, catalog-preservation safeguards, tests, sold-out verification limits, and blocked four-sided assignment mismatch.

- [ ] **Step 2: Wait for and inspect GitHub checks**

```bash
gh pr checks --repo ShopHeck/ourcoordinates --watch
```

Expected: Theme CI passes. If it fails, use systematic debugging, add a failing regression test, fix, and push before continuing.

- [ ] **Step 3: Merge to publish through Shopify GitHub sync**

```bash
gh pr merge --repo ShopHeck/ourcoordinates --squash --delete-branch
```

Expected: merged to `main`; Shopify's connected published theme begins syncing. Do not change product assignments yet.

- [ ] **Step 4: Enforce the 20-response propagation gate**

```bash
node scripts/personalization/probe-storefront.mjs \
  --url https://ourcoordinates.com/products/matching-coordinates-necklaces \
  --release oc-order-safe-2026-07-13-1 \
  --count 20
```

Expected: 20 consecutive responses on one release. Any old or missing marker stops the release.

- [ ] **Step 5: Run the catalog assignment dry run**

If `SHOPIFY_STORE` and `SHOPIFY_ADMIN_ACCESS_TOKEN` are available:

```bash
node scripts/personalization/assign-templates.mjs
```

Expected today: dry-run snapshot plus a verification mismatch showing `custom-bar-necklace` expected `four-sided`, actual `vertical-bar`; no mutation.

Because the approved spec makes that handle immutable, stop and request a scope decision before `--apply`. Do not bypass the check.

If Admin credentials remain unavailable, stop after the live theme publish and provide the exact dry-run/apply commands plus required `read_products` and `write_products` access. Do not substitute a broader catalog mutation.

- [ ] **Step 6: Apply only after the mismatch is explicitly resolved**

After explicit approval either to correct that assignment or to revise the verification expectation, update the manifest/spec/test first, rerun the full gate, then:

```bash
node scripts/personalization/assign-templates.mjs --apply
```

Expected: mutations contain only `id` and `templateSuffix`; post-apply commercial fingerprints are unchanged.

- [ ] **Step 7: Verify all live contracts**

```bash
node scripts/personalization/probe-storefront.mjs \
  --url https://ourcoordinates.com/products/matching-coordinates-necklaces \
  --release oc-order-safe-2026-07-13-1 \
  --count 20 \
  --contracts
```

Expected: every mutable handle renders its manifest contract and exact properties.

- [ ] **Step 8: Roll back on any contract or catalog failure**

```bash
node scripts/personalization/assign-templates.mjs \
  --rollback .personalization-snapshots/<snapshot>.json \
  --apply
```

Then revert the merged GitHub commit through a new PR so Shopify sync restores the prior theme revision. Re-run the 20-response probe against the restored marker before declaring rollback complete.

- [ ] **Step 9: Final verification**

Run all static tests again from current `main`, verify live desktop/mobile contracts, confirm the catalog fingerprint, and update the user-facing verification report with the PR, merge commit, live marker count, assignment snapshot path, and any account-bound remainder.
