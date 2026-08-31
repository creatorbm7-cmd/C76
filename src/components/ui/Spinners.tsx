/**
 * Spinners — cartoon-3D loading primitives (orange/black, var(--c7-*) tokens).
 *
 * Exports:
 *   <Spinner />            — rotating ring loader (the default loading spinner)
 *   <RotatingLoader />     — three orbiting candy dots
 *   <CircularProgress />   — determinate circular progress indicator (0–100)
 *   <SpinButton />         — 3D glossy button with a spin-to-load effect
 *                            (morphs to a circle + spins while loading)
 *
 * All pure CSS animations; honor prefers-reduced-motion.
 */

import { type ReactNode, type CSSProperties, type MouseEvent } from "react";

/* Shared keyframes injected once. */
function SpinnerCss() {
  return (
    <style>{`
      @keyframes c7sp-rot { to { transform: rotate(360deg); } }
      @keyframes c7sp-orbit { 0%,100% { transform: scale(0.6); opacity: 0.45; } 50% { transform: scale(1); opacity: 1; } }
      @keyframes c7sp-dash { 0% { stroke-dashoffset: var(--c7sp-circ); } 100% { stroke-dashoffset: calc(var(--c7sp-circ) * 0.25); } }
      .c7sp-ring { animation: c7sp-rot 0.85s linear infinite; }
      .c7sp-indet { animation: c7sp-rot 1.4s linear infinite; }
      .c7sp-indet circle.run { animation: c7sp-dash 1.3s ease-in-out infinite alternate; }
      @media (prefers-reduced-motion: reduce) {
        .c7sp-ring, .c7sp-indet, .c7sp-indet circle.run, .c7sp-dot { animation-duration: 0s !important; }
      }
    `}</style>
  );
}

/* ── Spinner — rotating ring (the loading spinner / rotating loader) ───────── */
export interface SpinnerProps {
  /** Diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Accent color (defaults to the brand primary). */
  color?: string;
  /** Add a soft HDR bloom glow behind the ring. */
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Spinner({
  size = 28, thickness = 3, color = "var(--c7-primary)", glow = true, className, style,
}: SpinnerProps) {
  return (
    <span
      className={`c7sp-ring ${className ?? ""}`}
      role="status"
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${thickness}px solid rgba(255,255,255,0.12)`,
        borderTopColor: color,
        borderRightColor: color,
        boxShadow: glow ? `0 0 14px -2px ${color}, inset 0 0 8px -4px ${color}` : undefined,
        ...style,
      }}
    >
      <SpinnerCss />
    </span>
  );
}

/* ── RotatingLoader — three orbiting candy dots ───────────────────────────── */
export interface RotatingLoaderProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function RotatingLoader({ size = 34, color = "var(--c7-primary)", className, style }: RotatingLoaderProps) {
  const dot = Math.max(5, Math.round(size * 0.2));
  return (
    <span
      className={`c7sp-ring ${className ?? ""}`}
      role="status"
      aria-label="Loading"
      style={{ position: "relative", display: "inline-block", width: size, height: size, ...style }}
    >
      <SpinnerCss />
      {[0, 1, 2].map((i) => {
        const ang = (i * 120 * Math.PI) / 180;
        const r = size / 2 - dot / 2;
        return (
          <span
            key={i}
            className="c7sp-dot"
            style={{
              position: "absolute",
              width: dot,
              height: dot,
              borderRadius: "50%",
              left: size / 2 - dot / 2 + r * Math.cos(ang),
              top: size / 2 - dot / 2 + r * Math.sin(ang),
              background: color,
              boxShadow: `0 0 10px -2px ${color}, inset 0 1.5px 0 rgba(255,255,255,0.5)`,
              animation: `c7sp-orbit 1s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        );
      })}
    </span>
  );
}

/* ── CircularProgress — determinate (or indeterminate) ring with glow ─────── */
export interface CircularProgressProps {
  /** 0–100. Omit / undefined → indeterminate spin-to-load. */
  value?: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Show the % label in the middle (determinate only). */
  showLabel?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function CircularProgress({
  value, size = 56, thickness = 6, color = "var(--c7-primary)",
  trackColor = "rgba(255,255,255,0.1)", showLabel = true, className, style,
}: CircularProgressProps) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const indeterminate = value == null;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const offset = circ * (1 - pct / 100);

  return (
    <span
      className={className}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: "relative", display: "inline-flex", width: size, height: size, ...style }}
    >
      <SpinnerCss />
      <svg
        width={size}
        height={size}
        className={indeterminate ? "c7sp-indet" : undefined}
        style={{ ["--c7sp-circ" as any]: circ, filter: `drop-shadow(0 0 6px ${color})`, transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id="c7sp-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--c7-gold)" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
        <circle
          className={indeterminate ? "run" : undefined}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#c7sp-grad)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={indeterminate ? circ * 0.7 : offset}
          style={{ transition: indeterminate ? undefined : "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      {!indeterminate && showLabel && (
        <span
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.26, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(pct)}%
        </span>
      )}
    </span>
  );
}

/* ── SpinButton — 3D glossy button with a spin-to-load morph ───────────────── */
export interface SpinButtonProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** "gold" (default) or "primary" candy gradient. */
  variant?: "gold" | "primary";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}

export function SpinButton({
  children, loading = false, disabled = false, fullWidth = false,
  variant = "gold", onClick, type = "button", className, ...rest
}: SpinButtonProps) {
  const blocked = loading || disabled;
  const top = variant === "gold" ? "var(--c7-gold)" : "var(--c7-accent)";
  return (
    <button
      type={type}
      disabled={blocked}
      aria-busy={loading}
      onClick={(e) => { if (blocked) return; onClick?.(e); }}
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        width: loading ? 54 : fullWidth ? "100%" : undefined,
        minWidth: loading ? 54 : undefined,
        height: 54,
        padding: loading ? 0 : "0 26px",
        borderRadius: loading ? "50%" : 20,
        border: "none",
        background: `radial-gradient(120% 90% at 50% -15%, rgba(255,255,255,0.45), transparent 55%), linear-gradient(180deg, ${top}, var(--c7-primary))`,
        color: "var(--c7-bg)",
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: 0.4,
        fontFamily: "inherit",
        cursor: blocked ? (loading ? "progress" : "not-allowed") : "pointer",
        opacity: disabled && !loading ? 0.5 : 1,
        boxShadow: loading
          ? "inset 0 2px 0 rgba(255,255,255,0.5), 0 6px 16px -4px rgba(var(--c7-primary-rgb),0.6)"
          : "0 6px 0 var(--c7-primary-dark), inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -10px 18px rgba(0,0,0,0.22), 0 12px 22px -5px rgba(var(--c7-primary-rgb),0.6)",
        overflow: "hidden",
        whiteSpace: "nowrap",
        transition: "width .32s cubic-bezier(0.4,0,0.2,1), border-radius .32s ease, padding .32s ease, box-shadow .2s ease",
        WebkitTapHighlightColor: "transparent",
      }}
      {...rest}
    >
      {loading ? <Spinner size={26} thickness={3} color="var(--c7-bg)" glow={false} /> : children}
    </button>
  );
}

export default Spinner;
