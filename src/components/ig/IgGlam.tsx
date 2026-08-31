// IgGlam — shared "rich glass + emerald glow + gold shimmer + HDR" enhancement.
//
// Drop <IgGlam /> inside a page's `.ig` root (after its own <style>) to deepen the
// glass, add emerald glow halos behind cards/icons, a gold sheen sweep on press,
// richer saturation and a subtle sparkle. Purely additive presentation — it changes
// no layout, routes, data or logic, and is reduced-motion safe.
//
// Proof pages: Home + Profile. Cascade = add <IgGlam /> to the other /ig pages.
export default function IgGlam() {
  return <style>{CSS}</style>;
}

const CSS = `
/* ── Ambient: a touch more depth on the header (no root filter — it would
     re-anchor the fixed bottom nav). Saturation is applied per-surface below. ── */
.ig-top { -webkit-backdrop-filter:blur(16px) saturate(1.2); backdrop-filter:blur(16px) saturate(1.2); }

/* ── Profile grid "posts": deep glass, emerald inner glow, gold sheen sweep ── */
.ig .igp-cell {
  position:relative; overflow:hidden;
  background:
    radial-gradient(120% 90% at 50% -6%, rgba(55,226,154,0.18), transparent 60%),
    linear-gradient(180deg, rgba(22,73,47,0.94), rgba(8,30,19,0.95));
  border:1px solid rgba(240,201,74,0.36);
  box-shadow:
    inset 0 1px 0 rgba(246,230,176,0.20),
    inset 0 0 24px rgba(46,224,138,0.12),
    0 18px 42px -20px rgba(0,0,0,0.88);
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
}
.ig .igp-cell::before {
  content:""; position:absolute; top:12%; left:50%; width:66%; aspect-ratio:1; transform:translateX(-50%);
  background:radial-gradient(circle, rgba(46,224,138,0.24), transparent 62%); filter:blur(7px); pointer-events:none; z-index:0;
}
.ig .igp-cell::after {
  content:""; position:absolute; inset:0; pointer-events:none; z-index:2;
  background:linear-gradient(115deg, transparent 42%, rgba(255,241,196,0.18) 50%, transparent 58%);
  transform:translateX(-125%);
}
.ig .igp-cell > * { position:relative; z-index:1; }
.ig .igp-cell:active::after { animation:igGlamShine 0.85s ease; }
@keyframes igGlamShine { to { transform:translateX(125%); } }
.ig .igp-cell-art { filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(240,201,74,0.38)); }
.ig .igp-cell-l { text-shadow:0 1px 2px rgba(0,0,0,0.55); }

/* Highlight rings + avatar: brighter, glowing */
.ig .igp-hl-ring { box-shadow:0 0 16px -2px rgba(240,201,74,0.62), 0 0 30px -8px rgba(46,224,138,0.55); }
.ig .igp-hl-in { box-shadow:inset 0 0 15px rgba(46,224,138,0.20); }
.ig .igp-ava { box-shadow:0 0 26px -4px rgba(240,201,74,0.72), 0 0 44px -12px rgba(46,224,138,0.55); }
.ig .igp-btn--solid { box-shadow:inset 0 1px 0 rgba(255,255,255,0.72), 0 9px 24px -8px rgba(240,201,74,0.78); }

/* ── Home: glossier stories, feed media, C74 + bonus surfaces ── */
.ig .ig-story-badge, .ig .ig-story-me, .ig .ig-story-av { box-shadow:0 0 16px -3px rgba(240,201,74,0.5); }
.ig .ig-media { box-shadow:inset 0 1px 0 rgba(246,230,176,0.16), 0 20px 46px -22px rgba(0,0,0,0.88), 0 0 34px -16px rgba(46,224,138,0.45); }
.ig .ig-media--bonus, .ig .ig-media--c74 { position:relative; }
.ig .ig-media--bonus::after, .ig .ig-media--c74::after {
  content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  background:radial-gradient(120% 80% at 100% 0%, rgba(240,201,74,0.16), transparent 55%);
}
.ig .ig-bonus-v, .ig .ig-c74-v { text-shadow:0 0 18px rgba(240,201,74,0.35); }
.ig .ig-pill--solid { box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 16px -6px rgba(240,201,74,0.65); }

/* ── Cascade: rich glass glow on the main surfaces of every /ig page ── */
/* HDR 3D pop — richer saturation/contrast + specular glow on the premium art so
   it reads crisp and high-dynamic-range (true 4K sharpness comes from hi-res
   source PNGs). Hero emblems (12+ pages use *-hero) + story badges. */
.ig [class*="hero"] img { filter:saturate(1.14) contrast(1.07) brightness(1.03)
    drop-shadow(0 4px 10px rgba(0,0,0,0.5)) drop-shadow(0 0 14px rgba(240,201,74,0.45)) drop-shadow(0 0 22px rgba(46,224,138,0.32)); }
.ig .ig-story-badge img, .ig .igp-hl-in img { filter:saturate(1.14) contrast(1.06) brightness(1.03); }
/* Card / panel / balance surfaces across pages — rich gold-framed emerald
   "cabinet": crisp gold inner ring + emerald inner glow + gold/emerald halo, so
   the premium parts-sheet look cascades to Rewards, VIP, Missions, C74, Wallet,
   Analytics, Support, KYC, Events, Bank, Invite, Leaderboard, etc. at once. */
.ig .igbon-card, .ig .igcry-card, .ig .igwd-card, .ig .iginv-card, .ig .igvip-card,
.ig .igset-card, .ig .igresp-card, .ig .iglb-card, .ig .igbank-panel,
.ig .igw-bal, .ig .igwd-bal, .ig .igdemo-bal, .ig .igbon-bal, .ig .igevt-card,
.ig .igrw-card, .ig .igsup-card, .ig .igkyc-card, .ig .igmis-card, .ig .iganl-card,
.ig .igtok-card, .ig .igmine-card, .ig .igc74-card, .ig .igrep-card, .ig .igvip-tier,
.ig .ige-card, .ig .ige-cell, .ig .ige-tile, .ig .igdep-card, .ig .igcry-card {
  box-shadow:
    inset 0 0 0 1.4px rgba(240,201,74,0.55),
    inset 0 1.5px 0 rgba(255,255,255,0.35),
    inset 0 14px 24px -14px rgba(255,255,255,0.20),
    inset 0 0 26px rgba(46,224,138,0.14),
    0 0 22px -8px rgba(240,201,74,0.42),
    0 18px 44px -22px rgba(0,0,0,0.86);
  border-color: rgba(240,201,74,0.5);
}
/* Gold section values glow a touch on every page. */
.ig [class*="-bal-v"], .ig .ig-sheen { text-shadow:0 0 16px rgba(240,201,74,0.30); }

/* ═══ RICH LUMINOUS EMERALD THEME (master colour direction, approved) ══════════
   Lifts the whole app off near-black onto a luminous emerald ground with gold
   framing and faint jewel (emerald / gold / purple) glows. Higher specificity
   (body .ig …) so it overrides each page's inline .ig tokens + background.
   Not near-black, not light/white, not neon — rich, colourful, premium. */
body .ig {
  --bg:#0c4a31; --card:#155f3e; --card2:#1b7a50; --line:rgba(242,205,80,0.34);
  --ink:#f3fff9; --mut:#a9dcc2; --grn:#3af0a0; --grn2:#128a56; --gold:#f5cf55; --gold3:#cf9522;
  /* fill the viewport so the emerald ground always sits behind the (taller) fixed
     image nav — never exposing #root's forced near-black gradient on short pages */
  min-height:100vh; min-height:100dvh;
  background:
    radial-gradient(90% 42% at 50% -6%, rgba(90,255,180,0.5) 0%, rgba(58,240,160,0.22) 34%, transparent 60%),
    radial-gradient(135% 80% at 50% -12%, rgba(58,240,160,0.32) 0%, transparent 56%),
    radial-gradient(85% 55% at 100% -4%, rgba(245,207,85,0.16) 0%, transparent 52%),
    radial-gradient(75% 55% at 0% 8%, rgba(150,90,220,0.13) 0%, transparent 55%),
    linear-gradient(180deg, #0f6141 0%, #0c4a31 48%, #0a3d29 100%) !important;
  background-repeat:no-repeat !important;
  background-attachment:scroll !important;
}
/* Luminous emerald card / panel / balance surfaces (replace near-black gradients) */
body .ig [class*="-card"], body .ig [class*="-cell"], body .ig [class*="-panel"],
body .ig .igp-cell, body .ig .igw-bal, body .ig .igw-c74, body .ig .igbon-bal,
body .ig .igwd-bal, body .ig .igdemo-bal {
  background:
    radial-gradient(120% 100% at 50% -6%, rgba(58,240,160,0.18), transparent 62%),
    linear-gradient(180deg, rgba(26,102,66,0.96), rgba(15,74,49,0.97)) !important;
  border-color:rgba(242,205,80,0.32) !important;
}
/* Header glass → luminous emerald */
body .ig .ig-top { background:linear-gradient(180deg, rgba(16,84,55,0.94), rgba(12,64,42,0.62)) !important; }
/* Tab strip / hairlines pick up the brighter emerald */
body .ig .igp-hl, body .ig .igp-tabs { border-color:rgba(242,205,80,0.28) !important; }

/* ── Premium CTA buttons: glass gloss + gold ring + press depth (keeps each
     button's own gold/green gradient; box-shadow + sheen only, cascades app-wide). ── */
body .ig .ig-cta, body .ig .ig-bonus-cta, body .ig .igwd-cta, body .ig .igdemo-cta,
body .ig .igsup-hero-cta, body .ig .igrw-hero-cta, body .ig .igrep-cta, body .ig .igkyc-cta,
body .ig .ign-cta, body .ig .igbon-cta, body .ig .iginv-cta, body .ig .igvip-cta,
body .ig .igp-btn--solid, body .ig .igset-tg-btn.solid, body .ig .igdep-cta, body .ig .igcry-cta {
  position:relative; isolation:isolate;
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,0.6),
    inset 0 -3px 7px rgba(0,0,0,0.22),
    0 0 16px -4px rgba(240,201,74,0.5),
    0 9px 20px -9px rgba(0,0,0,0.6) !important;
  text-shadow:0 1px 1px rgba(0,0,0,0.22);
  transition:transform .12s ease, filter .12s ease;
}
body .ig .ig-cta:active, body .ig .ig-bonus-cta:active, body .ig .igwd-cta:active,
body .ig .igdemo-cta:active, body .ig .igp-btn--solid:active, body .ig .igdep-cta:active,
body .ig .igcry-cta:active, body .ig .igvip-cta:active, body .ig .iginv-cta:active {
  transform:translateY(1.5px); filter:brightness(1.06) saturate(1.05);
}

@media (prefers-reduced-motion:reduce) {
  .ig .igp-cell::after { animation:none !important; }
}
`;
