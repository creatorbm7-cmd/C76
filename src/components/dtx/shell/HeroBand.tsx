import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Metric {
  label: string;
  value: string;
  tone?: "default" | "win" | "loss" | "gold" | "mint";
}

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  balance?: number | null;
  metrics?: Metric[];
  right?: ReactNode;
}

const tone = {
  default: "hsl(var(--dtx-text))",
  win: "hsl(var(--dtx-win))",
  loss: "hsl(var(--dtx-loss))",
  gold: "hsl(var(--dtx-gold))",
  mint: "hsl(var(--dtx-mint))",
} as const;

/**
 * Full-bleed hero band for Home + Wallet.
 * Includes mesh background, optional balance pill, CTAs, and metric strip.
 */
export default function HeroBand({
  eyebrow, title, subtitle, ctaLabel, ctaTo, secondaryLabel, secondaryTo,
  balance, metrics, right,
}: Props) {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden px-4 pt-6 pb-5"
      style={{
        background:
          "radial-gradient(ellipse 70% 80% at 80% 0%, hsl(var(--dtx-mint) / 0.18) 0%, transparent 55%)," +
          "radial-gradient(ellipse 55% 70% at 0% 100%, hsl(var(--dtx-orange) / 0.10) 0%, transparent 60%)",
        paddingTop: "calc(24px + env(safe-area-inset-top, 0px))",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <div
              className="text-[10px] font-bold tracking-[3px] uppercase mb-2"
              style={{ color: "hsl(var(--dtx-mint))" }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            className="text-2xl sm:text-3xl font-black leading-tight"
            style={{ fontFamily: "Syne, sans-serif", letterSpacing: -0.2 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-dtx-muted mt-1.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {right}
      </div>

      {balance !== undefined && balance !== null && (
        <div
          className="mt-4 rounded-2xl p-4 flex items-end justify-between"
          style={{
            background: "var(--dtx-glass)",
            border: "1px solid hsl(var(--dtx-mint) / 0.25)",
            boxShadow: "inset 0 1px 0 hsl(var(--dtx-mint) / 0.08)",
          }}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[2px] text-dtx-muted uppercase">Balance</div>
            <div
              className="text-3xl font-black tabular-nums leading-none mt-1"
              style={{ fontFamily: "Space Mono, monospace", color: "hsl(var(--dtx-gold))" }}
            >
              ${(balance ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-dtx-muted mt-1">USDT</div>
          </div>
          <div className="flex gap-2 shrink-0">
            {ctaLabel && ctaTo && (
              <button
                onClick={() => navigate(ctaTo)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-transform active:scale-95"
                style={{
                  background: "var(--dtx-gradient-cta)",
                  color: "hsl(var(--dtx-bg))",
                  boxShadow: "0 6px 18px hsl(var(--dtx-mint) / 0.35)",
                }}
              >
                {ctaLabel}
              </button>
            )}
            {secondaryLabel && secondaryTo && (
              <button
                onClick={() => navigate(secondaryTo)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-transform active:scale-95"
                style={{
                  background: "hsl(var(--dtx-panel) / 0.6)",
                  color: "hsl(var(--dtx-text))",
                  border: "1px solid hsl(var(--dtx-border) / 0.3)",
                }}
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {metrics && metrics.length > 0 && (
        <div
          className="mt-3 grid gap-px rounded-2xl overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
            background: "hsl(var(--dtx-border) / 0.25)",
            border: "1px solid hsl(var(--dtx-border) / 0.25)",
          }}
        >
          {metrics.map((m, i) => (
            <div key={i} className="px-3 py-3" style={{ background: "hsl(var(--dtx-panel) / 0.7)" }}>
              <div className="text-[9px] font-bold tracking-[1.5px] text-dtx-muted uppercase truncate">
                {m.label}
              </div>
              <div
                className="text-sm font-black tabular-nums mt-1 truncate"
                style={{
                  fontFamily: "Space Mono, monospace",
                  color: tone[m.tone ?? "default"],
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
