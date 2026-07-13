# Birthstone Ring Two-Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the birthstone ring preview/month experience with exactly two required name inputs and publish the change without altering the Shopify catalog.

**Architecture:** Keep the existing `birthstone-ring` template suffix and `main-product` dispatch branch. Replace only its focused Liquid snippet, update the contract manifest and editor copy, and bump the release marker so storefront propagation can be verified independently. No new JavaScript or dependencies are introduced.

**Tech Stack:** Shopify Liquid, JSON templates/contracts, Node.js `node:test`, Shopify Theme Check, GitHub Actions, Shopify GitHub theme integration.

## Global Constraints

- Both text inputs are required and appear in this order: `Name 1:`, then `Name 2:`.
- Public Shopify line-item property names are exactly `Name 1` and `Name 2` without colons.
- Remove the SVG preview, birthstone-month controls, old `Birth Month` property, old `Engraving` property, preview hint, and character counter.
- Keep the renderer Liquid/HTML only and keep dynamic personalization JavaScript disabled for `birthstone-ring`.
- Do not change products, variants, options, prices, inventory, images, media, handles, or template assignments.
- Do not modify `templates/product.four-sided.json` or `snippets/pdp-preview-four-sided.liquid`.

---

### Task 1: Replace the birthstone order contract test-first

**Files:**
- Modify: `tests/personalization/theme-contracts.test.mjs`
- Modify: `snippets/pdp-preview-birthstone-ring.liquid`
- Modify: `scripts/personalization/product-contracts.json`
- Modify: `sections/main-product.liquid`

**Interfaces:**
- Consumes: the existing `birthstone-ring` template suffix and `assertTemplateContract(handle, snippetPath)` test helper.
- Produces: a Liquid form fragment whose only public properties are `Name 1` and `Name 2`.

- [ ] **Step 1: Replace the birthstone-specific test with an exact two-name contract**

Use this test body:

```js
test('birthstone ring collects exactly two required names without a preview', () => {
  assertTemplateContract('custom-birthstone-rings', 'snippets/pdp-preview-birthstone-ring.liquid');
  const item = byHandle.get('custom-birthstone-rings');
  const snippet = read('snippets/pdp-preview-birthstone-ring.liquid');
  const inputs = [...snippet.matchAll(/<input\b[^>]*name="properties\[([^\]]+)\]"[^>]*>/g)];

  assert.deepEqual(item.properties, ['Name 1', 'Name 2']);
  assert.deepEqual(inputs.map((match) => match[1]), ['Name 1', 'Name 2']);
  for (const [tag] of inputs) {
    assert.match(tag, /type="text"/);
    assert.match(tag, /\brequired\b/);
  }
  assert.ok(snippet.indexOf('Name 1:</label>') < snippet.indexOf('Name 2:</label>'));
  assert.doesNotMatch(
    snippet,
    /<svg|Birth Month|properties\[Engraving\]|type="radio"|data-engrave-preview|data-engrave-input|data-engrave-count/
  );
  assert.equal(item.javascript, false);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="birthstone ring" tests/personalization/theme-contracts.test.mjs
```

Expected: FAIL because the manifest still contains `Birth Month` and `Engraving`, and the snippet still contains the SVG/month/engraving interface.

- [ ] **Step 3: Replace the birthstone snippet with the minimal required inputs**

Use this complete snippet:

```liquid
<div class="engrave-field birthstone-contract" data-birthstone-ring>
  <label for="birthstone-name-1">Name 1:</label>
  <input id="birthstone-name-1" type="text"
         name="properties[Name 1]"
         maxlength="{{ engraving_max }}"
         required autocomplete="off">

  <label for="birthstone-name-2">Name 2:</label>
  <input id="birthstone-name-2" type="text"
         name="properties[Name 2]"
         maxlength="{{ engraving_max }}"
         required autocomplete="off">
</div>
```

- [ ] **Step 4: Update the manifest and section copy**

Change the `custom-birthstone-rings` manifest properties to:

```json
"properties": ["Name 1", "Name 2"]
```

Change the render call to pass only `engraving_max`:

```liquid
{% render 'pdp-preview-birthstone-ring', engraving_max: section.settings.engraving_max %}
```

Change the schema label to:

```json
{ "value": "birthstone-ring", "label": "Birthstone ring (two required names)" }
```

- [ ] **Step 5: Run the focused test and full personalization suite**

Run:

```bash
node --test --test-name-pattern="birthstone ring" tests/personalization/theme-contracts.test.mjs
node --test tests/personalization/*.test.*
```

Expected: the focused test passes and all personalization tests pass.

- [ ] **Step 6: Commit the contract change**

