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

**Root cause:** the GitHub sync **silently skips section files larger than
~50 KB**. `sections/main-product.liquid` grew from 50,224 bytes (PR #2,
the last version that ever synced) to 54,375 (PR #3) and then 62,708 bytes
(PR #5). From PR #3 onward the sync updated every other file within seconds
of each merge but left `main-product.liquid` frozen at the PR #2 version —
no error in GitHub, no failed check, nothing in the repo to see. Checksum
comparison of the live theme against `main` via the Admin API is what
exposed it.

**Cascade:** JSON templates are validated against the *live* section schema
at sync time. Because the live `main-product` schema was stale, all five
set templates (`product.complete-set`, `product.necklace-bracelet-set`,
`product.necklace-keychain-set`, `product.ring-bracelet-set`,
`product.ring-necklace-set`) had their `set_necklace_style` setting
silently stripped when they synced (Shopify rewrote them with an
"auto-generated" banner). That degraded the set pages to the legacy
same-text-on-every-piece preview.

**Fix (July 12, 2026):**

1. `sections/main-product.liquid` was split from 62.7 KB to ~21 KB — the
   eight engraving-preview bodies and the JSON-LD block moved to
   `snippets/pdp-preview-*.liquid` / `snippets/pdp-json-ld.liquid`
   (verified as a byte-identical move: inlining the snippets back
   reconstructs the original file exactly).
2. The five set templates were re-serialized so the sync re-uploads them
   once the new schema is live, restoring `set_necklace_style`.
3. Theme CI (`.github/workflows/theme-ci.yml`) now **fails any PR that
   pushes a section or snippet past 48,000 bytes**, so this class of
   failure can't merge silently again.

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
