import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon, title, description, ctaLabel, ctaTo, onCta }: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center text-center px-6 py-14 relative">
      <style>{`
        @keyframes v8-empty-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--dtx-mint) / 0.35), 0 0 32px 0 hsl(var(--dtx-mint) / 0.2); }
          50% { box-shadow: 0 0 0 8px hsl(var(--dtx-mint) / 0.10), 0 0 48px 0 hsl(var(--dtx-mint) / 0.4); }
        }
        @keyframes v8-empty-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes v8-empty-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes v8-empty-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .v8-empty-icon-wrap { animation: v8-empty-float 3s ease-in-out infinite, v8-empty-pulse 2.5s ease-in-out infinite; }
        .v8-empty-orbit-ring { animation: v8-empty-orbit 12s linear infinite; }
        .v8-empty-text { animation: v8-empty-fade-up 0.5s ease-out 0.1s both; }
        .v8-empty-cta { animation: v8-empty-fade-up 0.5s ease-out 0.25s both; }
        .v8-empty-cta:active { transform: scale(0.96); }
      `}</style>
      <div className="relative mb-5">
        {/* Outer orbit ring */}
        <div
          className="absolute inset-0 v8-empty-orbit-ring"
          style={{
            width: 96, height: 96,
            left: -16, top: -16,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, transparent 0deg, hsl(var(--dtx-mint) / 0.4) 60deg, transparent 120deg, hsl(var(--dtx-gold) / 0.4) 200deg, transparent 260deg, hsl(var(--dtx-mint) / 0.4) 340deg, transparent 360deg)",
            WebkitMask: "radial-gradient(circle, transparent 36px, black 38px, black 46px, transparent 47px)",
            mask: "radial-gradient(circle, transparent 36px, black 38px, black 46px, transparent 47px)",
            opacity: 0.6,
          }}
        />
        {/* Inner icon halo */}
        <div
          className="v8-empty-icon-wrap w-16 h-16 rounded-full flex items-center justify-center relative"
          style={{
            background: "radial-gradient(circle, hsl(var(--dtx-mint) / 0.20), hsl(var(--dtx-mint) / 0.04))",
            border: "1px solid hsl(var(--dtx-mint) / 0.35)",
          }}
        >
          {icon}
        </div>
      </div>
      <h3 className="v8-empty-text text-base font-black" style={{ fontFamily: "Syne, sans-serif" }}>
        {title}
      </h3>
      {description && (
        <p className="v8-empty-text text-xs text-dtx-muted mt-1.5 max-w-[260px] leading-relaxed">
          {description}
        </p>
      )}
      {(ctaLabel && (ctaTo || onCta)) && (
        <button
          onClick={() => (onCta ? onCta() : ctaTo && navigate(ctaTo))}
          className="v8-empty-cta mt-5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          style={{
            background: "var(--dtx-gradient-cta)",
            color: "hsl(var(--dtx-bg))",
            boxShadow: "0 6px 22px hsl(var(--dtx-mint) / 0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