```bash
git add tests/personalization/theme-contracts.test.mjs snippets/pdp-preview-birthstone-ring.liquid scripts/personalization/product-contracts.json sections/main-product.liquid
git commit -m "Update birthstone personalization to two names"
```

### Task 2: Version and verify the release

**Files:**
- Modify: `tests/personalization/theme-contracts.test.mjs`
- Modify: `scripts/personalization/product-contracts.json`
- Modify: `sections/main-product.liquid`

**Interfaces:**
- Consumes: existing `data-personalization-release` marker and storefront propagation probe.
- Produces: release marker `oc-order-safe-2026-07-13-2` in both source-of-truth locations.

- [ ] **Step 1: Update the release assertion first**

Change the manifest release assertion to:

```js
assert.equal(manifest.release, 'oc-order-safe-2026-07-13-2');
```

Change the main-product release assertion to:

```js
assert.match(section, /oc-order-safe-2026-07-13-2/);
```

- [ ] **Step 2: Run the release test and verify RED**

Run:

```bash
node --test --test-name-pattern="manifest has" tests/personalization/theme-contracts.test.mjs
```

Expected: FAIL because the manifest still contains `oc-order-safe-2026-07-13-1`.

- [ ] **Step 3: Bump both production release markers**

Set `scripts/personalization/product-contracts.json` release and `sections/main-product.liquid` `personalization_release` to:

```text
oc-order-safe-2026-07-13-2
```

- [ ] **Step 4: Run complete local verification**

Run:

```bash
node --test tests/personalization/*.test.*
node --check assets/personalization-dynamic.js
node --check scripts/personalization/admin-contracts.mjs
node --check scripts/personalization/assign-templates.mjs
node --check scripts/personalization/probe-storefront.mjs
npx shopify theme check
git diff --check origin/main
shasum -a 256 templates/product.four-sided.json snippets/pdp-preview-four-sided.liquid
```

Expected: all tests and syntax checks pass; Theme Check exits zero; diff check is clean; protected hashes remain `a94096c080f0c78b75d894b73e12922fd5488af853130f775b47b7c3930dee74` and `c1f30f2a7e1aaa0eaa566c1caae248169931aaff4d04cd217985e506a66f0527`.

- [ ] **Step 5: Commit the release marker**

```bash
git add tests/personalization/theme-contracts.test.mjs scripts/personalization/product-contracts.json sections/main-product.liquid
git commit -m "Bump personalization release marker"
```

### Task 3: Publish and verify the live alternate template

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: feature branch commits and Shopify's GitHub-connected `main` theme.
- Produces: merged GitHub pull request and live release evidence without catalog mutation.

- [ ] **Step 1: Confirm publish scope and GitHub authentication**

Run:

```bash
git status -sb
git diff --stat origin/main...HEAD
gh --version
gh auth status
```

Expected: only the spec, plan, test, birthstone snippet, manifest, and main product section are in scope; GitHub CLI is authenticated.

- [ ] **Step 2: Push and open the pull request**

```bash
git push -u origin agent/birthstone-two-names
gh pr create --draft --base main --head agent/birthstone-two-names \
  --title "Use two required names for birthstone rings" \
  --body $'## Summary\n\n- replace the birthstone preview and month selector with two required name inputs\n- submit exactly Name 1 and Name 2 while preserving the catalog and template assignment\n- keep the renderer Liquid-only and bump the storefront release marker\n\n## Validation\n\n- node --test tests/personalization/*.test.*\n- JavaScript syntax checks\n- Shopify Theme Check\n- protected four-sided source hashes'
```

The PR body must describe the two-name contract, removed preview/month controls, unchanged catalog, test evidence, and page-speed impact.

- [ ] **Step 3: Mark ready, require Theme CI, and merge**

```bash
gh pr ready
gh pr checks --watch
gh pr merge --squash --delete-branch
```

Expected: Theme CI succeeds before merge.

- [ ] **Step 4: Wait for and verify storefront propagation**

Run:

```bash
node scripts/personalization/probe-storefront.mjs \
  --url "https://ourcoordinates.com/products/custom-birthstone-rings?view=birthstone-ring" \
  --release oc-order-safe-2026-07-13-2 \
  --count 20 \
  --delay-ms 3000
```

Expected: `Verified 20 consecutive responses for oc-order-safe-2026-07-13-2.`

- [ ] **Step 5: Verify live form behavior at desktop and mobile widths**

Open the alternate-template URL at 1440 by 900 and 390 by 844. Confirm two text inputs, labels `Name 1:` and `Name 2:` in order, both `required`, no SVG/month controls, no horizontal overflow, no request for `personalization-dynamic.js`, and serialized public properties exactly `Name 1` and `Name 2` after entering test values.

- [ ] **Step 6: Synchronize the local checkout and report evidence**

```bash
git switch main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
```

Expected: clean `main` at the merged commit.
