import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: "mint" | "gold" | "orange" | "none";
  onClick?: () => void;
}

const glowMap = {
  mint:   "0 0 0 1px hsl(var(--dtx-mint) / 0.35), 0 8px 28px hsl(var(--dtx-mint) / 0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  gold:   "0 0 0 1px hsl(var(--dtx-gold) / 0.45), 0 8px 28px hsl(var(--dtx-gold) / 0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
  orange: "0 0 0 1px hsl(var(--dtx-orange) / 0.45), 0 8px 28px hsl(var(--dtx-orange) / 0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
  none:   "",
};

export function Card({ children, className, glow = "none", onClick }: CardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <>
      <style>{`
        @keyframes v8-card-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .v8-shell-card { animation: v8-card-in 0.4s ease-out backwards; }
      `}</style>
      <Tag
        onClick={onClick}
        className={cn(
          "v8-shell-card block w-full text-left rounded-2xl p-4 transition-all",
          onClick && "active:scale-[0.98] hover:translate-y-[-2px]",
          className,
        )}
        style={{
          background: "var(--dtx-glass)",
          border: "1px solid hsl(var(--dtx-border) / 0.25)",
          boxShadow: glow !== "none" ? glowMap[glow] : "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {children}
      </Tag>
    </>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "win" | "loss" | "gold" | "mint";
  icon?: ReactNode;
}

const toneColor = {
  default: "hsl(var(--dtx-text))",
  win: "hsl(var(--dtx-win))",
  loss: "hsl(var(--dtx-loss))",
  gold: "hsl(var(--dtx-gold))",
  mint: "hsl(var(--dtx-mint))",
} as const;

const toneRing = {
  default: "hsl(var(--dtx-border) / 0.2)",
  win: "hsl(var(--dtx-win) / 0.25)",
  loss: "hsl(var(--dtx-loss) / 0.25)",
  gold: "hsl(var(--dtx-gold) / 0.30)",
  mint: "hsl(var(--dtx-mint) / 0.25)",
} as const;

export function StatCard({ label, value, hint, tone = "default", icon }: StatCardProps) {
  return (
    <div
      className="v8-shell-card rounded-2xl p-3 relative overflow-hidden"
      style={{
        background: "hsl(var(--dtx-panel) / 0.7)",
        border: `1px solid ${toneRing[tone]}`,
        backdropFilter: "blur(6px)",
      }}
    >
      {tone !== "default" && (
        <div
          aria-hidden
          style={{
            position: "absolute", top: -20, right: -20,
            width: 56, height: 56, borderRadius: "50%",
            background: `radial-gradient(circle, ${toneColor[tone].replace(")", " / 0.15)").replace("hsl(", "hsla(")}, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}
      <div className="relative flex items-center justify-between">
        <div className="text-[10px] font-bold tracking-[2px] text-dtx-muted uppercase truncate">
          {label}
        </div>
        {icon}
      </div>
      <div
        className="relative text-base sm:text-lg font-black tabular-nums mt-1 truncate"
        style={{
          fontFamily: "Space Mono, monospace",
          color: toneColor[tone],
          textShadow: tone !== "default" ? `0 0 12px ${toneColor[tone].replace(")", " / 0.4)").replace("hsl(", "hsla(")}` : "none",
        }}
      >
        {value}
      </div>
      {hint && <div className="relative text-[10px] text-dtx-muted mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

interface RowCardProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export function RowCard({ icon, title, subtitle, right, onClick, danger }: RowCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "v8-shell-card w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition",
        onClick && "active:scale-[0.99] hover:bg-white/[0.04] hover:translate-x-[2px]",
      )}
      style={{
        background: "hsl(var(--dtx-panel) / 0.6)",
        border: `1px solid ${danger ? "hsl(var(--dtx-loss) / 0.4)" : "hsl(var(--dtx-border) / 0.18)"}`,
      }}
    >
      {icon && (
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: danger ? "hsl(var(--dtx-loss) / 0.10)" : "hsl(var(--dtx-mint) / 0.10)",
            border: danger ? "1px solid hsl(var(--dtx-loss) / 0.25)" : "1px solid hsl(var(--dtx-mint) / 0.20)",
          }}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-bold truncate", danger && "text-red-300")}>{title}</div>
        {subtitle && <div className="text-[11px] text-dtx-muted truncate mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </Tag>
  );
}
