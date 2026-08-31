/**
 * LuxFrameFX — the C7 WINNERS obsidian-luxury decorative header layer.
 *
 * A pointer-events:none overlay that adds the premium "frame" treatment to any
 * sticky page header: ornamental gold filigree corners (pure SVG, no raster
 * asset), a twinkling diamond gem, and drifting diamond-dust sparkles.
 *
 * Usage:
 *   <header className="my-head c7-lux-head">
 *     <LuxFrameFX />
 *     ...header content...
 *   </header>
 *
 * The parent header must be positioned (sticky/relative). The shared CSS lives
 * in c7-fx.css (`.c7-lux-*`). Reduced-motion is handled there. Purely visual —
 * no logic, state, money-path, or game involvement.
 */

/** Ornamental gold filigree corner — a VIP flourish drawn in SVG. */
export function LuxCorner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* main sweeping arc */}
      <path d="M4 44 Q4 4 44 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* inner parallel arc */}
      <path d="M4 32 Q4 12 24 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.68" />
      {/* upper decorative curl */}
      <path d="M10 13 q7 -4 11 3 q-6 1 -8 -3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* lower decorative curl */}
      <path d="M13 30 q-4 -7 3 -11 q1 6 -3 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.75" />
      {/* small pendant dot on the arc */}
      <circle cx="30" cy="6.5" r="1.3" fill="currentColor" opacity="0.85" />
      {/* diamond accent gem at the vertex */}
      <path className="c7-lux-gem" d="M6 6 l2.6 2.6 -2.6 2.6 -2.6 -2.6 z" />
    </svg>
  );
}

/** Drop inside any `.c7-lux-head` sticky header to apply the luxury frame FX. */
export default function LuxFrameFX() {
  return (
    <div className="c7-lux-fx" aria-hidden="true">
      <span className="c7-lux-dust">
        <i /><i /><i /><i /><i />
      </span>
      <LuxCorner className="c7-lux-orn c7-lux-orn-l" />
      <LuxCorner className="c7-lux-orn c7-lux-orn-r" />
    </div>
  );
}
