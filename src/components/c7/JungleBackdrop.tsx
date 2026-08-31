/**
 * JungleBackdrop — the C74 rich-green backdrop (name kept for its call sites).
 *
 * Was a dark "jungle" scene (leaf silhouettes + near-black wash); now renders the
 * bright rich-green + gold-glamour canvas used across the app, matching the V3
 * lobby. Pure CSS, fixed, behind content (zIndex 0, pointer-events none),
 * prefers-reduced-motion safe. Instantly re-themes every page that imports it.
 */
export default function JungleBackdrop() {
  return (
    <>
      {/* MASTER deep-emerald base — identical to .c7p-page so C74 pages share the
          same dark-emerald+gold ground as the rest of the app (not bright neon). */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%)," +
            "radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%)," +
            "linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%)",
        }}
      />
      {/* Soft GREEN vignette — rich, not murky */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          boxShadow: "inset 0 0 150px 26px rgba(4,44,26,0.32), inset 0 0 60px rgba(4,36,22,0.22)",
        }}
      />
      {/* Floating emerald + gold light motes for glamorous depth */}
      <div
        aria-hidden="true"
        className="c7-rg-motes"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.72,
          backgroundImage:
            "radial-gradient(2.2px 2.2px at 20% 30%, rgba(255,230,140,0.72), transparent)," +
            "radial-gradient(2px 2px at 70% 60%, rgba(255,224,120,0.66), transparent)," +
            "radial-gradient(1.8px 1.8px at 45% 80%, rgba(255,232,150,0.7), transparent)," +
            "radial-gradient(1.8px 1.8px at 85% 25%, rgba(255,236,160,0.64), transparent)," +
            "radial-gradient(1.6px 1.6px at 33% 55%, rgba(255,216,110,0.66), transparent)," +
            "radial-gradient(1.6px 1.6px at 60% 20%, rgba(180,255,220,0.5), transparent)",
        }}
      />
      <style>{`
        @keyframes c7-rg-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .c7-rg-motes { animation: c7-rg-float 9s ease-in-out infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .c7-rg-motes { animation: none; } }
      `}</style>
    </>
  );
}
