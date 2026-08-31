/**
 * adminV8Kit — shared "V8 premium" primitives for admin panels.
 *
 * Extracted so the Agents / Sub-Agent Wallets / UPI Suppliers tabs share one
 * look (gradient hero + animated KPI cards + premium table) without each file
 * re-declaring the styles and sub-components. Purely presentational — no data.
 */

import { useEffect, useRef, useState } from "react";

/** Global V8 styles (av8-* classes). Render once near the top of a panel. */
export function V8Styles() {
  return (
    <style>{`
      @keyframes av8-float-up { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
      @keyframes av8-pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.5;transform:scale(1.3);} }
      @keyframes av8-scan { 0%{transform:translateX(-100%);} 100%{transform:translateX(100%);} }
      .av8-card { animation: av8-float-up 0.4s ease-out backwards; }
      .av8-tilt { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s; transform-style: preserve-3d; }
      .av8-tilt:hover { transform: perspective(800px) rotateX(2deg) rotateY(-2deg) translateY(-2px); }
      .av8-gradient-border { position: relative; }
      .av8-gradient-border::before {
        content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
        background: linear-gradient(135deg, rgba(245,158,11,0.4), rgba(244,63,94,0.2), rgba(255,201,53,0.3));
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
      }
      .av8-mesh-bg {
        background-image:
          radial-gradient(at 20% 10%, rgba(245,158,11,0.08) 0px, transparent 50%),
          radial-gradient(at 80% 30%, rgba(244,63,94,0.06) 0px, transparent 50%),
          radial-gradient(at 50% 80%, rgba(255,201,53,0.05) 0px, transparent 50%),
          radial-gradient(at 90% 90%, rgba(56,189,248,0.06) 0px, transparent 50%);
      }
      .av8-pulse-dot { animation: av8-pulse-dot 1.8s ease-in-out infinite; }
      .av8-scan::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(245,158,11,0.06), transparent);
        animation: av8-scan 3s ease-in-out infinite; pointer-events: none;
      }
      .av8-mono-num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; letter-spacing: -0.02em; }
      .av8-row { transition: transform 0.15s, background 0.2s; }
      .av8-row:hover { transform: translateX(2px); background: rgba(245,158,11,0.04) !important; }
      .av8-action-btn { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
      .av8-action-btn:hover { transform: translateY(-1px) scale(1.08); }
    `}</style>
  );
}

/** Count up from the previous value to `target` whenever target changes. */
export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export type V8Tone = "amber" | "emerald" | "rose" | "cyan";

// text tints tuned bright for the dark admin console (readable on dark cards).
export const V8_TONE: Record<V8Tone, { bg: string; ring: string; glow: string; text: string; pill: string }> = {
  amber:   { bg: "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(245,158,11,0.04))", ring: "rgba(245,158,11,0.35)", glow: "0 6px 20px -8px rgba(245,158,11,0.45)", text: "#f5b544", pill: "linear-gradient(135deg, rgba(245,158,11,0.20), rgba(245,158,11,0.07))" },
  emerald: { bg: "linear-gradient(135deg, rgba(22,163,74,0.16), rgba(22,163,74,0.04))",   ring: "rgba(22,163,74,0.35)", glow: "0 6px 20px -8px rgba(22,163,74,0.45)",  text: "#34e58a", pill: "linear-gradient(135deg, rgba(22,163,74,0.20), rgba(22,163,74,0.07))" },
  rose:    { bg: "linear-gradient(135deg, rgba(244,63,94,0.16), rgba(244,63,94,0.04))",   ring: "rgba(244,63,94,0.35)", glow: "0 6px 20px -8px rgba(244,63,94,0.45)",  text: "#ff6b7d", pill: "linear-gradient(135deg, rgba(244,63,94,0.20), rgba(244,63,94,0.07))" },
  cyan:    { bg: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(56,189,248,0.04))", ring: "rgba(56,189,248,0.35)", glow: "0 6px 20px -8px rgba(56,189,248,0.45)", text: "#38bdf8", pill: "linear-gradient(135deg, rgba(56,189,248,0.20), rgba(56,189,248,0.07))" },
};

