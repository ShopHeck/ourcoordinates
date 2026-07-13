# Deploying this theme to Shopify

## The pipeline

```
edit → PR (Theme CI validates) → merge to main → Shopify GitHub sync → live theme
```

The store's **published theme is `ourcoordinates/main`**, connected to this
repository's `main` branch through Shopify's GitHub integration. Every merge
to `main` syncs to the live theme automatically, file by file, within
seconds (observed lag ≈ 4–6 s on every merge since July 5, 2026). No secrets,
CI, or manual pushes are involved in normal deploys.

Two consequences worth knowing:

- **Git is the source of truth.** Nobody edits this theme in the Shopify
  code editor or theme editor (there are no `shopify[bot]` reverse-sync
  commits in the history). Section/template edits made on the Shopify side
  would be committed back to `main` by the integration — keep it that way,
  or make the change in git instead.
- **`config/settings_data.json` is effectively frozen** at its initial
  version until someone saves theme settings in the editor (which would
  commit back here). The merchant-setup steps in `AUDIT.md` §4 still assume
  settings are made in the theme editor — that's fine; they'll sync back.

## The sync's silent failure mode (July 12, 2026 incident)

**Symptom:** PRs #5–#6 (star-map preview, cuff redesign) merged cleanly but
the product pages didn't change. Everything looked deployed — most files
were — yet the previews stayed old.

**Root cause (corrected — the real one).** The sync rejected
`sections/main-product.liquid` because its **`{% schema %}` was invalid**:
the `set_necklace_style` select had an option label of 54 characters, and
**Shopify caps schema option labels at 50**. The actual sync log is
unambiguous:

```
Error: sections/main-product.liquid, Validation failed: Invalid schema:
setting with id="set_necklace_style" option label is too long (max 50 characters)
```

Shopify refuses that one file on **every** sync (`8 succeeded … 2 failed`,
yet "Theme updated!") while every valid file updates — no failed GitHub
check, nothing in the repo to see. `shopify theme check` does **not**
validate option-label length, so it passed locally and the bad schema
merged clean.

> **The "~50 KB size cap" was a misdiagnosis.** Earlier notes in this file
> blamed a silent per-file size limit. That was wrong. The PR #2 section
> synced only because it *predated* `set_necklace_style` (valid schema) —
> not because it was smaller. Splitting the file to shrink it never touched
> the real defect, which is why the previews still didn't ship after the
> split. The split is fine to keep (smaller sections are easier to work on),
> but the fix that actually made the section sync was shortening the label.

**Cascade:** because the live `main-product` section never updated, JSON
templates validating against the *live* (old) schema at sync time had their
`set_necklace_style` setting stripped — degrading the five set pages
(`product.complete-set`, `product.necklace-bracelet-set`,
`product.necklace-keychain-set`, `product.ring-bracelet-set`,
`product.ring-necklace-set`) to the legacy same-text-on-every-piece
preview. Once the section's schema is valid and live, they validate and
regain the setting.

**Fix:**

1. **The actual fix:** the `set_necklace_style` `four-sided` option label was
   shortened from 54 to 44 characters (`"4-sided pendant (per-side inputs +
   previews)"`). The option **value** (`four-sided`) is unchanged, so the five
   set templates that key off it are unaffected — only the display label the
   theme editor shows got shorter. With a valid schema, Shopify accepts the
   section and it syncs.
2. **The guard that would have caught it:** Theme CI now parses each section's
   `{% schema %}` and **fails any option label longer than 50 characters** —
   the validation `shopify theme check` skips. This is the check that turns a
   silent sync rejection into a red PR.
3. A CI guard **fails any PR that leaves content after `{% endschema %}`** in a
   section — content there can invalidate the section server-side (theme-check
   tolerates it). A real hazard, independent of this incident.
4. A CI **size guard** (section/snippet ≤ 50,224 bytes) is kept as
   defense-in-depth. Note this was *not* the root cause — but the split it
   encouraged is a fine maintainability win and stays.
5. `sections/main-product.liquid` remains split from 62.7 KB to ~21 KB (eight
   `snippets/pdp-preview-*.liquid` + `snippets/pdp-json-ld.liquid`), verified
   byte-identical: re-inlining the snippets reconstructs the original exactly.
6. The five set templates carry `set_necklace_style` in git and revalidate
   against the now-valid live schema.

> **History note (re-applied cleanly).** The split above was first shipped,
> then rolled back the same day — not because the split was wrong (it wasn't;
> the byte-identical reconstruction still holds), but because a series of
> panicked re-sync "nudges" introduced the `endschema` bug above and the
> live theme's state could no longer be *verified* from the session (the
> read-only Shopify connector was unavailable). The safe move was to restore
> the last-known-good theme. The split was then re-applied from the clean
> pre-nudge commit, re-verified byte-for-byte against the pre-split section,
> and shipped with the second guard added. The lesson: after a merge, give
> the sync ~30 s and verify by checksum — don't byte-touch files in a loop
> to "force" a re-sync.

If a file ever seems not to deploy again: compare `checksumMd5` from the
Admin API (`theme(id:).files(...)`) against `git show main:<file> | md5sum`
— mismatched or stale `updatedAt` files are the ones the sync skipped.

## Manual deploy fallback

Normally unnecessary. If the GitHub integration is ever disconnected or you
need to push to a preview theme:

- **GitHub Actions:** Actions tab → **Theme CI** → *Run workflow*
  (optionally enter a theme ID; empty = live theme). One-time setup —
  repo secrets:
  1. `SHOPIFY_CLI_THEME_TOKEN` — Shopify admin → Apps → **Theme Access** →
     create a password (`shptka_…`).
  2. `SHOPIFY_STORE` — the store's `*.myshopify.com` domain.

- **From a laptop:**

  ```sh
  npm install -g @shopify/cli
  shopify theme push --store your-store.myshopify.com \
    --live --allow-live --nodelete --ignore config/settings_data.json
  ```

Both paths exclude `config/settings_data.json` (merchant editor settings
survive) and never delete store-only files (`--nodelete`).

- **Via Claude:** sessions with the Shopify connector can read the live
  theme (verify checksums, diagnose) but Admin-API writes to the
  *published* theme are blocked by policy — fixes flow through git and the
  sync, which is the correct path anyway. If Claude reports the connector
  token expired, re-authorize it at claude.ai → Settings → Connectors.

## Order-safe personalization release

Before assignments:

```sh
node scripts/personalization/probe-storefront.mjs \
  --url https://ourcoordinates.com/products/matching-coordinates-necklaces \
  --release oc-order-safe-2026-07-13-1 \
  --count 20 \
  --delay-ms 3000
```

The delay is intentional: cache-busted requests are paced to avoid Shopify storefront throttling while still requiring 20 consecutive responses from one release.

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

Replace `store.myshopify.com`, `token`, and `<snapshot>` with runtime values; none are committed.
