/**
 * C74Wheel — the C74-powered Lucky Wheel (spend C74 → win C74).
 *
 * The first real C74 SPEND surface beyond withdrawal-fee cover. Spins call the
 * server-authoritative `c74_wheel_spin()` RPC: it debits the spin cost, picks a
 * weighted prize, credits it, and returns the winning segment INDEX so this UI
 * animates to the exact wedge. Entirely inside the C74 reward layer — no money
 * path. Segment amounts are index-aligned with the backend prize table.
 *
 * ── DROP-IN IMAGE SLOTS ──────────────────────────────────────────────────────
 * Set any URL in ASSETS to replace the vector art with a custom image (e.g. a
 * 3D/HDR render). Each slot falls back to the built-in CSS/SVG art when empty,
 * so the wheel is fully live today and upgrades the moment art is supplied.
 *   wheelFace : square PNG of the whole wheel face (segments baked in) — spins
 *   hub       : center button image (square)
 *   pointer   : top pointer image
 *   backdrop  : behind-the-wheel glow/scene image
 *   mascot    : emoji OR image URL shown above the wheel
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { num as fmt } from "@/lib/format";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useC74 } from '@/hooks/useC74';
import { useAppAssets } from '@/hooks/useAppAssets';

// Slot images come from the DB asset library (admin → AI Studio → Save to
// library, bound to these keys). Empty → built-in vector art.
//   wheel.face · wheel.hub · wheel.pointer · wheel.backdrop · wheel.mascot

// Prize amounts — MUST stay index-aligned with c74_wheel_spin() in
// supabase/migrations/20260723150000_c74_lucky_wheel.sql
const PRIZES = [50, 100, 150, 200, 300, 500, 1000, 3000];
// Alternating C74 gold / royal purple wedges
// gold ↔ emerald alternating (on-theme); index 7 (jackpot) a bright emerald pop
const COLORS = ['#f5b423', '#0e9d63', '#ffcf4d', '#0b7d4e', '#f5b423', '#0e9d63', '#ffcf4d', '#14b877'];
const SEG = 360 / PRIZES.length;


export default function C74Wheel({ onWin }: { onWin?: (amount: number, jackpot: boolean) => void } = {}) {
  const { summary, reload } = useC74();
  const dbAssets = useAppAssets();
  const ASSETS = {
    wheelFace: dbAssets['wheel.face'] || '/v2/spin-wheel.png',
    hub: dbAssets['wheel.hub'] || '',
    pointer: dbAssets['wheel.pointer'] || '',
    backdrop: dbAssets['wheel.backdrop'] || '',
    mascot: dbAssets['wheel.mascot'] || '🎰',
  };
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<{ amount: number; jackpot: boolean } | null>(null);
  const turns = useRef(0);

  const balance = summary?.balance ?? 0;
  const cost = summary?.config?.wheel_cost ?? 300;
  const canSpin = !spinning && balance >= cost;

  const spin = useCallback(async () => {
    if (spinning) return;
    if (balance < cost) { toast.error(`Need ${fmt(cost)} C74 to spin — earn more by playing & depositing`); return; }
    setSpinning(true);
    setWin(null);
    try {
      const { data, error } = await (supabase.rpc as any)('c74_wheel_spin');
      if (error) throw error;
      const idx = Number(data.prize_index ?? 0);
      const amount = Number(data.prize_amount ?? 0);
      // land the winning wedge under the top pointer
      turns.current += 8;
      const finalAngle = 360 * turns.current + (360 - idx * SEG - SEG / 2);
      setRotation(finalAngle);
      const isJackpot = idx === PRIZES.length - 1;
      window.setTimeout(() => {
        setWin({ amount, jackpot: isJackpot });
        setSpinning(false);
        reload();
        window.dispatchEvent(new Event('dtx:balance-updated'));
        toast.success(`🎉 You won ${fmt(amount)} C74!`);
        onWin?.(amount, isJackpot);
      }, 2900);
    } catch (e: any) {
      setSpinning(false);
      const msg = String(e?.message ?? '');
      if (msg.includes('E_INSUFFICIENT_C74')) toast.error('Not enough C74 to spin');
      else if (msg.includes('auth')) toast.error('Please log in to spin');
      else toast.error(msg || 'Spin failed');
    }
  }, [spinning, balance, cost, reload, onWin]);

  return (
    <div className="c74w" role="group" aria-label="C74 Lucky Wheel">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="c74w-head">
        <span className="c74w-badge">🎡 C74 POWER WHEEL</span>
        <div className="c74w-sub">Spend <b>{fmt(cost)} C74</b> · win up to <b>3,000 C74</b></div>
      </div>

      <div className={`c74w-stage${spinning ? ' is-spin' : ''}`}>
        {ASSETS.backdrop
          ? <img className="c74w-backdrop-img" src={ASSETS.backdrop} alt="" aria-hidden="true" />
          : <><div className="c74w-aura" aria-hidden="true" /><div className="c74w-aura2" aria-hidden="true" /></>}

        <span className={`c74w-mascot${spinning ? ' is-hype' : ''}`} aria-hidden="true">
          {/^https?:|^data:/.test(ASSETS.mascot) ? <img src={ASSETS.mascot} alt="" /> : ASSETS.mascot}
        </span>

        {/* pointer */}
        {ASSETS.pointer
          ? <img className="c74w-pointer-img" src={ASSETS.pointer} alt="" aria-hidden="true" />
          : <div className="c74w-pointer" aria-hidden="true" />}

        <div className="c74w-rim" />

        {/* blinking bulbs */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return <span key={i} className="c74w-dot" style={{ left: `${50 + 46.5 * Math.cos(a)}%`, top: `${50 + 46.5 * Math.sin(a)}%`, animationDelay: `${(i % 4) * 0.25}s` }} />;
        })}

        {/* wheel face — image if supplied, else conic-gradient + labels */}
        <div className="c74w-wheel" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 2.8s cubic-bezier(0.16,0.72,0.19,0.995)' : 'none' }}>
          {ASSETS.wheelFace ? (
            <img className="c74w-face-img" src={ASSETS.wheelFace} alt="C74 wheel" />
          ) : (
            <>
              <div className="c74w-face" style={{ background: `conic-gradient(${PRIZES.map((_, i) => `${COLORS[i]} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(', ')})` }} />
              <div className="c74w-spokes" />
              {PRIZES.map((p, i) => {
                const mid = i * SEG + SEG / 2;
                const rad = ((mid - 90) * Math.PI) / 180;
                const x = 50 + 33 * Math.cos(rad);
                const y = 50 + 33 * Math.sin(rad);
                return (
                  <div key={i} className={`c74w-lbl${i === PRIZES.length - 1 ? ' c74w-lbl-jack' : ''}`}
                       style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${mid}deg)` }}>
                    {i === PRIZES.length - 1 ? '★' : ''}{fmt(p)}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* winning-wedge glow — the landed prize always rests under the top
            pointer, so a fixed top-wedge (±22.5°) glow lights it after settling */}
        {win && !spinning && (
          <svg className={`c74w-winglow${win.jackpot ? ' is-jack' : ''}`} viewBox="0 0 600 600" aria-hidden="true">
            <defs>
              <radialGradient id="c74w-wgw" cx="50%" cy="10%" r="66%">
                <stop offset="0" stopColor="rgba(255,251,232,1)" />
                <stop offset="0.45" stopColor="rgba(255,222,130,0.72)" />
                <stop offset="1" stopColor="rgba(255,200,80,0)" />
              </radialGradient>
            </defs>
            <path d="M300,300 L185.2,22.8 A300,300 0 0 1 414.8,22.8 Z" fill="url(#c74w-wgw)" />
            <path d="M300,300 L185.2,22.8 A300,300 0 0 1 414.8,22.8 Z" fill="none" stroke="rgba(255,248,220,0.9)" strokeWidth="7" strokeLinejoin="round" />
          </svg>
        )}

        {/* hub / spin button */}
        <button className="c74w-hub" onClick={spin} disabled={!canSpin} aria-label="Spin the C74 wheel">
          {ASSETS.hub ? <img src={ASSETS.hub} alt="" /> : (spinning ? '···' : 'SPIN')}
        </button>
      </div>

      <div className="c74w-foot">
        <span className="c74w-bal">🪙 {fmt(balance)} C74</span>
        <button className="c74w-cta" onClick={spin} disabled={!canSpin}>
          {spinning ? 'Spinning…' : balance < cost ? `Need ${fmt(cost)} C74` : `Spin · ${fmt(cost)} C74`}
        </button>
      </div>

      {win && (
        <div className={`c74w-win${win.jackpot ? ' is-jack' : ''}`} role="status">
          <span className="c74w-win-k">{win.jackpot ? '🏆 JACKPOT!' : '🎉 You won'}</span>
          <span className="c74w-win-v">+{fmt(win.amount)} C74</span>
        </div>
      )}
    </div>
  );
}

