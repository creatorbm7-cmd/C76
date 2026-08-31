// V2GameLauncher — launches a real 2J game in a premium fullscreen frame.
//
// Reuses the EXISTING launch contract verbatim: launchProviderGame(uid, provider)
// → signed URL → iframe (same allow/allowFullScreen attrs as LiveApiGames). No
// change to 2J launch logic, no wallet/payment/balance calls. Requires login
// (the igaming contract has no guest/demo) — shows a sign-in prompt otherwise.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ExternalLink, LogIn, AlertCircle } from "lucide-react";
import { launchProviderGame, type CatalogGame } from "@/lib/igaming";
import { enterImmersive, exitImmersive } from "@/lib/immersive";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import { writeLaunchMarker } from "@/lib/c7launch";

type State =
  | { s: "loading" }
  | { s: "ready"; url: string }
  | { s: "signin" }
  | { s: "soon" }
  | { s: "error"; detail?: string };

export default function V2GameLauncher({ game, onClose }: { game: CatalogGame; onClose: () => void }) {
  const nav = useNavigate();
  const [st, setSt] = useState<State>({ s: "loading" });
  const started = useRef(false);
  const pulse = useC7Pulse();

  // Pre-game C7 intro (Phase 3.1): a brief "you're inside C7" moment shown over
  // the launch splash — energy active, mining multiplier, streak — so provider
  // games feel part of the ecosystem. Presentation only; auto-continues to launch.
  const intro = (
    <div className="v2gl-intro">
      <div className="v2gl-intro-badge">⚡ C7 ENERGY ACTIVE</div>
      <div className="v2gl-intro-row">
        {pulse.ready && <span className="v2gl-intro-chip">🟢 {Math.round(pulse.energy).toLocaleString("en-US")} C74</span>}
        <span className="v2gl-intro-chip">⛏️ Mining ×{pulse.vipMult.toFixed(2)}</span>
        <span className="v2gl-intro-chip">🔥 {pulse.streak}d streak</span>
      </div>
      <div className="v2gl-intro-tag">Win today → climb toward the next rank</div>
    </div>
  );

  useEffect(() => { enterImmersive(); return exitImmersive; }, []);

  // This provider refuses to render its reels when our app is in the iframe
  // ancestor chain (frame-ancestors), so embedded launches only ever show the
  // shell/header. The confirmed-working path is a TOP-LEVEL launch, so once the
  // signed URL is ready we navigate the whole window to the game. The game's
  // own home button (return URL) — or the browser back button — returns here.
  useEffect(() => {
    if (st.s !== "ready") return;
    const target = st.url;
    // Hold ~2.2s so the C7 pre-game intro is actually seen; the "Enter game"
    // button below lets the player skip straight in.
    const t = window.setTimeout(() => { window.location.href = target; }, 2200);
    return () => window.clearTimeout(t);
  }, [st]);

  // Phase 3.2: snapshot C7 state before the top-level launch so we can show a
  // return/victory summary when the player comes back. Only when the pulse has
  // real data (a 0 snapshot would make the whole balance read as "earned").
  // Pure localStorage; credits nothing. Decoupled from the redirect timer.
  useEffect(() => {
    if (st.s !== "ready" || !pulse.ready) return;
    writeLaunchMarker({ game: game.name, energy: pulse.energy, streak: pulse.streak, rankIdx: pulse.rank.idx, ts: Date.now() });
  }, [st.s, pulse.ready, pulse.energy, pulse.streak, pulse.rank.idx, game.name]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;
    launchProviderGame(game.uid, game.provider).then((res) => {
      if (!alive) return;
      if (res.ok) setSt({ s: "ready", url: res.url });
      else if (res.reason === "unauthenticated") setSt({ s: "signin" });
      else if (res.reason === "not_configured") setSt({ s: "soon" });
      else setSt({ s: "error", detail: res.detail });
    });
    return () => { alive = false; };
  }, [game.uid, game.provider]);

  const url = st.s === "ready" ? st.url : "";

  return (
    <div className="v2gl" role="dialog" aria-label={game.name}>
      <style>{CSS}</style>
      <div className="v2gl-bar">
        <span className="v2gl-bar-line" aria-hidden="true" />
        <button className="v2gl-x" onClick={onClose} aria-label="Back to lobby"><ArrowLeft size={18} /></button>
        <span className="v2gl-live" aria-hidden="true"><i />LIVE</span>
        <span className="v2gl-name">{game.name}</span>
        {st.s === "ready" && <button className="v2gl-ext" onClick={() => window.open(url, "_blank", "noopener")} aria-label="Open in new tab"><ExternalLink size={16} /></button>}
      </div>

      <div className="v2gl-stage">
        {st.s === "loading" && (
          <div className="v2gl-splash">
            <div className="v2gl-orb" aria-hidden="true">
              <span className="v2gl-orb-ring" />
              <span className="v2gl-coin">🪙</span>
            </div>
            <Loader2 size={22} className="v2gl-spin" />
            <div className="v2gl-splash-t">Launching {game.name}…</div>
            <div className="v2gl-splash-sub">Securing your live session</div>
            {intro}
          </div>
        )}

        {st.s === "ready" && (
          <div className="v2gl-splash">
            <div className="v2gl-orb" aria-hidden="true">
              <span className="v2gl-orb-ring" />
              <span className="v2gl-coin">🪙</span>
            </div>
            <div className="v2gl-splash-t">Entering {game.name}…</div>
            <div className="v2gl-splash-sub">Opening the game in full screen</div>
            {intro}
            <button className="v2gl-cta" onClick={() => { window.location.href = url; }}>▶ Enter game</button>
            <button className="v2gl-ghost" onClick={() => window.open(url, "_blank", "noopener")}>Open in a new tab instead</button>
          </div>
        )}

        {st.s === "signin" && (
          <div className="v2gl-msg">
            <LogIn size={30} />
            <div className="v2gl-msg-t">Sign in to play live games</div>
            <button className="v2gl-cta" onClick={() => nav("/login?next=/v3")}>Sign in</button>
            <button className="v2gl-ghost" onClick={onClose}>Back to lobby</button>
          </div>
        )}

        {st.s === "soon" && (
          <div className="v2gl-msg">
            <Loader2 size={30} className="v2gl-spin" />
            <div className="v2gl-msg-t">Live games are being enabled — coming soon!</div>
            <button className="v2gl-ghost" onClick={onClose}>Back to lobby</button>
          </div>
        )}

        {st.s === "error" && (
          <div className="v2gl-msg">
            <AlertCircle size={30} />
            <div className="v2gl-msg-t">Couldn't launch this game.{st.detail ? ` (${st.detail})` : ""}</div>
            <button className="v2gl-ghost" onClick={onClose}>Back to lobby</button>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.v2gl { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column; background: radial-gradient(120% 60% at 50% -6%, rgba(255,208,88,0.28), transparent 52%), radial-gradient(130% 92% at 50% -6%, #0d3d28, #072517 46%, #04160d 100%); color: #eeffdc; font-family: Inter, system-ui, sans-serif; }
.v2gl-bar { position: relative; display: flex; align-items: center; gap: 10px; padding: 11px 14px;
  background: linear-gradient(180deg, #122b0e, #061a10);
  border-bottom: 1px solid rgba(120,240,176,0.28);
  box-shadow: 0 8px 22px -14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08); }
.v2gl-bar-line { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, #39ff88 22%, #f6c945 46%, #ffe9a8 70%, transparent);
  opacity: 0.85; }
.v2gl-x, .v2gl-ext { flex: none; width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; cursor: pointer; color: #d6ffe9;
  background: radial-gradient(120% 120% at 50% 0%, rgba(46,224,138,0.2), rgba(255,255,255,0.05)); border: 1px solid rgba(120,240,176,0.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14); }
.v2gl-x:active, .v2gl-ext:active { transform: translateY(1px); }
.v2gl-live { flex: none; display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 900; letter-spacing: 0.9px; color: #fff; padding: 4px 8px; border-radius: 999px;
  background: linear-gradient(180deg, #ff5a8a, #e11d48); box-shadow: 0 2px 9px -2px rgba(225,29,72,0.6); }
.v2gl-live i { width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: 0 0 7px #ff9ec4; animation: v2gl-blink 1.1s ease-in-out infinite; }
@keyframes v2gl-blink { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
.v2gl-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: #eeffd8; text-shadow: 0 0 12px rgba(46,224,138,0.35); }
.v2gl-stage { flex: 1; position: relative; overflow: hidden; }
.v2gl-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.v2gl-splash, .v2gl-msg { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; text-align: center; padding: 26px;
  background: radial-gradient(120% 80% at 50% -6%, rgba(255,205,80,0.16), transparent 52%), radial-gradient(120% 72% at 50% 30%, rgba(16,88,56,0.92), rgba(4,26,16,0.96)); }
/* C7 pre-game intro block */
.v2gl-intro { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 4px; }
.v2gl-intro-badge { font-size: 10px; font-weight: 900; letter-spacing: 1.6px; padding: 5px 13px; border-radius: 999px; color: #2a1c04;
  background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #ffe9a8, #f6c945 55%, #d68a1e);
  box-shadow: 0 4px 14px -4px rgba(246,201,69,0.6), inset 0 1px 0 rgba(255,255,255,0.6); }
.v2gl-intro-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.v2gl-intro-chip { font-size: 11.5px; font-weight: 800; color: #eafff4; padding: 6px 11px; border-radius: 999px;
  background: linear-gradient(160deg, rgba(15,92,60,0.7), rgba(5,32,20,0.8)); border: 1px solid rgba(120,240,176,0.34);
  box-shadow: inset 0 1px 0 rgba(246,230,176,0.14); font-variant-numeric: tabular-nums; }
.v2gl-intro-tag { font-size: 11px; font-weight: 700; color: rgba(214,255,233,0.72); }
/* Loading orb — a glowing reel token with an orbiting ring */
.v2gl-orb { position: relative; width: 92px; height: 92px; display: grid; place-items: center; }
.v2gl-orb-ring { position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, rgba(246,201,69,0.5) 20%, rgba(46,224,138,0.6) 44%, rgba(255,231,160,0.5) 68%, transparent 88%);
  -webkit-mask: radial-gradient(circle, transparent 60%, #000 62%); mask: radial-gradient(circle, transparent 60%, #000 62%);
  animation: v2gl-rot 2.4s linear infinite; }
.v2gl-coin { font-size: 44px; filter: drop-shadow(0 8px 20px rgba(46,224,138,0.55)); animation: v2gl-bob 2s ease-in-out infinite; }
@keyframes v2gl-bob { 0%,100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-7px) rotate(6deg); } }
.v2gl-spin { color: #cfeee0; animation: v2gl-rot 1s linear infinite; } @keyframes v2gl-rot { to { transform: rotate(360deg); } }
.v2gl-splash-t, .v2gl-msg-t { font-size: 15px; font-weight: 900; color: #fff; max-width: 300px; letter-spacing: 0.2px; }
.v2gl-splash-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.4px; color: rgba(176,240,200,0.7); margin-top: -4px; }
/* Message state icon gets a framed glow halo */
.v2gl-msg { color: #cfeee0; }
.v2gl-msg > svg:first-child { width: 54px; height: 54px; padding: 12px; border-radius: 16px; color: #eafff4;
  background: radial-gradient(120% 120% at 50% 0%, rgba(46,224,138,0.22), rgba(255,255,255,0.04)); border: 1px solid rgba(120,240,176,0.32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 10px 26px -14px rgba(46,224,138,0.6); }
.v2gl-cta { position: relative; overflow: hidden; margin-top: 6px; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 900; color: #052012; padding: 13px 26px; border-radius: 14px;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.75), transparent 52%), linear-gradient(180deg, #d6ffe9, #39ff88 45%, #00a86b);
  box-shadow: 0 5px 0 #0a5e3a, inset 0 2px 0 rgba(255,255,255,0.8), 0 12px 24px -10px rgba(46,224,138,0.55); }
.v2gl-cta::before { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); transform: skewX(-18deg); animation: v2gl-shine 3.4s ease-in-out infinite; }
@keyframes v2gl-shine { 0%,72% { left: -60%; } 100% { left: 130%; } }
.v2gl-cta:active { transform: translateY(3px); box-shadow: 0 2px 0 #0a5e3a, inset 0 2px 0 rgba(255,255,255,0.8); }
.v2gl-ghost { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 800; color: rgba(214,255,233,0.65); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(120,240,176,0.4); }
@media (prefers-reduced-motion: reduce) { .v2gl-coin, .v2gl-spin, .v2gl-orb-ring, .v2gl-live i, .v2gl-cta::before { animation: none !important; } }
`;
