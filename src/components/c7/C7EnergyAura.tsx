/**
 * C7EnergyAura — app-wide ambient "energy feel".
 *
 * A single fixed, pointer-events:none overlay mounted once at the app root. It
 * lays a faint gold→emerald energy glow along the top and bottom edges of every
 * screen (transparent middle, so content is never obscured), gently pulsing —
 * giving the whole app the C7 Energy identity without per-page changes.
 *
 * z-index sits below the top bar (30) and bottom nav, above page backgrounds.
 * Purely decorative. Reduced-motion → static, no pulse.
 */

const CSS = `
.c7aura { position: fixed; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }
.c7aura-band { position: absolute; left: 0; right: 0; height: 20vh; will-change: opacity; }
.c7aura-top {
  top: 0;
  background: radial-gradient(120% 100% at 50% 0%, rgba(245,180,35,0.11), rgba(34,224,122,0.05) 42%, transparent 72%);
  animation: c7aura-pulse 4.6s ease-in-out infinite;
}
.c7aura-bot {
  bottom: 0;
  background: radial-gradient(120% 100% at 50% 100%, rgba(34,224,122,0.12), rgba(245,180,35,0.05) 42%, transparent 72%);
  animation: c7aura-pulse 4.6s ease-in-out infinite 2.3s;
}
/* faint travelling energy hairline just under the very top edge */
.c7aura-line {
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,214,120,0.5), rgba(107,245,163,0.4), transparent);
  background-size: 220% 100%; animation: c7aura-sweep 7s linear infinite; opacity: 0.6;
}
@keyframes c7aura-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes c7aura-sweep { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
@media (prefers-reduced-motion: reduce) {
  .c7aura-top, .c7aura-bot, .c7aura-line { animation: none; }
}
`;

export default function C7EnergyAura() {
  return (
    <div className="c7aura" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="c7aura-band c7aura-top" />
      <span className="c7aura-band c7aura-bot" />
      <span className="c7aura-line" />
    </div>
  );
}
