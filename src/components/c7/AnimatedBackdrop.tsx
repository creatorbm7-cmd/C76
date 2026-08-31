/**
 * AnimatedBackdrop — premium "alive" arcade background (pure CSS, 60fps).
 *
 * Layered for depth: violet base → drifting aurora blobs (pink/cyan/gold) →
 * rising gold sparkles → top light beam + vignette. GPU-friendly (only
 * transform/opacity animate), fixed behind content, pointer-events none, and
 * fully disabled under prefers-reduced-motion. No video file, no blank flash.
 */
import { useMemo } from "react";

export default function AnimatedBackdrop() {
  // Deterministic sparkle field (no reflow between renders).
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: (i * 53) % 100,
        size: 5 + ((i * 7) % 9),
        delay: (i % 9) * 1.3,
        dur: 9 + ((i * 3) % 8),
        gold: i % 3 === 0,
      })),
    [],
  );

  return (
    <div className="c7-backdrop" aria-hidden>
      <div className="c7-bd-base" />
      <div className="c7-bd-blob c7-bd-blob--pink" />
      <div className="c7-bd-blob c7-bd-blob--cyan" />
      <div className="c7-bd-blob c7-bd-blob--gold" />
      <div className="c7-bd-beam" />
      <div className="c7-bd-sparkles">
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="c7-bd-spark"
            style={{
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              background: s.gold ? "var(--c7-gold)" : "var(--c7-primary)",
              boxShadow: s.gold
                ? "0 0 8px rgba(var(--c7-gold-rgb),0.9)"
                : "0 0 8px rgba(var(--c7-primary-rgb),0.9)",
            }}
          />
        ))}
      </div>
      <div className="c7-bd-vignette" />

      <style>{`
        .c7-backdrop { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
          background:
            radial-gradient(80% 60% at 50% -10%, rgba(var(--c7-primary-rgb),0.22) 0%, transparent 60%),
            radial-gradient(70% 55% at 88% 82%, rgba(var(--c7-gold-rgb),0.10) 0%, transparent 60%),
            radial-gradient(70% 55% at 10% 90%, rgba(var(--c7-accent-rgb),0.12) 0%, transparent 60%),
            var(--c7-bg); }
        .c7-bd-base { position: absolute; inset: 0;
          background:
            radial-gradient(at 50% 120%, rgba(var(--c7-primary-rgb),0.10), transparent 55%); }

        .c7-bd-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5;
          will-change: transform; }
        .c7-bd-blob--pink { width: 60vw; height: 60vw; top: -12%; left: -18%;
          background: radial-gradient(circle, rgba(var(--c7-primary-rgb),0.55), transparent 68%);
          animation: c7-bd-drift1 18s ease-in-out infinite; }
        .c7-bd-blob--cyan { width: 55vw; height: 55vw; top: 8%; right: -22%;
          background: radial-gradient(circle, rgba(var(--c7-accent-rgb),0.34), transparent 68%);
          animation: c7-bd-drift2 22s ease-in-out infinite; }
        .c7-bd-blob--gold { width: 50vw; height: 50vw; bottom: -16%; left: 22%;
          background: radial-gradient(circle, rgba(var(--c7-gold-rgb),0.26), transparent 68%);
          animation: c7-bd-drift3 26s ease-in-out infinite; }

        @keyframes c7-bd-drift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(8vw,5vh) scale(1.12)} }
        @keyframes c7-bd-drift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-7vw,7vh) scale(1.15)} }
        @keyframes c7-bd-drift3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(5vw,-6vh) scale(1.1)} }

        /* Soft top light beam */
        .c7-bd-beam { position: absolute; top: -30%; left: 50%; width: 120%; height: 70%;
          transform: translateX(-50%) rotate(8deg);
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.06), transparent 60%);
          animation: c7-bd-beam 12s ease-in-out infinite; }
        @keyframes c7-bd-beam { 0%,100%{opacity:.5} 50%{opacity:.9} }

        /* Rising sparkles / coins */
        .c7-bd-sparkles { position: absolute; inset: 0; }
        .c7-bd-spark { position: absolute; bottom: -6%; border-radius: 50%; opacity: 0;
          will-change: transform, opacity; animation-name: c7-bd-rise;
          animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes c7-bd-rise {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          12% { opacity: 0.9; }
          85% { opacity: 0.8; }
          100% { transform: translateY(-108vh) scale(1); opacity: 0; }
        }

        .c7-bd-vignette { position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(var(--c7-bg-rgb),0.10), transparent 22%, transparent 70%, var(--c7-bg)); }

        @media (prefers-reduced-motion: reduce) {
          .c7-bd-blob, .c7-bd-beam, .c7-bd-spark { animation: none !important; }
          .c7-bd-spark { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