const CSS = `
.c74w { position: relative; max-width: 420px; margin: 0 auto; padding: 16px; text-align: center; }
.c74w-head { margin-bottom: 14px; }
.c74w-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 900; letter-spacing: 1.4px; padding: 5px 13px; border-radius: 999px; color: #2a1a02;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 3px 10px -3px rgba(255,190,60,0.6), inset 0 1px 0 rgba(255,255,255,0.6); }
.c74w-sub { margin-top: 9px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.82); }
.c74w-sub b { color: #ffe9a8; }
.c74w-stage { position: relative; width: min(340px, 86vw); height: min(340px, 86vw); aspect-ratio: 1; margin: 0 auto; filter: drop-shadow(0 22px 34px rgba(0,0,0,0.55)); }
.c74w-backdrop-img { position: absolute; inset: -18px; width: calc(100% + 36px); height: calc(100% + 36px); object-fit: contain; z-index: 0; pointer-events: none; }
.c74w-aura { position: absolute; inset: -18px; border-radius: 50%; z-index: 0; pointer-events: none;
  background: conic-gradient(from 0deg, #f5b423, #12b374, #ffcf4d, #0e9d63, #f5b423); filter: blur(13px); opacity: 0.5; will-change: opacity; animation: c74w-pulse 3.2s ease-in-out infinite; }
.c74w-aura2 { position: absolute; inset: -6px; border-radius: 50%; z-index: 0; pointer-events: none;
  background: conic-gradient(from 200deg, transparent, #ffd24d 12%, transparent 28%, #12b374 54%, transparent 72%, #ffcf4d 90%, transparent); filter: blur(3px); opacity: 0.8; will-change: transform; animation: c74w-spin 6s linear infinite reverse; }
@keyframes c74w-spin { to { transform: rotate(360deg); } }
@keyframes c74w-pulse { 0%,100% { opacity: 0.38; } 50% { opacity: 0.62; } }
.c74w-stage.is-spin .c74w-aura { opacity: 0.9; filter: blur(16px) saturate(1.3); }
.c74w-stage.is-spin .c74w-aura2 { animation-duration: 1s; opacity: 1; }
.c74w-mascot { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); z-index: 8; font-size: 40px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.55)); animation: c74w-bob 3s ease-in-out infinite; pointer-events: none; }
.c74w-mascot img { width: 52px; height: 52px; object-fit: contain; }
@keyframes c74w-bob { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-7px); } }
.c74w-mascot.is-hype { animation: c74w-hype .5s ease-in-out infinite; }
@keyframes c74w-hype { 0%,100% { transform: translateX(-50%) translateY(0) scale(1); } 50% { transform: translateX(-50%) translateY(-9px) scale(1.16); } }
.c74w-rim { position: absolute; inset: 0; border-radius: 50%; z-index: 1;
  background: conic-gradient(from 0deg, #7a5106, #ffe9a8, #b8860b, #fff6d8, #8a5e0a, #ffd24d, #7a5106, #ffe9a8, #b8860b, #fff6d8, #8a5e0a, #ffd24d, #7a5106);
  box-shadow: 0 0 55px -2px rgba(245,180,35,0.7), 0 0 0 2px rgba(90,60,10,0.6), inset 0 0 22px rgba(0,0,0,0.55), inset 0 3px 4px rgba(255,255,255,0.45); }
.c74w-dot { position: absolute; width: 8px; height: 8px; border-radius: 50%; transform: translate(-50%,-50%); z-index: 5;
  background: radial-gradient(circle at 34% 30%, #fff, #ffd24d 55%, #b8860b); box-shadow: 0 0 8px 2px rgba(255,200,80,0.95); animation: c74w-blink 1s ease-in-out infinite; }
@keyframes c74w-blink { 0%,100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 50% { opacity: .28; transform: translate(-50%,-50%) scale(0.72); } }
.c74w-wheel { position: absolute; inset: 18px; border-radius: 50%; overflow: hidden; z-index: 2; border: 2px solid rgba(255,236,180,0.7); box-shadow: inset 0 0 34px rgba(0,0,0,0.62), inset 0 6px 0 rgba(255,255,255,0.16); }
.c74w-face, .c74w-face-img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.c74w-spokes { position: absolute; inset: 0; border-radius: 50%; z-index: 3; pointer-events: none;
  background: repeating-conic-gradient(from -0.9deg, rgba(255,246,216,0.95) 0deg 1.6deg, rgba(255,246,216,0) 1.6deg 45deg), radial-gradient(circle at 50% 40%, rgba(255,255,255,0.22), rgba(255,255,255,0) 46%), radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%); }
.c74w-lbl { position: absolute; z-index: 4; font-weight: 900; font-size: 15px; color: #fff; font-variant-numeric: tabular-nums; text-shadow: 0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4); white-space: nowrap; }
.c74w-lbl-jack { font-size: 16px; color: #fff6d8; text-shadow: 0 0 10px rgba(255,214,120,0.9), 0 1px 3px rgba(0,0,0,0.8); }
.c74w-winglow { position: absolute; inset: 18px; z-index: 5; pointer-events: none; mix-blend-mode: screen;
  filter: drop-shadow(0 0 20px rgba(255,222,130,0.95)) drop-shadow(0 0 40px rgba(255,200,80,0.55)); transform-origin: 50% 50%;
  animation: c74w-winglow-in .45s cubic-bezier(.22,1,.36,1) both, c74w-winpulse 1.15s ease-in-out .45s infinite; }
.c74w-winglow.is-jack { filter: drop-shadow(0 0 22px rgba(120,255,190,0.95)) drop-shadow(0 0 44px rgba(47,226,154,0.6)); }
@keyframes c74w-winglow-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes c74w-winpulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .c74w-winglow { animation: none; opacity: 0.85; } }
.c74w-pointer { position: absolute; left: 50%; top: -4px; transform: translateX(-50%); z-index: 6; width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 28px solid #ffd24d; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.7)); }
.c74w-pointer-img { position: absolute; left: 50%; top: -14px; transform: translateX(-50%); z-index: 6; width: 42px; height: 46px; object-fit: contain; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.6)); }
.c74w-hub { position: absolute; inset: 0; margin: auto; width: 78px; height: 78px; border-radius: 50%; display: grid; place-items: center; z-index: 7; cursor: pointer; overflow: hidden;
  font-weight: 900; font-size: 15px; letter-spacing: 1px; color: #2a1a02; border: 4px solid #fff6d8;
  background: radial-gradient(120% 100% at 50% 14%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #ffd24d, #d99a1f 58%, #b8860b);
  box-shadow: 0 6px 0 #8a5e0a, inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -9px 15px rgba(0,0,0,0.3), 0 0 30px -2px rgba(255,200,80,0.9), 0 0 0 2px rgba(90,60,10,0.6); }
.c74w-hub img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.c74w-hub:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 3px 0 #8a5e0a, inset 0 2px 0 rgba(255,255,255,0.8); }
.c74w-hub:disabled { opacity: 0.65; cursor: not-allowed; }
.c74w-foot { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 18px; }
.c74w-bal { font-size: 14px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums; }
.c74w-cta { border: none; border-radius: 14px; padding: 13px 22px; font-family: inherit; font-size: 15px; font-weight: 900; letter-spacing: 0.3px; cursor: pointer; color: #2a1a02;
  background: radial-gradient(120% 90% at 50% -18%, rgba(255,255,255,0.6), transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b);
  box-shadow: 0 6px 0 #8a5e0a, inset 0 2px 0 rgba(255,255,255,0.6), 0 12px 24px -6px rgba(255,190,60,0.6); }
.c74w-cta:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 3px 0 #8a5e0a, inset 0 2px 0 rgba(255,255,255,0.6); }
.c74w-cta:disabled { opacity: 0.55; cursor: not-allowed; }
.c74w-win { margin: 16px auto 0; max-width: 260px; padding: 13px 18px; border-radius: 16px; display: flex; flex-direction: column; gap: 3px;
  background: radial-gradient(120% 90% at 50% 0%, rgba(255,214,120,0.22), transparent 60%), linear-gradient(160deg, #2a1e06, #14110a); border: 1.5px solid rgba(245,180,35,0.6);
  box-shadow: 0 14px 30px -12px rgba(0,0,0,0.7), 0 0 24px -8px rgba(245,180,35,0.6); animation: c74w-pop .4s cubic-bezier(.2,.9,.3,1.2); }
@keyframes c74w-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.c74w-win.is-jack { border-color: #ffd24d; box-shadow: 0 14px 30px -12px rgba(0,0,0,0.7), 0 0 40px -6px rgba(255,210,80,0.9); }
.c74w-win-k { font-size: 11px; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; color: #ffcf4d; }
.c74w-win-v { font-size: 30px; font-weight: 900; color: #fff6d8; font-variant-numeric: tabular-nums; text-shadow: 0 0 18px rgba(255,210,80,0.6); }
@media (prefers-reduced-motion: reduce) { .c74w-aura, .c74w-aura2, .c74w-dot, .c74w-mascot { animation: none !important; } }
`;
