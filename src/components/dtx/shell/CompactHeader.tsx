import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string | null;
  balance?: number | null;
  right?: ReactNode;
}

export default function CompactHeader({ title, subtitle, backTo, balance, right }: Props) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 border-b"
      style={{
        background: "hsl(var(--dtx-bg) / 0.85)",
        borderColor: "hsl(var(--dtx-border) / 0.25)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
      }}
    >
      <style>{`
        @keyframes v8-coin-spin {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
        }
        @keyframes v8-bal-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .v8-bal-pill {
          background: linear-gradient(90deg,
            hsl(var(--dtx-mint) / 0.10) 0%,
            hsl(var(--dtx-gold) / 0.15) 50%,
            hsl(var(--dtx-mint) / 0.10) 100%);
          background-size: 200% 100%;
          animation: v8-bal-shimmer 5s linear infinite;
        }
        .v8-coin-icon { animation: v8-coin-spin 4s ease-in-out infinite; transform-style: preserve-3d; }
      `}</style>
      {backTo !== null && (
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 active:scale-95 transition"
        >
          <ArrowLeft className="h-4 w-4 text-dtx-muted" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1
          className="text-base font-black truncate leading-tight"
          style={{ fontFamily: "Syne, sans-serif", letterSpacing: 0.3 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-dtx-muted truncate leading-tight mt-0.5">{subtitle}</p>
        )}
      </div>
      {right ?? (
        balance !== undefined && balance !== null && (
          <div
            className="v8-bal-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              border: "1px solid hsl(var(--dtx-gold) / 0.40)",
              boxShadow: "0 4px 16px -4px hsl(var(--dtx-gold) / 0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <Coins className="v8-coin-icon h-3.5 w-3.5" style={{ color: "hsl(var(--dtx-gold))" }} />
            <span
              className="text-sm font-black tabular-nums"
              style={{
                fontFamily: "Space Mono, monospace",
                color: "hsl(var(--dtx-gold))",
                textShadow: "0 0 8px hsl(var(--dtx-gold) / 0.3)",
              }}
            >
              ${(balance ?? 0).toFixed(2)}
            </span>
          </div>
        )
      )}
    </header>
  );
}
