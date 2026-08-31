# Home lobby 3D art assets (`/public/icons/home/`)

Drop transparent **PNG/WebP** files here named exactly as the ids below and they
replace the emoji/gradient fallback in the lobby home (`DiuHome`) automatically —
**no code or layout change** (handled by `HomeArt`, mirroring `GameArt`).

Recommended export: **transparent WebP, ~512×512** (square art) or the slot ratio
noted below, premium 3D render with soft studio lighting + subtle gloss — match
the "Slot Winners" richness. Keep the subject centered with a little padding.

## Asset ids

| File | Slot | Where it shows |
|------|------|----------------|
| `banner-monthly-card.webp` | ~98×76 | Promo carousel — "Monthly Card" banner |
| `banner-aviator.webp`      | ~98×76 | Promo carousel — "Aviator" banner |
| `banner-agent.webp`        | ~98×76 | Promo carousel — "Agent" banner |
| `pick-aviator.webp`        | ~70×70 | "Top Pick" featured character |
| `dep-upi.webp`             | ~30×30 | Deposit row — UPI icon |
| `dep-usdt.webp`            | ~30×30 | Deposit row — USDT icon |

Game tile art lives separately in `/public/icons/games/<game-id>.webp`
(see `public/icons/games/README.md`).

## How it works
`HomeArt` requests `/icons/home/<id>.webp`. While it loads (or if it's missing),
the emoji/gradient fallback stays visible — so the lobby never shows a broken
image. The CSS slots (`.uo-bn-art`, `.uo-pick-emoji`, `.uo-dep-ic`, …) are fixed
size, so a dropped-in asset inherits the exact premium layout.

## Feature side-panel icons (QuickFeaturesPanel)
Drop `/icons/home/feat-<id>.webp` to replace the emoji fallback:
`feat-notice`, `feat-promo`, `feat-invite`, `feat-records`, `feat-leaderboard`, `feat-vip`, `feat-rewards`, `feat-contact` (~40×40, transparent 3D).
