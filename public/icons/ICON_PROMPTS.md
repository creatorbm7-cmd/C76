# C7 — Cartoon 3D icon generation guide

Generate ORIGINAL cartoon-3D icons (do NOT copy YonoArcade / any branded art)
with an AI image tool (Midjourney, DALL·E, Stable Diffusion, Leonardo, etc.),
export as **transparent WebP/PNG**, and drop into the folders below. The app
shows them automatically — no code change (HomeArt / GameArt).

## Shared style (paste into every prompt)
> premium mobile casino game icon, glossy 3D cartoon render, soft studio
> lighting, rich emerald-green + gold palette, subtle rim light, bold readable
> silhouette, centered subject, transparent background, high detail, app-store
> quality, square 1:1 — NOT flat, NOT text-heavy

## Game tiles → `public/icons/games/<id>.webp`  (square, ~512×512)
Use the game id as filename. Per-game subject prompt (prefix with the shared style):
- `aviator.webp`   → "a cute cartoon red biplane soaring, motion trail"
- `crash.webp`     → "a glowing cartoon rocket bursting upward, sparks"
- `mines.webp`     → "a glossy cartoon bomb with a lit fuse + gold star"
- `dice.webp`      → "two glossy 3D dice mid-tumble, gold pips"
- `plinko.webp`    → "a cartoon peg board with a glowing ball dropping"
- `wheel.webp`     → "a shiny fortune wheel, gold rim, jewel segments"
- `slots.webp`     → "a chunky cartoon slot machine, triple 7s, coins"
- `fishing.webp`   → "a friendly cartoon fish + golden hook, splash"
- `teen-patti.webp`→ "three glossy playing cards fanned, gold corners"
- `dragon-tiger.webp`→ "cartoon dragon vs tiger emblem, gold frame"
- `keno.webp`      → "glossy numbered lottery balls in a bowl"
- `limbo.webp`     → "a neon rocket gauge climbing a multiplier"
  (…repeat for every id in public/icons/games/README.md)

## Lobby art → `public/icons/home/<id>.webp`
- `banner-aviator.webp`     (~98×76) → "cartoon airplane + leaderboard trophy"
- `banner-monthly-card.webp`(~98×76) → "glossy monthly reward card + coins"
- `banner-agent.webp`       (~98×76) → "two cartoon hands shaking, gold coins"
- `pick-aviator.webp`       (~70×70) → "hero cartoon airplane, instant-cashout vibe"
- `dep-upi.webp` / `dep-usdt.webp` (~30×30) → "glossy UPI badge" / "glossy USDT coin"

## Feature panel → `public/icons/home/feat-<id>.webp`  (~40×40)
`feat-notice` (megaphone) · `feat-promo` (gold ticket) · `feat-invite` (gift box)
· `feat-records` (clipboard) · `feat-leaderboard` (trophy) · `feat-vip` (crown)
· `feat-rewards` (check medal) · `feat-contact` (headset) — each glossy 3D, gold+green.

## Tips
- Keep a little transparent padding so nothing clips in the rounded slots.
- Batch-generate at 1:1, then bulk-convert to WebP (`cwebp` or squoosh).
- Reuse the shared style line for a consistent set.
