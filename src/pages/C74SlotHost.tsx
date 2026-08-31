/**
 * C74SlotHost — premium fullscreen frame that hosts a locally-installed HTML5
 * slot game (C74 Originals) at /play/:slug. Loads `public/games-html/<slug>/
 * index.html` in an iframe, behind a premium C74 entry screen (gold glow,
 * game logo, live jackpot counter, ENTER button, gold-dust particles).
 *
 * The heavy Phaser bundle is only mounted after the player taps ENTER. The 2J
 * aggregator flow is separate and untouched. Missing files → graceful state.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDtxBalance } from '@/hooks/useDtxBalance';
import { useDtxStore } from '@/store/dtxStore';
import { ArrowLeft, Loader2, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { enterImmersive, exitImmersive } from '@/lib/immersive';
import { c74OriginalBySlug, resolveC74Original, slugToName, type C74Original } from '@/games/c74originals/registry';
import C74MegaWin from '@/games/c74originals/C74MegaWin';
import { v2audio } from '@/pages/v2/v2audio';
import { useC7Pulse } from '@/hooks/useC7Pulse';
import C7TierIcon from '@/components/c7/C7TierIcon';
import C7Icon from '@/components/c7/C7Icon';
import { rankTheme } from '@/lib/c7rank';

type Probe = 'checking' | 'ready' | 'missing';

// ── Real-money slot gate (Phase B-5). DEFAULT OFF → games run free-play/demo.
// Real money stays HELD pending the Envato Extended license + explicit
// authorization + B-6 validation (see docs/C74-SLOT-PHASE-B-*). Flipping this
// to true only enables the bridge; the slot-spin edge fn is ALSO gated
// server-side by SLOT_REAL_MONEY_ENABLED, so both must be on to move real USDT.
const SLOT_REAL_MONEY = false;
// Slugs that are wired to the server-authoritative engine (only mayan-temple).
const REAL_MONEY_SLUGS = new Set<string>(['mayan-temple']);

export default function C74SlotHost() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  // Resolve meta from the data-driven registry (built-in → games.json → slug
  // fallback), so ANY installed folder hosts even without a registry entry.
  const [game, setGame] = useState<C74Original | null>(
    c74OriginalBySlug(slug) ?? { slug, name: slugToName(slug), category: 'slots', provider: 'C74 Originals', enabled: true, orientation: 'portrait' }
  );
  const src = `/games-html/${slug}/index.html`;
  const [probe, setProbe] = useState<Probe>('checking');
  const [entered, setEntered] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [jackpot, setJackpot] = useState(4821940);
  const [c7open, setC7open] = useState(false);   // Phase 4: in-game C7 chip expanded?
  const pulse = useC7Pulse();
  const rt = rankTheme(pulse.rank.idx);

  // ── Real-money bridge (B-5) — host owns the wallet; game only animates ──────
  const frameRef = useRef<HTMLIFrameElement>(null);
  useDtxBalance(); // activate the live USDT balance subscription
  const usdtBalance = useDtxStore((s) => s.balance);
  const realMode = SLOT_REAL_MONEY && REAL_MONEY_SLUGS.has(slug);
  const balRef = useRef(usdtBalance);
  balRef.current = usdtBalance;

  const postToGame = (msg: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  };

  useEffect(() => {
    // Origin-checked postMessage broker. In demo mode we still answer `init`
    // (mode:'demo') so the game knows it must use its own client RNG; we never
    // call the settle function unless realMode is on (both flags + wired slug).
    const onMsg = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object' || typeof d.c74 !== 'string') return;

      if (d.c74 === 'ready') {
        postToGame({ c74: 'init', mode: realMode ? 'real' : 'demo', currency: 'USDT', balance: balRef.current });
        return;
      }
      if (d.c74 === 'balanceRequest') {
        postToGame({ c74: 'balance', balance: balRef.current });
        return;
      }
      if (d.c74 === 'spin') {
        if (!realMode) { postToGame({ c74: 'error', code: 'DEMO_ONLY', message: 'Demo mode' }); return; }
        try {
          const idempotency_key = `${slug}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
          const { data, error } = await supabase.functions.invoke('slot-spin', {
            body: { mode: 'real', lineBet: d.lineBet, lines: d.lines, idempotency_key },
          });
          if (error || !data?.success) {
            postToGame({ c74: 'error', code: data?.code ?? 'ERROR', message: data?.error ?? error?.message ?? 'Spin failed' });
            return;
          }
          postToGame({
            c74: 'result', stops: data.stops, win: data.win, balance: data.balance,
            seedHash: data.seedHash, nonce: data.nonce, roundId: data.roundId,
          });
          window.dispatchEvent(new Event('dtx:balance-updated'));
        } catch (err) {
          postToGame({ c74: 'error', code: 'NETWORK', message: String((err as Error)?.message ?? err) });
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [realMode, slug]);

  useEffect(() => { enterImmersive(); return exitImmersive; }, []);

  // Sound bridge: duck the lobby ambience while a game is open so it never
  // clashes with the game's own audio; resume it on return to the lobby.
  useEffect(() => { v2audio.pauseAmbience(); return () => { v2audio.resume(); }; }, []);

  // Enrich meta from the data-driven registry (games.json), keeping the sync
  // fallback until it resolves so the host paints instantly.
  useEffect(() => {
    let alive = true;
    resolveC74Original(slug).then((g) => { if (alive) setGame(g); }).catch(() => { /* keep fallback */ });
    return () => { alive = false; };
  }, [slug]);

  // Probe the entry file before showing anything (a 404 still "loads" in an iframe).
  useEffect(() => {
    if (!game) { setProbe('missing'); return; }
    let alive = true;
    fetch(src, { method: 'HEAD' })
      .then((r) => { if (alive) setProbe(r.ok ? 'ready' : 'missing'); })
      .catch(() => { if (alive) setProbe('missing'); });
    return () => { alive = false; };
  }, [src, game]);

  // Live jackpot counter — ticks up on the entry screen and keeps ticking on the
  // in-game Frame-Rich totem strip (display-only; not tied to the game).
  useEffect(() => {
    const t = setInterval(() => setJackpot((v) => v + Math.floor(7 + Math.abs(Math.sin(v)) * 40)), entered ? 900 : 220);
    return () => clearInterval(t);
  }, [entered]);

  // C74 slots are reached from the games rail — fall back to the V3 home.
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/v3'));
  const goFullscreen = () => { try { (document.querySelector('.c74sh-stage') as HTMLElement | null)?.requestFullscreen?.(); } catch { /* noop */ } };

  return (
    <div className="c74sh">
      <style>{CSS}</style>
      <header className="c74sh-bar">
        <button className="c74sh-back" onClick={back} aria-label="Back"><ArrowLeft size={18} /> Lobby</button>
        <span className="c74sh-name">{game?.name ?? 'Game'}</span>
        <span className="c74sh-tools">
          <button className="c74sh-ic" onClick={() => setMuted((m) => !m)} aria-label="Sound">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
          <button className="c74sh-ic" onClick={goFullscreen} aria-label="Fullscreen"><Maximize2 size={15} /></button>
        </span>
      </header>

      {/* FR-3: Jackpot Totem Strip — in-game decorative header (outside the play area) */}
      {probe === 'ready' && entered && (
        <div className="c74sh-totem" aria-hidden="true">
          <span className="c74sh-totem-torch" />
          <span className="c74sh-totem-k">💰 JACKPOT POOL</span>
          <b className="c74sh-totem-v">{jackpot.toLocaleString('en-US')}<i> C74</i></b>
          <span className="c74sh-totem-torch" />
        </div>
      )}

      <div className="c74sh-stage">
        {probe === 'checking' && (
          <div className="c74sh-state"><Loader2 className="c74sh-spin" size={30} /><span>Loading…</span></div>
        )}

        {probe === 'missing' && (
          <div className="c74sh-state">
            <div className="c74sh-card c7p-card-gold">
              <span className="c74sh-emoji">🎰</span>
              <span className="c74sh-t">{game ? `${game.name} is being installed` : 'Game not found'}</span>
              <span className="c74sh-s">{game
                ? 'Drop the package into public/games-html/' + slug + '/ and enable it.'
                : 'This game is not in the C74 Originals registry.'}</span>
              <button className="c7p-btn-gold c74sh-cta" onClick={back}>← Back to lobby</button>
            </div>
          </div>
        )}

        {/* Premium C74 entry screen — gold glow, logo, live jackpot, ENTER */}
        {probe === 'ready' && !entered && (
          <div className="c74sh-intro">
            <div className="c74sh-dust" aria-hidden="true">{Array.from({ length: 16 }).map((_, i) => (
              <i key={i} style={{ left: `${(i * 6.3) % 100}%`, animationDelay: `${(i % 8) * 0.6}s`, animationDuration: `${5 + (i % 5)}s` }} />
            ))}</div>
            <div className="c74sh-glow" aria-hidden="true" />
            <span className="c74sh-badge">C74 ORIGINALS</span>
            <div className="c74sh-logo">{game?.name}</div>
            <div className="c74sh-jp">
              <span className="c74sh-jp-k">💰 JACKPOT</span>
              <b>{jackpot.toLocaleString('en-US')}<i> C74</i></b>
            </div>
            <div className="c74sh-c7">
              <span className="c74sh-c7-badge">⚡ C7 ENERGY ACTIVE</span>
              <span className="c74sh-c7-row">
                {pulse.ready && <span className="c74sh-c7-chip">🟢 {Math.round(pulse.energy).toLocaleString('en-US')} C74</span>}
                <span className="c74sh-c7-chip">⛏️ ×{pulse.vipMult.toFixed(2)}</span>
                <span className="c74sh-c7-chip">🔥 {pulse.streak}d</span>
              </span>
            </div>
            <button className="c7p-btn-green c74sh-enter" onClick={() => { setFrameLoaded(false); setEntered(true); }}>ENTER GAME →</button>
            <span className="c74sh-hint">Provably fair · Mobile optimized</span>
          </div>
        )}

        {/* Game — mounted only after ENTER */}
        {probe === 'ready' && entered && (
          <>
            {!frameLoaded && <div className="c74sh-state c74sh-over"><Loader2 className="c74sh-spin" size={30} /><span>Entering game…</span></div>}
            <iframe
              ref={frameRef}
              className="c74sh-frame"
              src={muted ? `${src}#muted` : src}
              title={game?.name ?? 'C74 Original'}
              onLoad={() => setFrameLoaded(true)}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            {/* FR-1/2/4: Luxury temple frame — gold border + corner torches +
                ambient lighting/vignette. pointer-events:none → never blocks the
                game's own buttons. Purely decorative chrome around the viewport. */}
            {frameLoaded && (
              <div className="c74sh-fr" aria-hidden="true">
                <span className="c74sh-fr-vig" />
                <span className="c74sh-fr-border" />
                <span className="c74sh-fr-torch tl" /><span className="c74sh-fr-torch tr" />
                <span className="c74sh-fr-torch bl" /><span className="c74sh-fr-torch br" />
              </div>
            )}
            {/* FR-5: dormant, reusable Mega-Win celebration (fires on a future
                cosmetic `c74:megawin` event; not wired to game logic here). */}
            <C74MegaWin />

            {/* Phase 4: minimized in-game C7 chip. Hosted (same-origin) games only.
                Collapsed by default so it never obscures play; tap to peek Energy /
                Rank / Streak + rank progress. Sits in its own corner box (auto size)
                so it blocks nothing outside itself. Presentation only. */}
            {frameLoaded && pulse.ready && (
              <div className={`c74sh-c7hud${c7open ? ' is-open' : ''}`}>
                {c7open && (
                  <div className="c74sh-c7hud-panel" role="dialog" aria-label="C7 progress">
                    <div className="c74sh-c7hud-row"><span><C7Icon name="bolt" size={14} /></span><b>{Math.round(pulse.energy).toLocaleString('en-US')}</b><em>C74 energy</em></div>
                    <div className="c74sh-c7hud-row"><span><C7TierIcon tier={pulse.rank.name} size={14} /></span><b>{pulse.rank.name}</b></div>
                    <div className="c74sh-c7hud-row"><span><C7Icon name="fire" size={14} /></span><b>{pulse.streak}d</b><em>streak</em></div>
                    {!pulse.rankProgress.isMax ? (
                      <div className="c74sh-c7hud-prog">
                        <div className="c74sh-c7hud-track"><span style={{ width: `${pulse.rankProgress.pct}%` }} /></div>
                        <span className="c74sh-c7hud-to">{Math.round(pulse.rankProgress.toNext ?? 0).toLocaleString('en-US')} to <C7TierIcon tier={pulse.rankProgress.nextName} size={12} /> {pulse.rankProgress.nextName}</span>
                      </div>
                    ) : (
                      <div className="c74sh-c7hud-to"><C7TierIcon tier={pulse.rank.name} size={13} /> Max rank reached</div>
                    )}
                  </div>
                )}
                <button className="c74sh-c7hud-pill" onClick={() => setC7open((o) => !o)} aria-expanded={c7open} aria-label="C7 progress">
                  <span className="c74sh-c7hud-dot" aria-hidden="true" />{Math.round(pulse.energy).toLocaleString('en-US')}
                  <span className="c74sh-c7hud-rk" aria-hidden="true" style={{ filter: `drop-shadow(0 0 3px ${rt.glow})` }}><C7TierIcon tier={pulse.rank.name} size={14} /></span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.c74sh { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column; background: #04120b; }
.c74sh-bar { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: calc(8px + env(safe-area-inset-top,0px)) 12px 8px;
  background: radial-gradient(120% 150% at 50% -40%, rgba(46,230,130,0.25), transparent 60%), linear-gradient(180deg, #0d3f24, #04120b);
  border-bottom: 1px solid; border-image: linear-gradient(90deg,#8a6410,#7ef0b0 40%,#c8930f 70%,#8a6410) 1; }
.c74sh-back { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 999px; border: 1px solid rgba(53,217,138,0.4);
  background: rgba(53,217,138,0.12); color: #b9f6d0; font-size: 13px; font-weight: 900; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
.c74sh-name { flex: 1; min-width: 0; text-align: center; font-size: 14px; font-weight: 900; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.c74sh-tools { flex: 0 0 auto; display: inline-flex; gap: 6px; }
.c74sh-ic { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 999px; border: 1px solid rgba(53,217,138,0.4); background: rgba(53,217,138,0.12); color: #b9f6d0; cursor: pointer; }
.c74sh-stage { position: relative; flex: 1 1 auto; min-height: 0; background: radial-gradient(80% 60% at 50% 30%, #08271656, transparent 70%), #04120b; }
.c74sh-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; }
.c74sh-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 24px; color: #b9f6d0; }
.c74sh-over { background: #04120b; z-index: 2; }
.c74sh-emoji { font-size: 46px; }
.c74sh-t { font-size: 15px; font-weight: 900; color: #e8fff2; }
.c74sh-s { font-size: 11px; color: rgba(255,255,255,0.55); max-width: 320px; }
/* Empty-state card — frame/ground/glow from .c7p-card-gold */
.c74sh-card { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 26px 24px; max-width: 340px; margin: 0 16px; }
/* Back CTA — surface from .c7p-btn-gold; keep sizing/pill shape only */
.c74sh-cta { margin-top: 12px; padding: 11px 24px; border-radius: 999px; font-size: 13px; }
.c74sh-spin { color: #35d98a; animation: c74sh-rot 0.9s linear infinite; }
@keyframes c74sh-rot { to { transform: rotate(360deg); } }
/* ── Premium entry screen ── */
.c74sh-intro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; overflow: hidden; padding: 24px;
  background: radial-gradient(90% 70% at 50% 20%, rgba(46,230,130,0.16), transparent 60%), radial-gradient(80% 60% at 50% 110%, rgba(245,180,35,0.14), transparent 60%), linear-gradient(180deg,#0a2013,#04120b); }
.c74sh-glow { position: absolute; left: 50%; top: 34%; width: 340px; height: 340px; transform: translate(-50%,-50%); pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, rgba(245,180,35,0.35), rgba(46,230,130,0.14) 45%, transparent 70%); animation: c74sh-breathe 3.4s ease-in-out infinite; }
@keyframes c74sh-breathe { 0%,100% { opacity: 0.6; transform: translate(-50%,-50%) scale(0.92); } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.08); } }
.c74sh-dust { position: absolute; inset: 0; pointer-events: none; }
.c74sh-dust i { position: absolute; bottom: -10px; width: 5px; height: 5px; border-radius: 50%; background: radial-gradient(circle at 34% 28%, #fff7cf, #ffd24d 55%, #b8860b); box-shadow: 0 0 6px rgba(255,210,77,0.8); opacity: 0; animation: c74sh-rise linear infinite; }
@keyframes c74sh-rise { 0% { transform: translateY(0) scale(0.7); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateY(-90vh) scale(1.1); opacity: 0; } }
.c74sh-badge { position: relative; z-index: 2; font-size: 9px; font-weight: 900; letter-spacing: 1.4px; color: #3a2708; padding: 5px 12px; border-radius: 999px; background: radial-gradient(120% 100% at 50% 0%, #fff6d8, transparent 58%), linear-gradient(180deg,#ffe08a,#f5b423); box-shadow: 0 0 14px -2px rgba(245,180,35,0.6); }
.c74sh-logo { position: relative; z-index: 2; font: 900 34px/1.05 Inter, system-ui, sans-serif; text-align: center; letter-spacing: -0.5px;
  background: linear-gradient(180deg,#fff6d8 6%,#ffe08a 42%,#f5b423 74%,#c8930f); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(90,55,8,0.5)) drop-shadow(0 0 22px rgba(255,205,90,0.5)); }
.c74sh-jp { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 22px; border-radius: 16px;
  background: linear-gradient(180deg, rgba(20,60,40,0.7), rgba(4,18,11,0.8)); border: 1px solid rgba(245,180,35,0.5); box-shadow: inset 0 1px 0 rgba(255,236,180,0.25), 0 8px 20px -10px rgba(0,0,0,0.7); }
.c74sh-jp-k { font-size: 9px; font-weight: 900; letter-spacing: 1px; color: #b9f6d0; }
.c74sh-jp b { font: 900 24px/1 Inter, system-ui, sans-serif; color: #ffe9a8; font-variant-numeric: tabular-nums; text-shadow: 0 0 14px rgba(255,205,90,0.5); }
.c74sh-jp b i { font-style: normal; font-size: 12px; opacity: 0.7; margin-left: 3px; }
/* ENTER — surface/press/sheen from .c7p-btn-green; keep sizing/pill shape only */
.c74sh-enter { position: relative; z-index: 2; margin-top: 4px; padding: 13px 34px; border-radius: 999px; font-size: 15px; letter-spacing: 0.5px; }
.c74sh-hint { position: relative; z-index: 2; font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
/* C7 pre-game intro strip on the ENTER screen */
.c74sh-c7 { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 7px; margin: 2px 0 2px; }
.c74sh-c7-badge { font-size: 9.5px; font-weight: 900; letter-spacing: 1.6px; padding: 4px 12px; border-radius: 999px; color: #2a1c04;
  background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #ffe9a8, #f6c945 55%, #d68a1e);
  box-shadow: 0 3px 12px -4px rgba(246,201,69,0.6), inset 0 1px 0 rgba(255,255,255,0.6); }
.c74sh-c7-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.c74sh-c7-chip { font-size: 11px; font-weight: 800; color: #eafff4; padding: 5px 10px; border-radius: 999px;
  background: linear-gradient(160deg, rgba(15,92,60,0.72), rgba(5,32,20,0.82)); border: 1px solid rgba(120,240,176,0.34); font-variant-numeric: tabular-nums; }
/* ── FR-3: Jackpot Totem Strip (in-game header, outside play area) ── */
.c74sh-totem { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 5px 12px; overflow: hidden;
  background: radial-gradient(120% 180% at 50% -60%, rgba(245,180,35,0.22), transparent 60%), linear-gradient(180deg, #14110a, #0a0d08);
  border-bottom: 1px solid; border-image: linear-gradient(90deg, transparent, #c8930f 30%, #ffe89a 50%, #c8930f 70%, transparent) 1; }
.c74sh-totem-k { font-size: 9px; font-weight: 900; letter-spacing: 1.2px; color: #b9f6d0; white-space: nowrap; }
.c74sh-totem-v { font: 900 15px/1 Inter, system-ui, sans-serif; color: #ffe9a8; font-variant-numeric: tabular-nums; white-space: nowrap; text-shadow: 0 0 12px rgba(255,205,90,0.5); }
.c74sh-totem-v i { font-style: normal; font-size: 9px; opacity: 0.7; margin-left: 2px; }
.c74sh-totem-torch { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: radial-gradient(circle at 40% 30%, #fff7cf, #ffd24d 55%, #b8860b);
  box-shadow: 0 0 10px 2px rgba(255,190,60,0.7); animation: c74sh-flicker 1.6s ease-in-out infinite; }
@keyframes c74sh-flicker { 0%,100% { opacity: 0.85; transform: scale(1); } 45% { opacity: 1; transform: scale(1.18); } 70% { opacity: 0.7; transform: scale(0.95); } }
/* ── FR-1/2/4: Luxury temple frame overlay (over the game viewport) ── */
.c74sh-fr { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.c74sh-fr-vig { position: absolute; inset: 0; box-shadow: inset 0 0 70px 18px rgba(2,10,6,0.6); }
.c74sh-fr-border { position: absolute; inset: 5px; border-radius: 14px; border: 1.5px solid transparent;
  border-image: linear-gradient(150deg, #8a6410, #ffe89a 26%, #c8930f 52%, #fff6d8 74%, #8a6410) 1;
  box-shadow: inset 0 0 0 1px rgba(245,180,35,0.18), inset 0 0 22px rgba(245,180,35,0.12); }
.c74sh-fr-torch { position: absolute; width: 90px; height: 90px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255,190,60,0.32), rgba(46,230,130,0.1) 45%, transparent 70%); animation: c74sh-torchglow 3.2s ease-in-out infinite; }
.c74sh-fr-torch.tl { top: -26px; left: -26px; } .c74sh-fr-torch.tr { top: -26px; right: -26px; animation-delay: -0.8s; }
.c74sh-fr-torch.bl { bottom: -26px; left: -26px; animation-delay: -1.6s; } .c74sh-fr-torch.br { bottom: -26px; right: -26px; animation-delay: -2.4s; }
@keyframes c74sh-torchglow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
/* ── Phase 4: minimized in-game C7 chip (hosted games only) ── */
.c74sh-c7hud { position: absolute; top: 8px; left: 8px; z-index: 4; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  font-family: Inter, system-ui, sans-serif; }
.c74sh-c7hud-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px 5px 8px; border-radius: 999px; cursor: pointer; font-family: inherit;
  font-weight: 900; font-size: 12px; color: #eafff4; -webkit-tap-highlight-color: transparent;
  background: linear-gradient(160deg, rgba(15,92,60,0.72), rgba(4,20,12,0.82)); border: 1px solid rgba(246,201,69,0.42); backdrop-filter: blur(6px);
  box-shadow: 0 6px 16px -8px rgba(0,0,0,0.8), 0 0 12px -5px rgba(246,201,69,0.4); }
.c74sh-c7hud-pill:active { transform: scale(0.95); }
.c74sh-c7hud-dot { width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #b6ffdd, #2ee08a 60%, #0b7a3f);
  box-shadow: 0 0 7px rgba(46,224,138,0.85); animation: c74sh-c7dot 2.2s ease-in-out infinite; }
@keyframes c74sh-c7dot { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
.c74sh-c7hud-rk { font-size: 13px; line-height: 1; }
.c74sh-c7hud-panel { display: flex; flex-direction: column; gap: 5px; padding: 9px 11px; border-radius: 13px; min-width: 150px;
  background: linear-gradient(160deg, rgba(11,74,51,0.94), rgba(4,20,12,0.96)); border: 1px solid rgba(246,201,69,0.4); backdrop-filter: blur(10px);
  box-shadow: 0 14px 32px -14px rgba(0,0,0,0.85), 0 0 18px -8px rgba(246,201,69,0.4); animation: c74sh-c7pop .15s ease both; }
@keyframes c74sh-c7pop { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: none; } }
.c74sh-c7hud-row { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: #eafff4; white-space: nowrap; }
.c74sh-c7hud-row b { font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; }
.c74sh-c7hud-row em { font-style: normal; font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: rgba(196,240,214,0.68); }
.c74sh-c7hud-prog { display: flex; flex-direction: column; gap: 4px; margin-top: 1px; }
.c74sh-c7hud-track { position: relative; height: 6px; border-radius: 999px; overflow: hidden; background: rgba(3,16,10,0.7); box-shadow: inset 0 0 0 1px rgba(120,240,176,0.18); }
.c74sh-c7hud-track span { position: absolute; inset: 0 auto 0 0; border-radius: 999px; background: linear-gradient(90deg, #39FF88, #9CFFCB 40%, #ffe9a8 78%, #f6c945); box-shadow: 0 0 7px -1px rgba(246,201,69,0.6); }
.c74sh-c7hud-to { font-size: 9px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; color: rgba(196,240,214,0.75); }
@media (prefers-reduced-motion: reduce) { .c74sh-glow, .c74sh-dust i, .c74sh-enter, .c74sh-spin, .c74sh-totem-torch, .c74sh-fr-torch, .c74sh-c7hud-dot, .c74sh-c7hud-panel { animation: none !important; } .c74sh-dust { display: none; } }
`;
