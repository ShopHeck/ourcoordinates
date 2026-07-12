# Deploying this theme to Shopify

## The pipeline (read this once)

```
edit → PR → merge to main → GitHub Action pushes to the LIVE theme
```

**Merging to `main` does not, by itself, change the store.** This repository
is not connected to the Shopify admin's GitHub theme integration — there is
no `shopify[bot]` in the commit history and no connected-theme entry in the
store's theme library that tracks this repo. Until July 2026 the final
"push to Shopify" step was done by hand (Claude sessions with the Shopify
connector, or Shopify CLI from a laptop), which is why a merge could quietly
end up in git only.

`.github/workflows/deploy-theme.yml` now automates that step: every merge to
`main` that touches theme files validates the theme (`shopify theme check`)
and pushes it to the **published** theme. It can also be run manually from
the **Actions** tab — including against a specific unpublished theme ID for
previewing.

## Incident that prompted this — July 12, 2026

PRs #5 and #6 (star-map astronomy preview, cuff engraving redesign) merged
cleanly to `main` but never appeared on the live site. Audit findings:

- Both merges were complete and correct on GitHub `main` (`ffcf8ac`).
- The theme at that commit is fully valid — Theme Check passes with 0 errors,
  all template JSON parses, every referenced section exists. Nothing about
  the commits could have been rejected by a sync.
- The repo has never had a deploy pipeline, and the store shows no trace of
  the GitHub integration (no reverse commits from theme-editor edits ever).
- Conclusion: the "transfer" was always a manual push. Rounds 1–3 were pushed
  by the sessions that authored them; round 4's push never happened, so the
  merge stopped at git.

Fix: the deploy workflow above, plus a one-off sync of `main` to the live
theme.

## One-time setup (≈5 minutes)

1. **Create a Theme Access password**
   - Shopify admin → **Apps** → search **Theme Access** (by Shopify) → install.
   - Create a password for the developer/owner email — you receive a token
     starting with `shptka_`.
2. **Add the two repository secrets**
   (GitHub → repo → Settings → Secrets and variables → Actions):
   - `SHOPIFY_CLI_THEME_TOKEN` → the `shptka_…` token
   - `SHOPIFY_STORE` → the store's `*.myshopify.com` domain (not the custom
     domain)
3. Re-run the failed **Deploy theme to Shopify** run (or push any theme file
   to `main`) and confirm it goes green.

## Manual fallbacks

- **From a laptop:**

  ```sh
  npm install -g @shopify/cli
  shopify theme push --store your-store.myshopify.com \
    --live --allow-live --nodelete --ignore config/settings_data.json
  ```

  (Log in with the store owner account when prompted, or set
  `SHOPIFY_CLI_THEME_TOKEN`.)

- **Via Claude:** any session with the Shopify connector authorized can push
  theme files through the Admin API (`themeFilesUpsert`). If Claude reports
  the connector token expired, re-authorize it in claude.ai → Settings →
  Connectors → Shopify.

## Safety properties of the deploy

- **Merchant settings are never overwritten**: `config/settings_data.json`
  is excluded from every push, so choices made in the theme editor (gifting
  products, occasion dates, app blocks) survive deploys.
- **Store-only files are never deleted**: `--nodelete` keeps assets and
  templates that exist only on the store (app-generated files, editor-created
  templates).
- **Invalid themes don't deploy**: the push is gated on
  `shopify theme check --fail-level error`.
- **Caveat**: JSON templates and sections in this repo are the source of
  truth — section changes made in the theme editor to files that exist here
  will be overwritten on the next deploy. Make layout changes in git, or
  copy them back into the repo.
