/**
 * C7Coin — the C7 Energy token, rendered as a rich gold coin (pure CSS).
 *
 * A beveled minted coin: gold radial face, embossed "C7" mark, a dashed inner
 * ring, a light-catching glint sweep, and a gentle bob/tilt — reads as a real
 * premium crypto token. Size-driven by the `size` prop. Reduced-motion → still.
 */

const CSS = `
.c7coin { position: relative; display: grid; place-items: center; border-radius: 50%; flex: 0 0 auto;
  width: var(--csz, 40px); height: var(--csz, 40px);
  background: radial-gradient(circle at 36% 28%, #fff6d8, #ffd24d 38%, #f5b423 62%, #b8860b 100%);
  border: 1.5px solid #6b4a08;
  box-shadow: 0 3px 9px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.75),
              inset 0 -4px 7px rgba(120,70,10,.6), 0 0 15px rgba(245,180,35,.55);
  animation: c7coin-bob 3s ease-in-out infinite; will-change: transform; overflow: hidden;
}
.c7coin::before { content: ''; position: absolute; inset: 13%; border-radius: 50%;
  border: 1.5px dashed rgba(107,74,8,.45); }
.c7coin::after { content: ''; position: absolute; inset: -20%; pointer-events: none;
  background: linear-gradient(115deg, transparent 34%, rgba(255,255,255,.8) 48%, transparent 60%);
  background-size: 260% 100%; animation: c7coin-glint 3.4s linear infinite; }
.c7coin-mark { position: relative; z-index: 2; font-weight: 900; line-height: 1; letter-spacing: -.5px;
  font-size: calc(var(--csz, 40px) * .32); color: #6b4a08;
  text-shadow: 0 1px 0 rgba(255,246,216,.7), 0 -1px 1px rgba(90,55,8,.5); }
@keyframes c7coin-bob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-2px) rotate(4deg); } }
@keyframes c7coin-glint { 0% { background-position: 160% 0; } 100% { background-position: -160% 0; } }
@media (prefers-reduced-motion: reduce) { .c7coin, .c7coin::after { animation: none; } }
`;

export default function C7Coin({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={`c7coin${className ? ` ${className}` : ''}`}
      style={{ ['--csz' as string]: `${size}px` }}
      aria-hidden="true"
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="c7coin-mark">C74</span>
    </span>
  );
}