/** Animated KPI stat card. `prefix` for currency; value counts up. */
export function V8StatCard(
  { icon, label, value, sub, tone, delay = 0, prefix = "" }:
  { icon: React.ReactNode; label: string; value: number; sub?: string; tone: V8Tone; delay?: number; prefix?: string },
) {
  const animated = useCountUp(typeof value === "number" ? value : 0, 900);
  const c = V8_TONE[tone] || V8_TONE.amber;
  return (
    <div className="av8-card av8-tilt rounded-2xl p-4 border relative overflow-hidden"
         style={{ background: c.bg, borderColor: c.ring, boxShadow: c.glow, animationDelay: `${delay}ms` }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-50"
           style={{ background: `radial-gradient(circle, ${c.ring} 0%, transparent 70%)`, transform: "translate(40%, -40%)" }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/60 font-bold">{label}</div>
          <div style={{ color: c.text }}>{icon}</div>
        </div>
        <div className="text-2xl md:text-3xl font-black av8-mono-num" style={{ color: c.text, textShadow: `0 0 16px ${c.ring}` }}>
          {prefix}{Math.round(animated).toLocaleString("en-IN")}
        </div>
        {sub && <div className="text-[10px] text-white/40 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

/** Sortable/plain table header cell. */
export function V8Th({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <th onClick={onClick} className={`px-3 py-3 text-[10px] uppercase tracking-wider font-bold ${className} ${onClick ? "cursor-pointer hover:text-amber-300 transition-colors select-none" : ""}`}>
      {children}
    </th>
  );
}

/** Small tinted icon button for row actions. */
export function V8IconBtn(
  { children, onClick, title, tone = "white", disabled }:
  { children: React.ReactNode; onClick?: () => void; title?: string; tone?: V8Tone | "white"; disabled?: boolean },
) {
  const colorMap: Record<string, string> = {
    white:   "text-white/50 hover:text-white hover:bg-white/[0.08]",
    cyan:    "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10",
    amber:   "text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10",
    rose:    "text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10",
    emerald: "text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10",
  };
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`av8-action-btn p-1.5 rounded-md transition-all disabled:opacity-40 ${colorMap[tone] || colorMap.white}`}>
      {children}
    </button>
  );
}

/** Initial-letter gradient badge (agent/supplier avatar) with a status dot. */
export function V8InitialBadge({ label, hue, active, square = true }: { label: string; hue: number; active: boolean; square?: boolean }) {
  const letter = (label || "?").charAt(0).toUpperCase();
  const dot = active ? "#10b981" : "#71717a";
  return (
    <div className="relative flex-shrink-0">
      <div className={`${square ? "rounded-xl" : "rounded-full"} flex items-center justify-center font-bold text-white`}
           style={{
             width: 30, height: 30, fontSize: 12,
             background: `linear-gradient(135deg, hsl(${hue},70%,45%), hsl(${(hue + 40) % 360},70%,35%))`,
             boxShadow: `0 0 12px hsla(${hue},70%,45%,0.4), inset 0 1px 0 rgba(15,23,42,0.2)`,
           }}>
        {letter}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 rounded-full"
           style={{ width: 9, height: 9, background: dot, boxShadow: `0 0 6px ${dot}, 0 0 0 2px #ffffff` }} />
    </div>
  );
}

/** Hero action button — "primary" (filled green) or "ghost" (outlined). */
export function V8HeroBtn(
  { children, onClick, variant = "ghost", disabled, title }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost"; disabled?: boolean; title?: string },
) {
  if (variant === "primary") {
    return (
      <button onClick={onClick} disabled={disabled} title={title}
        className="av8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #16a34a, #0b7a3f)", boxShadow: "0 4px 18px -4px rgba(22,163,74,0.6)" }}>
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
      style={{ background: "rgba(255,255,255,0.05)", color: "#e6edf6", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
      {children}
    </button>
  );
}

export type V8HeroBadge = { label: React.ReactNode; tone?: V8Tone; icon?: React.ReactNode; dot?: boolean };

/**
 * Shared premium page hero — gradient/mesh header with eyebrow, gradient
 * title, status badges, subtitle and action buttons. Gives every admin tab
 * the same "parallel" premium header without a 3D scene (lighter than the
 * flagship Users/Agents heroes, same visual language). Light-theme styled.
 */
export function V8PageHero(
  { eyebrow, title, icon, tone = "amber", badges = [], subtitle, actions }:
  { eyebrow: React.ReactNode; title: React.ReactNode; icon?: React.ReactNode; tone?: V8Tone; badges?: V8HeroBadge[]; subtitle?: React.ReactNode; actions?: React.ReactNode },
) {
  const c = V8_TONE[tone] || V8_TONE.amber;
  return (
    <div className="relative overflow-hidden rounded-2xl border av8-gradient-border"
         style={{ background: "linear-gradient(135deg, #ffffff, #f4f6f8)", borderColor: "rgba(15,23,42,0.08)", boxShadow: "0 10px 30px -14px rgba(15,23,42,0.18)" }}>
      <div className="absolute inset-0 av8-mesh-bg opacity-70 pointer-events-none" />
      <div className="relative z-10 p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span style={{ color: c.text }}>{icon}</span>}
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: c.text }}>{eyebrow}</div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none"
              style={{ background: `linear-gradient(120deg, ${c.text}, #e6edf6)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {title}
          </h2>
          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {badges.map((b, i) => {
                const bc = V8_TONE[b.tone || tone] || c;
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
                        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${bc.ring}`, color: bc.text, boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {b.dot && <span className="h-1.5 w-1.5 rounded-full av8-pulse-dot" style={{ background: bc.text }} />}
                    {b.icon}{b.label}
                  </span>
                );
              })}
            </div>
          )}
          {subtitle && <p className="text-[11px] mt-3 tracking-wide leading-relaxed max-w-md" style={{ color: "rgba(15,23,42,0.6)" }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

/** Filter pill button (tone-colored, glows when active). */
export function V8FilterPill(
  { label, count, active, tone, onClick }:
  { label: string; count: number; active: boolean; tone: V8Tone; onClick: () => void },
) {
  const c = V8_TONE[tone] || V8_TONE.amber;
  const text: Record<V8Tone, string> = { amber: "text-amber-300", emerald: "text-emerald-300", rose: "text-rose-300", cyan: "text-cyan-300" };
  return (
    <button onClick={onClick}
      className={`av8-action-btn px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all ${active ? text[tone] : "text-white/40 hover:text-white/70"}`}
      style={{
        background: active ? c.pill : "rgba(15,23,42,0.025)",
        border: active ? "1px solid rgba(15,23,42,0.15)" : "1px solid rgba(15,23,42,0.05)",
        boxShadow: active ? c.glow : "none",
      }}>
      {label}
      <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] av8-mono-num ${active ? "bg-black/30" : "bg-white/[0.04]"}`}>{count}</span>
    </button>
  );
}
