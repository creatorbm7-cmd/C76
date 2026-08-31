/**
 * C74Frame — reusable RICH premium gold frame overlay (C74 × 2J).
 *
 * Drop as the first child of any `position: relative` card to give it the
 * premium slot-frame accent: ornate double gold corner-brackets with a bright
 * bevel, corner gems, a sweeping top glimmer and a breathing gold+emerald glow —
 * matching the games lobby. Presentational only; pointer-events: none.
 */

const CSS = `
.c74f { position: absolute; inset: 0; z-index: 3; pointer-events: none; border-radius: inherit; overflow: hidden; }
/* breathing gold+emerald inner glow */
.c74f-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: inset 0 0 26px -10px rgba(245,180,35,0.6), inset 0 0 40px -18px rgba(46,230,130,0.5);
  animation: c74f-breathe 3.4s ease-in-out infinite; will-change: opacity; }
@keyframes c74f-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
/* sweeping top glimmer — a bright hairline that travels the top edge */
.c74f-sweep { position: absolute; top: 0; left: -35%; width: 30%; height: 2px; pointer-events: none; border-radius: 2px; will-change: transform;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), rgba(255,236,180,0.7), transparent);
  animation: c74f-sweep 4.2s ease-in-out infinite; }
@keyframes c74f-sweep { 0% { transform: translateX(0); } 55%,100% { transform: translateX(520%); } }
/* ornate double gold L-brackets — gilt gradient + bright inner bevel */
.c74f-brk { position: absolute; width: 20px; height: 20px; }
.c74f-brk::before, .c74f-brk::after { content: ''; position: absolute; }
/* outer thick gilt stroke */
.c74f-brk::before { inset: 0; border: 2.5px solid transparent;
  background: linear-gradient(135deg, #fff6d8, #ffd970 42%, #f5b423 70%, #b8860b) border-box;
  -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  filter: drop-shadow(0 0 5px rgba(245,180,35,0.6)); }
/* inner bright bevel hairline */
.c74f-brk::after { inset: 4px; border: 1px solid rgba(255,246,216,0.55); }
.c74f-brk.tl { top: 6px; left: 6px; }
.c74f-brk.tl::before, .c74f-brk.tl::after { border-right: 0; border-bottom: 0; border-top-left-radius: 10px; }
.c74f-brk.tr { top: 6px; right: 6px; }
.c74f-brk.tr::before, .c74f-brk.tr::after { border-left: 0; border-bottom: 0; border-top-right-radius: 10px; }
.c74f-brk.bl { bottom: 6px; left: 6px; }
.c74f-brk.bl::before, .c74f-brk.bl::after { border-right: 0; border-top: 0; border-bottom-left-radius: 10px; }
.c74f-brk.br { bottom: 6px; right: 6px; }
.c74f-brk.br::before, .c74f-brk.br::after { border-left: 0; border-top: 0; border-bottom-right-radius: 10px; }
/* corner gems — a small twinkling gold bead at each bracket vertex */
.c74f-gem { position: absolute; width: 6px; height: 6px; border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #fff7cf, #ffd24d 55%, #b8860b);
  box-shadow: 0 0 6px rgba(255,210,77,0.9); animation: c74f-tw 2.6s ease-in-out infinite; will-change: opacity, transform; }
.c74f-gem.tl { top: 8px; left: 8px; } .c74f-gem.tr { top: 8px; right: 8px; animation-delay: .6s; }
.c74f-gem.bl { bottom: 8px; left: 8px; animation-delay: 1.2s; } .c74f-gem.br { bottom: 8px; right: 8px; animation-delay: 1.8s; }
@keyframes c74f-tw { 0%,100% { opacity: 0.55; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.2); } }
@media (prefers-reduced-motion: reduce) { .c74f-glow, .c74f-sweep, .c74f-gem { animation: none !important; } }
`;

export default function C74Frame() {
  return (
    <span className="c74f" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: 'inherit' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="c74f-glow" />
      <span className="c74f-sweep" />
      <span className="c74f-brk tl" /><span className="c74f-brk tr" />
      <span className="c74f-brk bl" /><span className="c74f-brk br" />
      <span className="c74f-gem tl" /><span className="c74f-gem tr" />
      <span className="c74f-gem bl" /><span className="c74f-gem br" />
    </span>
  );
}
