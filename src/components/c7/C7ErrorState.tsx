// C7ErrorState — the shared premium "couldn't load" panel for data surfaces.
//
// Deep-emerald card, gold-framed amber warning, clear message + a gold Retry
// button. Use when a data fetch genuinely failed (not merely empty) so the user
// sees an honest, recoverable state instead of a blank or fake-zero screen.
import { AlertTriangle, RotateCw } from "lucide-react";

export default function C7ErrorState({
  title = "Couldn't load",
  message = "Something went wrong reaching the server. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  compact = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={`c7err${compact ? " c7err--compact" : ""}`} role="alert">
      <style>{CSS}</style>
      <span className="c7err-ic" aria-hidden="true"><AlertTriangle size={compact ? 20 : 26} /></span>
      <div className="c7err-t">{title}</div>
      <div className="c7err-m">{message}</div>
      {onRetry && (
        <button type="button" className="c7err-btn" onClick={onRetry}>
          <RotateCw size={14} /> {retryLabel}
        </button>
      )}
    </div>
  );
}

const CSS = `
.c7err { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 7px;
  padding: 30px 22px; border-radius: 16px;
  background: radial-gradient(120% 90% at 50% 0%, rgba(46,224,138,0.07), transparent 60%), linear-gradient(160deg, rgba(16,54,36,0.7), rgba(6,20,13,0.85));
  border: 1px solid rgba(246,201,69,0.28); box-shadow: inset 0 1px 0 rgba(255,244,214,0.10), 0 12px 26px -16px rgba(0,0,0,0.85); }
.c7err--compact { padding: 18px 16px; border-radius: 13px; }
.c7err-ic { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; color: #ffcf4d; margin-bottom: 2px;
  background: radial-gradient(60% 60% at 50% 35%, rgba(255,207,77,0.18), rgba(255,120,90,0.10));
  box-shadow: inset 0 0 0 1.5px rgba(246,201,69,0.55), 0 0 20px -6px rgba(255,160,60,0.6); }
.c7err--compact .c7err-ic { width: 40px; height: 40px; }
.c7err-t { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -0.2px; }
.c7err--compact .c7err-t { font-size: 13.5px; }
.c7err-m { font-size: 12.5px; line-height: 1.5; color: rgba(222,244,228,0.66); max-width: 300px; }
.c7err-btn { margin-top: 8px; display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 9px 18px; border-radius: 999px; border: none; font-size: 12.5px; font-weight: 900; letter-spacing: 0.3px; color: #241808;
  background: radial-gradient(120% 120% at 50% 10%, #fff2c0, #f6c945 55%, #c68a2e); box-shadow: 0 3px 10px -3px rgba(245,180,35,0.7); }
.c7err-btn:active { transform: scale(0.95); }
@media (prefers-reduced-motion: reduce) { .c7err-btn:active { transform: none; } }
`;
