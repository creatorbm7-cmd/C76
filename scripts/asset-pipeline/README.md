# C7 Winners — Asset Pipeline (Tier 1: read-only)

A safe, repeatable audit & validation tool for the V2 art-slot system.

**What it does NOT do** (by design): no production writes, no deploys, no
changes to the frozen V2 app, and no reads/writes of balances, payments, or the
game catalog. It only inspects source files + local images and prints/writes
reports. Zero npm dependencies (pure Node ≥ 18, ESM).

> This is the Tier 1 slice of the end-to-end automation spec. ZIP/HTML5 game
> publishing, UID assignment, and catalog/provider/launcher mapping (Tier 2)
> are intentionally **out of scope** — they touch backend/routing/schema, which
> the project guardrails forbid without an explicit owner decision.

## Commands

```bash
# 1) List every bindable slot key: wired (a V2 component consumes it) vs
#    legacy, plus the recommended PNG size and whether alpha is required.
node scripts/asset-pipeline/cli.mjs slots

# 2) Audit: cross-reference slots with repo fallback art and (optionally) a
#    Supabase app_assets export. Writes reports to scripts/asset-pipeline/reports/.
node scripts/asset-pipeline/cli.mjs audit
node scripts/asset-pipeline/cli.mjs audit --bound app_assets.json

# 3) Validate a folder of generated PNGs named <slot-key>.png against the
#    recommended size + transparency. Writes a ready-to-upload manifest.
node scripts/asset-pipeline/cli.mjs validate ./generated-assets
```

## Naming convention for `validate`

Name each generated file by the exact slot key it targets, e.g.:

```
v2.nav.bank.png        v2.qa.deposit.png       v2.jackpot.wheel.png
v2.hero.frame.png      v2.badge.hot.png        game.17205.png
```

`validate` checks: the key is a real slot, the image is readable, transparency
is present where required, and the dimensions match the recommended size. Files
that PASS/WARN are listed in `reports/ready-to-upload.json`; FAILs are excluded
and set a non-zero exit code so you can gate a script on a clean run.

## Getting the `--bound` snapshot (optional)

To show real binding status in `audit`, export the bound keys from Supabase and
pass the file. Either shape works:

```json
["v2.nav.bank", "game.17205"]
```
```json
[{ "asset_key": "v2.nav.bank" }, { "asset_key": "game.17205" }]
```

Without `--bound`, binding status is reported as `unknown` (the audit still runs
fully on the source + fallback side).

## Reports (git-ignored)

Written to `scripts/asset-pipeline/reports/` (ignored by git — regenerate any
time):

- `slot-binding-report.md` / `.json` — per-slot wired/size/α/bound + fallback health
- `asset-inventory.json` — every repo PNG/WEBP with dimensions + alpha
- `validation-report.md` + `ready-to-upload.json` — from `validate`
