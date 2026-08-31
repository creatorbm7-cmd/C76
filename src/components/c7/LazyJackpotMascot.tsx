import { lazy, Suspense } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { JackpotMascotProps } from "./JackpotMascot";

// three.js lives inside JackpotMascot — keep it out of the main bundle by
// only ever importing it through this lazy boundary.
const JackpotMascot = lazy(() => import("./JackpotMascot"));

/** Static, dependency-free coin used while the 3D scene loads and for
 *  reduced-motion / low-end devices (three.js never loads for them). */
function MascotFallback({ size = 180, rimColor = "#e02b3c" }: JackpotMascotProps) {
  const inner = Math.round(size * 0.62);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #e02b3c, #5c0d17 72%)",
          border: `${Math.max(2, Math.round(size * 0.03))}px solid ${rimColor}`,
          boxShadow: `0 0 ${Math.round(size * 0.14)}px rgba(224, 43, 60,0.45)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(inner * 0.46),
        }}
      >
        🪙
      </div>
    </div>
  );
}

/**
 * Drop-in replacement for <JackpotMascot/> that keeps three.js out of the
 * first-paint bundle. Renders the static coin for reduced-motion users
 * (three.js never downloads); otherwise lazy-loads the 3D scene.
 */
export default function LazyJackpotMascot(props: JackpotMascotProps) {
  const reduced = usePrefersReducedMotion();
  // If the caller supplied a static asset, JackpotMascot is cheap — but we
  // still defer it; for reduced motion we show the static coin instead.
  if (reduced && !props.mascotSrc) return <MascotFallback {...props} />;
  return (
    <Suspense fallback={<MascotFallback {...props} />}>
      <JackpotMascot {...props} />
    </Suspense>
  );
}
