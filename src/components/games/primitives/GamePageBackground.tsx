import { ReactNode } from "react";

/**
 * Premium emerald-vault game shell. Adds cinematic ambient backdrop (orbs +
 * vignette) behind every game page. Children render at z-10 above the FX.
 */
export default function GamePageBackground({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #1a0d00 0%, #0f0a00 55%, #020806 100%)",
        color: "var(--c-text)",
        fontFamily: "var(--uono-font)",
      }}
    >
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(61,217,166,0.18), transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-32 h-96 w-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,204,0,0.10), transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      {/* Hairline grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(61,217,166,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(61,217,166,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 80%)",
        }}
      />

      <div className="relative z-10 mx-auto" style={{ maxWidth: 430, paddingBottom: 84 }}>
        {children}
      </div>
    </div>
  );
}
