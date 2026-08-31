/**
 * LuxSpinner — C7 WINNERS premium 4K/HDR loading spinner.
 *
 * A hyper-detailed, 3D-tilted jackpot-style loader: a rotating gold conic ring,
 * a counter-spinning emerald energy arc, four orbiting card suits (♠♥♦♣) each
 * with live glow, and a pulsing diamond core with a radial bloom. Pure CSS/SVG —
 * no raster asset, no logic, no game/money involvement.
 *
 * Usage:  <LuxSpinner />  ·  <LuxSpinner size={40} label="Loading…" />
 *
 * Reduced-motion: rotation/pulse stop, a calm elegant emblem remains.
 */

const CSS = `
.lux-sp { --sz: 56px; display: inline-grid; place-items: center; }
.lux-sp-stage {
  position: relative; width: var(--sz); height: var(--sz);
  perspective: 220px; place-items: center; display: grid;
  filter: drop-shadow(0 0 10px rgba(245,180,35,.35));
}
.lux-sp-stage > * { grid-area: 1 / 1; }

/* Rotating gold conic ring (the "wheel") */
.lux-sp-ring {
  width: 100%; height: 100%; border-radius: 50%;
  background: conic-gradient(from 0deg,
    #F5B423, #FFD87A, #EAF7FF, #FFD87A, #F5B423, #7a5410, #F5B423);
  -webkit-mask: radial-gradient(closest-side, transparent 66%, #000 68%);
          mask: radial-gradient(closest-side, transparent 66%, #000 68%);
  transform: rotateX(58deg) rotateZ(0deg);
  animation: lux-sp-spin 3.2s linear infinite;
  will-change: transform;
}
/* Emerald energy arc, counter-rotating just inside the ring */
.lux-sp-arc {
  width: 82%; height: 82%; border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #22E07A; border-left-color: rgba(34,224,122,.4);
  transform: rotateX(58deg);
  animation: lux-sp-spin-rev 1.5s cubic-bezier(.6,.1,.4,.9) infinite;
  filter: drop-shadow(0 0 6px rgba(34,224,122,.6));
  will-change: transform;
}

/* Orbit carrier holding the four suits */
.lux-sp-orbit {
  width: 100%; height: 100%; border-radius: 50%;
  transform: rotateX(58deg);
  animation: lux-sp-spin 4.4s linear infinite;
  will-change: transform;
}
.lux-sp-suit {
  position: absolute; top: 50%; left: 50%;
  font-size: calc(var(--sz) * 0.2); line-height: 1; font-weight: 900;
  /* keep glyph upright against the tilted+rotating orbit */
  animation: lux-sp-suit-upright 4.4s linear infinite;
  will-change: transform;
}
.lux-sp-suit b { display: inline-block; animation: lux-sp-suit-pop 2s ease-in-out infinite; }
.lux-sp-suit.s0 { transform: translate(-50%,-50%) rotate(0deg)   translateY(calc(var(--sz) * -0.5)); }
.lux-sp-suit.s1 { transform: translate(-50%,-50%) rotate(90deg)  translateY(calc(var(--sz) * -0.5)); }
.lux-sp-suit.s2 { transform: translate(-50%,-50%) rotate(180deg) translateY(calc(var(--sz) * -0.5)); }
.lux-sp-suit.s3 { transform: translate(-50%,-50%) rotate(270deg) translateY(calc(var(--sz) * -0.5)); }
.lux-sp-suit.spade   { color: #EAF7FF; text-shadow: 0 0 8px #EAF7FF, 0 0 14px rgba(120,240,176,.5); }
.lux-sp-suit.heart   { color: #E11D2E; text-shadow: 0 0 8px #ff5a68, 0 0 14px rgba(225,29,46,.5); }
.lux-sp-suit.diamond { color: #F5B423; text-shadow: 0 0 8px #FFD87A, 0 0 14px rgba(245,180,35,.6); }
.lux-sp-suit.club    { color: #22E07A; text-shadow: 0 0 8px #6bf5a3, 0 0 14px rgba(34,224,122,.5); }

/* Pulsing diamond core + bloom */
.lux-sp-core {
  place-self: center;
  font-size: calc(var(--sz) * 0.26); color: #EAF7FF;
  text-shadow: 0 0 10px #EAF7FF, 0 0 20px #FFD87A, 0 0 30px rgba(245,180,35,.6);
  animation: lux-sp-pulse 1.6s ease-in-out infinite;
}

.lux-sp-label {
  margin-top: 10px; font-size: 11px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  background: linear-gradient(90deg, #F5B423, #EAF7FF, #22E07A);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

@keyframes lux-sp-spin      { to { transform: rotateX(58deg) rotateZ(360deg); } }
@keyframes lux-sp-spin-rev  { to { transform: rotateX(58deg) rotateZ(-360deg); } }
@keyframes lux-sp-suit-upright { to { transform: translate(-50%,-50%) rotate(-360deg) translateY(0); } }
@keyframes lux-sp-suit-pop  { 0%,100% { transform: scale(1); opacity: .85; } 50% { transform: scale(1.22); opacity: 1; } }
@keyframes lux-sp-pulse     { 0%,100% { transform: scale(.9); opacity: .8; } 50% { transform: scale(1.12); opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .lux-sp-ring, .lux-sp-arc, .lux-sp-orbit, .lux-sp-suit, .lux-sp-suit b, .lux-sp-core {
    animation: none !important;
  }
}
`;

interface Props {
  /** pixel diameter of the spinner stage (default 56) */
  size?: number;
  /** optional caption shown beneath the spinner */
  label?: string;
  className?: string;
}

export default function LuxSpinner({ size = 56, label, className }: Props) {
  return (
    <div
      className={`lux-sp${className ? ` ${className}` : ''}`}
      style={{ ['--sz' as string]: `${size}px` }}
      role="status"
      aria-label={label || 'Loading'}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lux-sp-stage" aria-hidden="true">
        <div className="lux-sp-ring" />
        <div className="lux-sp-arc" />
        <div className="lux-sp-orbit">
          <span className="lux-sp-suit s0 spade"><b>♠</b></span>
          <span className="lux-sp-suit s1 heart"><b>♥</b></span>
          <span className="lux-sp-suit s2 diamond"><b>♦</b></span>
          <span className="lux-sp-suit s3 club"><b>♣</b></span>
        </div>
        <span className="lux-sp-core">◆</span>
      </div>
      {label ? <div className="lux-sp-label">{label}</div> : null}
    </div>
  );
}
