// v2CardCss — the shared game-card visual (the `.v2c*` rules).
//
// Extracted from the legacy V2 lobby in R2 so the Home "Popular" rail and the Casino full
// library render identical cards from one source of truth. Both pages inject
// this string once. R5.3b: restyled to the Temple language — carved-stone frame
// with copper corners, gold RTP numeral ribbon, matte finish (the glass sheen
// is gone), and a mechanical stone-depress press instead of a zoom/brighten.
// The R2 size hierarchy (`.v2c--hero` / `.v2c--mini`) is unchanged (layout-only).

export const V2_CARD_CSS = `
.v2c { position: relative; aspect-ratio: 3/4; border-radius: 14px; overflow: hidden; cursor: pointer; padding: 0; font-family: inherit; text-align: left; color: #f3e6e6;
  /* Premium C7 emerald depth base (padding-box) framed by a 3D metallic-gold edge
     (border-box gradient → clean rounded corners). Top specular + corner jade bloom. */
  border: 2px solid transparent;
  background:
    radial-gradient(120% 78% at 50% -14%, rgba(255,255,255,0.09), transparent 46%) padding-box,
    radial-gradient(100% 72% at 14% 6%, rgba(47,226,154,0.14), transparent 52%) padding-box,
    linear-gradient(158deg, #12442d 0%, #0c3220 42%, #071c12 100%) padding-box,
    linear-gradient(150deg, #7a5a1e 0%, #ffe9a8 22%, #f6c945 48%, #fff6d5 72%, #c68a2e 100%) border-box;
  /* layered depth: deep drop + gold rim bloom + gold top bevel + bottom carve + inner jade glow */
  box-shadow: 0 18px 34px -12px rgba(0,0,0,0.9), 0 0 24px -8px rgba(246,201,69,0.42), inset 0 1.5px 0 rgba(255,246,214,0.5), inset 0 -20px 40px -10px rgba(0,0,0,0.5), inset 0 0 30px -14px rgba(47,226,154,0.16);
  animation: v2c-in .5s ease both, v2c-float 4.6s ease-in-out infinite; transition: box-shadow .2s, transform .1s cubic-bezier(.3,1.4,.5,1); will-change: transform; }
@keyframes v2c-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes v2c-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
/* desync the float so the grid breathes, not marches */
.v2c:nth-child(2n) { animation-duration: .5s, 5.3s; } .v2c:nth-child(3n) { animation-duration: .5s, 4s; } .v2c:nth-child(4n) { animation-duration: .5s, 5.8s; }
/* mechanical stone press — sinks in, never zooms out */
.v2c:active { transform: scale(0.97); }
.v2c:hover { box-shadow: 0 0 0 1.5px rgba(255,214,120,0.7), 0 26px 44px -12px rgba(0,0,0,0.88), 0 0 30px -6px rgba(246,201,69,0.5); }
.v2c-art { position: absolute; inset: 0; display: grid; place-items: center; font-size: 40px; background: radial-gradient(85% 55% at 50% 22%, rgba(47,226,154,0.16), transparent 62%), radial-gradient(90% 60% at 50% 122%, rgba(47,226,154,0.22), transparent 60%); }
/* subtle stone top-light (sourced from above), not a glass gloss */
.v2c-gloss { position: absolute; inset: 0; pointer-events: none; z-index: 2;
  background: linear-gradient(180deg, rgba(47,226,154,0.10), transparent 28%), radial-gradient(120% 60% at 50% -12%, rgba(234,247,255,0.08), transparent 55%); }
.v2c-foot { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; padding: 18px 8px 7px; display: flex; flex-direction: column; gap: 1px; background: linear-gradient(180deg, transparent, rgba(10,4,6,0.94) 60%); }
.v2c-name { font-size: 11px; font-weight: 900; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2c-prov { font-size: 8.5px; font-weight: 700; color: rgba(220,232,223,0.55); text-transform: uppercase; letter-spacing: 0.5px; }
.v2c-badge { position: absolute; top: 6px; left: 6px; z-index: 5; font-size: 8px; font-weight: 900; letter-spacing: 0.5px; padding: 3px 7px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4); animation: v2c-badge 1.9s ease-in-out infinite; transform-origin: left center; will-change: transform; }
/* bound (uploaded) badge art replaces the CSS pill */
.v2c-badge.v2c-badge--img { padding: 0; background: none; box-shadow: none; border-radius: 0; height: 24px; width: auto; object-fit: contain; }
@keyframes v2c-badge { 0%,100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.09); filter: brightness(1.14) drop-shadow(0 0 6px rgba(47,226,154,0.65)); } }
/* Slot-style diagonal RTP ribbon — a gold numeral band (top-right, clipped) */
.v2c-rtp { position: absolute; top: 12px; right: -24px; z-index: 5; width: 92px; transform: rotate(45deg); text-align: center; font-size: 7.5px; font-weight: 900; letter-spacing: 0.3px; color: #2a1608; padding: 2px 0; background: linear-gradient(180deg, #f6e6b0, #e8c15a 55%, #c68a2e); box-shadow: 0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.5); }
.v2c-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: saturate(1.18) contrast(1.08) brightness(1.03); }
.v2c:active .v2c-img { filter: saturate(1.22) contrast(1.1) brightness(1.05); }
.v2c-ph { position: absolute; inset: 0; display: none; place-items: center; font-size: 40px; background: radial-gradient(85% 55% at 50% 22%, rgba(47,226,154,0.16), transparent 62%), linear-gradient(158deg, #213629, #12201a); }
.v2c-meta { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 700; color: rgba(220,232,223,0.6); }
.v2c-2j { font-size: 8px; font-weight: 900; color: #05230f; background: linear-gradient(180deg,#37e29a,#0a5638); padding: 0 4px; border-radius: 5px; }
.v2c-sk { overflow: hidden; background: linear-gradient(158deg, #1a2c22, #12201a); cursor: default; }
.v2c-sk::before { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(47,226,154,0.16) 50%, transparent 70%); transform: translateX(-100%); animation: v2-skel 1.4s ease infinite; will-change: transform; }
@keyframes v2-skel { to { transform: translateX(100%); } }

/* ── R2 card-size hierarchy ─────────────────────────────────────────────
   Hero = full-width spotlight (Home Popular), Normal = default reel/grid card,
   Mini = compact for the dense Casino library grid. Layout-only overrides. */
.v2c--hero { aspect-ratio: 16 / 10; width: 100%; border-radius: 14px; }
/* R5.5-proof: a rare, subtle light-sweep — featured card only, ~once per 7s */
.v2c--hero::after { content: ""; position: absolute; top: 0; left: -40%; width: 34%; height: 100%; z-index: 3; pointer-events: none; transform: translateX(0) skewX(-18deg); opacity: 0;
  background: linear-gradient(100deg, transparent, rgba(234,247,255,0.16), transparent); animation: v2c-hero-sweep 7s ease-in-out infinite; will-change: transform, opacity; }
@keyframes v2c-hero-sweep { 0% { transform: translateX(0) skewX(-18deg); opacity: 0; } 4% { opacity: 0.9; } 17% { transform: translateX(520%) skewX(-18deg); opacity: 0; } 100% { transform: translateX(520%) skewX(-18deg); opacity: 0; } }
.v2c--hero .v2c-foot { padding: 30px 15px 13px; }
.v2c--hero .v2c-name { font-size: 17px; white-space: normal; }
.v2c--hero .v2c-meta { font-size: 10px; }
.v2c--hero .v2c-rtp { font-size: 8.5px; top: 15px; }
.v2c--mini { border-radius: 9px; }
.v2c--mini .v2c-foot { padding: 15px 6px 6px; }
.v2c--mini .v2c-name { font-size: 10px; }
.v2c--mini .v2c-meta { font-size: 8px; }
.v2c--mini .v2c-rtp { font-size: 7px; width: 82px; top: 10px; right: -26px; }
.v2c--mini .v2c-badge { font-size: 7px; padding: 2px 6px; }

@media (prefers-reduced-motion: reduce) {
  .v2c, .v2c-badge, .v2c-sk::before, .v2c--hero::after { animation: none !important; }
}
`;
