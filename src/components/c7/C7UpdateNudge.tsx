/**
 * C7UpdateNudge — "new version available, tap to refresh" prompt.
 *
 * The service worker (public/sw.js) skipWaiting()s + clients.claim()s, so a new
 * deploy takes control of open tabs immediately; index.html then auto-reloads
 * the page — but ONLY when it is backgrounded, never mid-interaction. A user who
 * keeps the app in the foreground for a long stretch therefore keeps running the
 * OLD build until they next background it (the exact "my screen is stale" case).
 *
 * This closes that gap: when index.html detects a freshly-activated worker took
 * control WHILE the app is visible, it dispatches `c7:update-ready`. We surface a
 * small, dismissible pill so the user can refresh to the latest build on demand.
 * (The background auto-reload still happens too — this is an extra, immediate
 * opt-in, not a replacement.)
 *
 * Self-contained (no toast host required), reduced-motion safe, sits above the
 * bottom nav, hidden on the /admin console. Pure presentation.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function C7UpdateNudge() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onReady = () => setShow(true);
    window.addEventListener("c7:update-ready", onReady as EventListener);
    return () => window.removeEventListener("c7:update-ready", onReady as EventListener);
  }, []);

  // Never interrupt the admin console with a player-facing refresh pill.
  if (!show || loc.pathname.startsWith("/admin")) return null;

  const refresh = () => {
    if (busy) return;
    setBusy(true);
    window.location.reload();
  };

  return (
    <div className="c7upd" role="status" aria-live="polite">
      <style>{CSS}</style>
      <span className="c7upd-ic" aria-hidden="true">✨</span>
      <span className="c7upd-tx">
        <b>New version available</b>
        <em>Refresh to get the latest</em>
      </span>
      <button className="c7upd-go" onClick={refresh} disabled={busy}>
        {busy ? "…" : "Refresh"}
      </button>
      <button className="c7upd-x" aria-label="Dismiss" onClick={() => setShow(false)}>×</button>
    </div>
  );
}

const CSS = `
.c7upd { position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(76px + env(safe-area-inset-bottom, 0px)); z-index: 300;
  display: flex; align-items: center; gap: 10px; max-width: min(92vw, 420px);
  padding: 9px 9px 9px 13px; border-radius: 999px; font-family: Inter, system-ui, sans-serif;
  background: linear-gradient(160deg, #ffffff, #f6fbf8);
  border: 1px solid rgba(217,154,31,0.55);
  box-shadow: 0 14px 34px -12px rgba(10,61,41,0.5), 0 0 0 1px rgba(10,143,91,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
  animation: c7upd-in .28s cubic-bezier(.2,.85,.25,1) both; }
.c7upd-ic { font-size: 16px; line-height: 1; flex-shrink: 0; }
.c7upd-tx { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.c7upd-tx b { font-size: 13px; font-weight: 800; color: #0a3d29; white-space: nowrap; }
.c7upd-tx em { font-size: 10.5px; font-style: normal; font-weight: 600; color: #0a8f5b; white-space: nowrap; }
.c7upd-go { flex-shrink: 0; cursor: pointer; font-family: inherit; font-weight: 800; font-size: 12.5px;
  color: #ffffff; padding: 8px 15px; border-radius: 999px; border: 1px solid #0a8f5b;
  background: linear-gradient(180deg, #12b271, #0a8f5b);
  box-shadow: 0 6px 14px -6px rgba(10,143,91,0.7), inset 0 1px 0 rgba(255,255,255,0.3);
  transition: transform .12s ease, filter .2s ease; }
.c7upd-go:active { transform: scale(0.95); }
.c7upd-go:disabled { opacity: 0.7; cursor: default; }
.c7upd-x { flex-shrink: 0; cursor: pointer; font-family: inherit; font-size: 18px; line-height: 1;
  color: #8e8e8e; background: transparent; border: 0; padding: 4px 8px 6px; border-radius: 999px; }
.c7upd-x:hover { color: #262626; }
@keyframes c7upd-in { from { opacity: 0; transform: translate(-50%, 14px); } to { opacity: 1; transform: translate(-50%, 0); } }
@media (prefers-reduced-motion: reduce) { .c7upd { animation: none; } .c7upd-go { transition: none; } }
`;
