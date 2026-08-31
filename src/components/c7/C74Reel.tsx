/**
 * C74Reel — the C74-powered premium vertical REEL machine (spend C74 → win C74).
 *
 * Same server-authoritative mechanic as C74Wheel: a spin calls the
 * `c74_wheel_spin()` RPC, which debits the spin cost, picks a weighted prize,
 * credits it, and returns the winning prize INDEX. This UI simply animates three
 * vertical reels so they land 3-of-a-kind on the winning prize tile. Entirely
 * inside the C74 reward layer — NO money path, NO fabricated values; balance,
 * cost and result all come from the real hooks/RPC.
 *
 * ONLY the symbol content spins. The ornate gold frame, emerald chamber, gems,
 * payline and every decorative element stay perfectly static — the thing that
 * travels vertically through the reel window is just the symbol: a glossy
 * metallic-gold glyph + prize number + C74/JACKPOT tag (never a full decorated
 * PNG tile). Premium physical-reel motion: fast → motion-blur → decelerate →
 * staggered mechanical stop → sharp lock with a glossy glint on the center
 * payline. GPU-only (transform/opacity + filter). Honors prefers-reduced-motion.
 */
import { useCallback, useRef, useState } from 'react';
import { num as fmt } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useC74 } from '@/hooks/useC74';
import C7Icon, { C7IconName } from '@/components/c7/C7Icon';

// Symbols — index-aligned with c74_wheel_spin() PRIZES [50,100,150,200,300,500,1000,3000].
const SYMBOLS = [
  { kind: 'coin',    num: '50',    tag: 'C74' },
  { kind: 'coin',    num: '100',   tag: 'C74' },
  { kind: 'coin',    num: '150',   tag: 'C74' },
  { kind: 'coin',    num: '200',   tag: 'C74' },
  { kind: 'coins',   num: '300',   tag: 'C74' },
  { kind: 'diamond', num: '500',   tag: 'C74' },
  { kind: 'crown',   num: '1,000', tag: 'C74' },
  { kind: 'jackpot', num: '3,000', tag: 'JACKPOT' },
] as const;
const N = SYMBOLS.length;      // 8
const TILE = 86;               // px per reel tile
const REELS = 3;
const CYCLES = 22;             // strip length in cycles (22*8 = 176 tiles; rebase keeps us inside)
const BASE = 8;                // reset headroom (cycles) kept above the landing row
const STRIP = Array.from({ length: CYCLES * N }, (_, i) => i % N);
const REDUCED = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Glyph per prize — a premium inline-SVG gold/emerald symbol, index-aligned with SYMBOLS.
const GLYPH: Record<string, C7IconName> = { coin: 'coin', coins: 'coins', diamond: 'gem', crown: 'crown', jackpot: 'trophy' };
// Gemstone capsule colour per prize tier (presentation only, index-aligned with SYMBOLS).
const CAP = ['grn', 'grn', 'grn', 'grn', 'pur', 'blu', 'red', 'jack'] as const;

// Optional premium raster art per symbol kind — drop transparent PNGs here to light
// up the full 3D look. When a file is present it becomes the spinning symbol; when
// absent we fall back to the inline vector glyph. Amounts stay DOM text (see Tile)
// so the real server result — never the art — drives the numbers.
const ART: Record<string, string> = {
  coin: '/images/v3/reels/sym-c74.png',
  coins: '/images/v3/reels/sym-coins.png',
  diamond: '/images/v3/reels/sym-gem.png',
  crown: '/images/v3/reels/sym-crown.png',
  jackpot: '/images/v3/reels/sym-jackpot.png',
};

// Symbol glyph — premium raster art when available, else the inline vector glyph.
function Sym({ kind, size }: { kind: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const src = ART[kind];
  if (src && !broken) {
    return <img className="rl-sym-img" src={src} alt="" aria-hidden="true" style={{ height: size + 18 }} onError={() => setBroken(true)} />;
  }
  return <C7Icon name={GLYPH[kind]} size={size} />;
}

// One reel symbol = glyph + glossy metallic-gold number + C74/JACKPOT tag. This
// symbol is the ONLY thing that travels through the reel window; the surrounding
// gold frame, emerald chamber, gems and payline never move.
function Tile({ i }: { i: number }) {
  const s = SYMBOLS[i];
  const jack = s.kind === 'jackpot';
  return (
    <div className={`rl-tile${jack ? ' rl-tile--jack' : ''}`}>
      <span className="rl-sym-ic" aria-hidden="true"><Sym kind={s.kind} size={jack ? 30 : 27} /></span>
      <span className={`rl-cap rl-cap--${CAP[i]}`}><span className="rl-num">{s.num}</span></span>
      <span className="rl-tag">{s.tag}</span>
    </div>
  );
}

export default function C74Reel({ onWin }: { onWin?: (amount: number, jackpot: boolean) => void } = {}) {
  const { summary, reload } = useC74();
  const balance = summary?.balance ?? 0;
  const cost = summary?.config?.wheel_cost ?? 300;

  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<{ amount: number; jackpot: boolean; idx: number } | null>(null);
  // per-reel visual state
  const [ys, setYs] = useState<number[]>(() => [4, 6, 2].map((c) => -((BASE * N + c) - 1) * TILE));
  const [durs, setDurs] = useState<number[]>([0, 0, 0]);
  const [blur, setBlur] = useState<boolean[]>([false, false, false]);
  const [snap, setSnap] = useState<boolean[]>([false, false, false]);
  const [noTrans, setNoTrans] = useState<boolean[]>([false, false, false]);
  const idxRef = useRef<number[]>([BASE * N + 4, BASE * N + 6, BASE * N + 2]);

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
      const isJackpot = idx === N - 1;
      const reduced = REDUCED();

      const durList = reduced ? [0, 0, 0] : [2100, 2500, 2950];
      const nextY: number[] = [];
      for (let r = 0; r < REELS; r++) {
        const spins = reduced ? 0 : 7 + r; // later reels travel further → cascade
        let target = idxRef.current[r] + spins * N;
        target += (((idx - (target % N)) % N) + N) % N; // land exactly on idx
        idxRef.current[r] = target;
        nextY.push(-((target - 1) * TILE));
      }
      // launch: enable transitions, set durations + blur, translate to targets
      setNoTrans([false, false, false]);
      setDurs(durList);
      setBlur(reduced ? [false, false, false] : [true, true, true]);
      // rAF so the browser paints the transition rather than snapping
      requestAnimationFrame(() => setYs(nextY));

      if (!reduced) {
        // sharpen each reel just before it stops + mechanical snap on stop
        durList.forEach((d, r) => {
          window.setTimeout(() => setBlur((b) => { const n = [...b]; n[r] = false; return n; }), Math.max(0, d - 240));
          window.setTimeout(() => {
            setSnap((s) => { const n = [...s]; n[r] = true; return n; });
            window.setTimeout(() => setSnap((s) => { const n = [...s]; n[r] = false; return n; }), 260);
          }, d);
        });
      }

      const settle = reduced ? 30 : durList[REELS - 1] + 70;
      window.setTimeout(() => {
        setWin({ amount, jackpot: isJackpot, idx });
        setSpinning(false);
        reload();
        window.dispatchEvent(new Event('dtx:balance-updated'));
        toast.success(`🎉 You won ${fmt(amount)} C74!`);
        onWin?.(amount, isJackpot);
        // normalise position (keep idx centred, reset headroom) so long sessions never run out of strip
        const rebaseY: number[] = [];
        for (let r = 0; r < REELS; r++) { const nb = BASE * N + idx; idxRef.current[r] = nb; rebaseY.push(-((nb - 1) * TILE)); }
        setNoTrans([true, true, true]);
        setYs(rebaseY);
        requestAnimationFrame(() => requestAnimationFrame(() => setNoTrans([false, false, false])));
      }, settle);
    } catch (e: any) {
      setSpinning(false);
      const msg = String(e?.message ?? '');
      if (msg.includes('E_INSUFFICIENT_C74')) toast.error('Not enough C74 to spin');
      else if (msg.includes('auth')) toast.error('Please log in to spin');
      else toast.error(msg || 'Spin failed');
    }
  }, [spinning, balance, cost, reload, onWin]);

  return (
    <div className="rl" role="group" aria-label="C74 reel machine">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Ornate gold cabinet that houses the reel window (all static) ── */}
      <div className={`rl-cabinet${spinning ? ' is-spin' : ''}${win?.jackpot ? ' is-jack' : ''}`}>
        {/* rounded corner ornaments */}
        <span className="rl-corner rl-corner--tl" aria-hidden="true" />
        <span className="rl-corner rl-corner--tr" aria-hidden="true" />
        <span className="rl-corner rl-corner--bl" aria-hidden="true" />
        <span className="rl-corner rl-corner--br" aria-hidden="true" />
        {/* gem accents down the polished gold side rails */}
        <div className="rl-rail rl-rail--l" aria-hidden="true"><i /><i /><i /></div>
        <div className="rl-rail rl-rail--r" aria-hidden="true"><i /><i /><i /></div>

        <div className="rl-banner">
          <span className="rl-banner-ttl">PREMIUM REELS</span>
          <span className="rl-banner-sub">WIN UP TO 3,000 C74</span>
        </div>

        <div className="rl-head">
          <span className="rl-badge"><C7Icon name="coin" size={13} /> C74 POWER REELS</span>
          <div className="rl-sub">Spend <b>{fmt(cost)} C74</b> · win up to <b>3,000 C74</b></div>
        </div>

        {/* Reel chamber — thick gold frame, deep emerald inner, 3 vertical reels */}
        <div className={`rl-chamber${spinning ? ' is-spin' : ''}${win?.jackpot ? ' is-jack' : ''}`}>
          <div className="rl-glass" aria-hidden="true" />
          <div className="rl-reels">
            {Array.from({ length: REELS }).map((_, r) => (
              <div className="rl-reel" key={r}>
                <div
                  className={`rl-strip${blur[r] ? ' is-blur' : ''}${snap[r] ? ' is-snap' : ''}`}
                  style={{ transform: `translateY(${ys[r]}px)`, transition: noTrans[r] ? 'none' : `transform ${durs[r]}ms cubic-bezier(0.16,0.72,0.19,0.995)` }}
                >
                  {STRIP.map((si, k) => <Tile key={k} i={si} />)}
                </div>
              </div>
            ))}
            {/* static gold gridlines + tiny diamond nodes between the cells */}
            <div className="rl-grid" aria-hidden="true"><i /><i /></div>
          </div>
          {/* top / bottom reel masks + center payline window */}
          <div className="rl-mask rl-mask--t" aria-hidden="true" />
          <div className="rl-mask rl-mask--b" aria-hidden="true" />
          <div className={`rl-payline${win && !spinning ? ' is-hit' : ''}`} aria-hidden="true" />
          {/* one-shot glossy glint that sweeps the locked center symbol on stop */}
          <div className={`rl-lockfx${win && !spinning ? ' is-lock' : ''}`} aria-hidden="true" />
          <div className="rl-particles" aria-hidden="true" />
        </div>

        <div className="rl-foot">
          <span className="rl-bal"><C7Icon name="coin" size={14} /> {fmt(balance)} C74</span>
          <button className={`rl-spin${spinning ? ' is-spin' : ''}`} onClick={spin} disabled={!canSpin} aria-label="Spin the C74 reels">
            <span className="rl-spin-tx">{spinning ? 'SPINNING…' : balance < cost ? `NEED ${fmt(cost)}` : 'SPIN'}</span>
          </button>
        </div>

        {win && (
          <div className={`rl-win${win.jackpot ? ' is-jack' : ''}`} role="status">
            <span className="rl-win-k">{win.jackpot ? <><C7Icon name="trophy" size={16} /> JACKPOT!</> : '🎉 You won'}</span>
            <span className="rl-win-v">+{fmt(win.amount)} C74</span>
          </div>
        )}

        {/* decorative red-ball lever on the right side (non-functional) */}
        <div className="rl-lever" aria-hidden="true">
          <span className="rl-lever-arm" />
          <span className="rl-lever-ball" />
        </div>
      </div>
    </div>
  );
}

const CSS = `
.rl { position: relative; max-width: 460px; margin: 0 auto; padding: 14px 30px 8px; text-align: center; }

/* ── Ornate gold machine cabinet ─────────────────────────────────────────── */
.rl-cabinet { position: relative; margin: 0 auto; width: min(372px, 92vw); padding: 20px 22px 20px; border-radius: 34px;
  background:
    radial-gradient(130% 60% at 50% 0%, rgba(255,246,213,0.9), transparent 42%),
    linear-gradient(160deg, #fff6d5 0%, #f0c94a 20%, #c68a2e 48%, #7a4e0d 70%, #c68a2e 86%, #f0c94a 100%);
  box-shadow:
    0 34px 78px -26px rgba(0,0,0,0.92), 0 0 48px -16px rgba(240,201,74,0.45),
    inset 0 3px 0 rgba(255,246,213,0.85), inset 0 -5px 10px rgba(90,60,10,0.6),
    inset 0 0 0 2px rgba(122,78,14,0.4); }
.rl-cabinet.is-spin { box-shadow: 0 34px 78px -26px rgba(0,0,0,0.92), 0 0 64px -10px rgba(240,201,74,0.7), inset 0 3px 0 rgba(255,246,213,0.85), inset 0 -5px 10px rgba(90,60,10,0.6), inset 0 0 0 2px rgba(122,78,14,0.4); }
.rl-cabinet.is-jack { box-shadow: 0 34px 78px -26px rgba(0,0,0,0.92), 0 0 80px -8px rgba(46,224,138,0.6), 0 0 64px -10px rgba(255,214,120,0.7), inset 0 3px 0 rgba(255,246,213,0.85), inset 0 0 0 2px rgba(122,78,14,0.4); }
/* deep-emerald cabinet face behind the header / chamber / controls */
.rl-cabinet::before { content: ""; position: absolute; inset: 12px; border-radius: 24px; z-index: 0;
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(255,214,120,0.14), transparent 55%),
    linear-gradient(180deg, #0b3220 0%, #06180f 62%, #030f09 100%);
  box-shadow: inset 0 2px 12px rgba(0,0,0,0.72), inset 0 0 0 1.5px rgba(240,201,74,0.26), inset 0 0 34px rgba(46,224,138,0.08); }
.rl-cabinet > * { position: relative; z-index: 1; }

/* corner ornaments — small gold bosses with a green gem centre */
.rl-corner { position: absolute; width: 20px; height: 20px; border-radius: 50%; z-index: 3;
  background: radial-gradient(circle at 34% 28%, #fff6d5, #f0c94a 42%, #a9760a 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 5px rgba(0,0,0,0.5), 0 0 10px rgba(240,201,74,0.55); }
.rl-corner::after { content: ""; position: absolute; inset: 6px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #d6ffe9, #2ee08a 50%, #0e7a4a 100%); box-shadow: inset 0 0 3px rgba(255,255,255,0.6); }
.rl-corner--tl { top: 9px; left: 9px; } .rl-corner--tr { top: 9px; right: 9px; }
.rl-corner--bl { bottom: 9px; left: 9px; } .rl-corner--br { bottom: 9px; right: 9px; }

/* gem accents down the polished gold side rails */
.rl-rail { position: absolute; top: 74px; bottom: 78px; width: 12px; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: space-around; }
.rl-rail--l { left: 3px; } .rl-rail--r { right: 3px; }
.rl-rail i { width: 11px; height: 11px; transform: rotate(45deg); border-radius: 2px;
  background: linear-gradient(135deg, #eafff4, #2ee08a 46%, #0e7a4a 100%);
  box-shadow: 0 0 7px rgba(46,224,138,0.7), inset 0 0 3px rgba(255,255,255,0.65), 0 1px 2px rgba(0,0,0,0.5); }

.rl-head { margin-bottom: 12px; }
.rl-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 900; letter-spacing: 1.4px; padding: 5px 14px; border-radius: 999px; color: #2a1a02;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d5, transparent 55%), linear-gradient(180deg, #ffe9a8, #f0c94a 55%, #c68a2e); box-shadow: 0 3px 10px -3px rgba(240,201,74,0.6), inset 0 1px 0 rgba(255,255,255,0.75); }
.rl-sub { margin-top: 9px; font-size: 13px; font-weight: 700; color: rgba(233,255,236,0.82); }
.rl-sub b { color: #ffe9a8; }

/* PREMIUM REELS arched banner above the machine plate */
.rl-banner { text-align: center; margin: -2px 0 12px; }
.rl-banner-ttl { display: block; font-size: 23px; font-weight: 900; letter-spacing: 1.5px; line-height: 1; text-transform: uppercase;
  background-image: linear-gradient(180deg, #fffefa, #fff6d5 32%, #f0c94a 60%, #c68a2e 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(90,60,10,0.55)) drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }
.rl-banner-sub { display: block; margin-top: 4px; font-size: 10px; font-weight: 900; letter-spacing: 1.8px; color: #2ee08a; text-shadow: 0 0 9px rgba(46,224,138,0.55); }

/* ── Reel chamber ─────────────────────────────────────────────────────────── */
.rl-chamber { position: relative; margin: 0 auto; width: min(320px, 82vw); border-radius: 24px; overflow: hidden;
  padding: 5px; /* thickness of the inner metallic gold frame */
  background:
    linear-gradient(180deg, #fff6d5, #f0c94a 20%, #a9760a 52%, #6c4a08 74%, #f0c94a 100%);
  box-shadow: 0 20px 44px -18px rgba(0,0,0,0.9), 0 0 30px -12px rgba(240,201,74,0.5),
    inset 0 2px 0 rgba(255,246,213,0.9), inset 0 -3px 6px rgba(90,60,10,0.6); }
.rl-chamber.is-spin { box-shadow: 0 20px 44px -18px rgba(0,0,0,0.9), 0 0 48px -8px rgba(240,201,74,0.75), inset 0 2px 0 rgba(255,246,213,0.9), inset 0 -3px 6px rgba(90,60,10,0.6); }
.rl-chamber.is-jack { box-shadow: 0 20px 44px -18px rgba(0,0,0,0.9), 0 0 60px -6px rgba(46,224,138,0.7), 0 0 48px -8px rgba(255,214,120,0.7), inset 0 2px 0 rgba(255,246,213,0.9); }
/* deep emerald inner chamber */
.rl-reels { position: relative; display: flex; gap: 6px; padding: 10px; border-radius: 20px; z-index: 1;
  background:
    radial-gradient(90% 55% at 50% 0%, rgba(255,214,120,0.20), transparent 55%),
    radial-gradient(120% 70% at 50% 44%, rgba(46,224,138,0.16), transparent 62%),
    linear-gradient(180deg, #0b3220 0%, #06180f 60%, #030f09 100%);
  box-shadow: inset 0 3px 14px rgba(0,0,0,0.78), inset 0 0 0 1.5px rgba(240,201,74,0.30), inset 0 0 30px rgba(46,224,138,0.10); }
.rl-glass { position: absolute; inset: 5px; border-radius: 20px; z-index: 3; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.14), transparent 16%, transparent 84%, rgba(0,0,0,0.22)); }

.rl-reel { position: relative; flex: 1; height: ${TILE * 3}px; overflow: hidden; border-radius: 12px;
  background: linear-gradient(180deg, #0b3220, #06180f 70%, #030f09);
  box-shadow: inset 0 0 0 1px rgba(240,201,74,0.18), inset 0 10px 18px -8px rgba(0,0,0,0.8), inset 0 -10px 18px -8px rgba(0,0,0,0.8); }
.rl-strip { will-change: transform; }
.rl-strip.is-blur { filter: blur(3.4px) brightness(1.06); }

/* static gold gridlines + tiny diamond nodes between the three cells */
.rl-grid { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.rl-grid i { position: absolute; top: 10px; bottom: 10px; width: 2px;
  background: linear-gradient(180deg, transparent, rgba(255,228,140,0.7) 18%, rgba(240,201,74,0.5) 82%, transparent);
  box-shadow: 0 0 7px rgba(240,201,74,0.5); }
.rl-grid i:nth-child(1) { left: calc(13px + (100% - 32px) / 3); }
.rl-grid i:nth-child(2) { left: calc(19px + (100% - 32px) * 2 / 3); }
.rl-grid i::before, .rl-grid i::after { content: ""; position: absolute; left: 50%; width: 9px; height: 9px; transform: translate(-50%, -50%) rotate(45deg); border-radius: 1.5px;
  background: linear-gradient(135deg, #fff6d5, #f0c94a 50%, #c68a2e); box-shadow: 0 0 8px rgba(240,201,74,0.9), inset 0 0 2px rgba(255,255,255,0.7); }
.rl-grid i::before { top: 33.33%; } .rl-grid i::after { top: 66.66%; }

/* one reel symbol = 3D gold/gem glyph on top + a coloured gemstone prize capsule
   below + a small C74/JACKPOT tag — the whole symbol is what travels vertically */
.rl-tile { height: ${TILE}px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; position: relative; }
.rl-tile > span { position: relative; z-index: 1; }
.rl-sym-ic { display: block; line-height: 0; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 6px rgba(255,214,120,0.32)); }
.rl-sym-img { display: block; width: auto; max-width: 82px; object-fit: contain; filter: drop-shadow(0 4px 5px rgba(0,0,0,0.55)); }
.rl-tile--jack .rl-sym-ic { filter: drop-shadow(0 0 9px rgba(255,214,120,0.9)) drop-shadow(0 3px 4px rgba(0,0,0,0.6)); }
/* coloured gemstone prize capsule — bevelled rim + inner gloss, colour per tier */
.rl-cap { display: grid; place-items: center; min-width: 64px; padding: 3px 13px 4px; border-radius: 999px; border: 1.5px solid rgba(255,246,213,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.42), 0 3px 7px -2px rgba(0,0,0,0.6); }
.rl-cap--grn { background: linear-gradient(180deg, #24a862, #0c6b39 58%, #064f28); }
.rl-cap--blu { background: linear-gradient(180deg, #3a7ada, #173e86 58%, #0e2a63); }
.rl-cap--pur { background: linear-gradient(180deg, #8548ce, #4a2287 58%, #2f1560); }
.rl-cap--red { background: linear-gradient(180deg, #d9472f, #8f1f16 58%, #5f120c); }
.rl-cap--jack { background: linear-gradient(180deg, #8a34cf, #a01f5a 52%, #8f1f16); border-color: rgba(255,214,120,0.9);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.42), 0 0 15px rgba(255,214,120,0.55), 0 3px 7px -2px rgba(0,0,0,0.6); }
.rl-num { font-size: 20px; font-weight: 900; line-height: 1; letter-spacing: -0.4px; font-variant-numeric: tabular-nums; color: #fffdf5;
  text-shadow: 0 1px 0 rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.5); }
.rl-tile--jack .rl-num { font-size: 18px; color: #fff6d5; text-shadow: 0 0 8px rgba(255,214,120,0.7), 0 1px 0 rgba(0,0,0,0.4); }
.rl-tag { font-size: 7.5px; font-weight: 900; letter-spacing: 1.3px; color: #93c3aa; }
.rl-tile--jack .rl-tag { color: #ffd876; text-shadow: 0 0 8px rgba(255,214,120,0.7); }

/* ── one-shot glossy glint sweep across the locked center symbol ───────────── */
.rl-lockfx { position: absolute; left: 8px; right: 8px; top: 50%; height: ${TILE}px; transform: translateY(-50%); z-index: 5; pointer-events: none; border-radius: 12px; overflow: hidden; opacity: 0; }
.rl-lockfx.is-lock { opacity: 1; }
.rl-lockfx.is-lock::before { content: ""; position: absolute; top: 0; bottom: 0; left: -45%; width: 38%; transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(255,246,213,0.5), transparent); animation: rl-glint 0.72s cubic-bezier(0.2,0.7,0.2,1) 1; }
@keyframes rl-glint { 0% { left: -45%; } 100% { left: 122%; } }

/* ── masks, payline, particles ────────────────────────────────────────────── */
.rl-mask { position: absolute; left: 5px; right: 5px; height: ${TILE}px; z-index: 4; pointer-events: none; }
.rl-mask--t { top: 5px; background: linear-gradient(180deg, #04180e 3%, rgba(4,24,14,0.5) 28%, transparent 64%); border-radius: 20px 20px 0 0; }
.rl-mask--b { bottom: 5px; background: linear-gradient(0deg, #04180e 3%, rgba(4,24,14,0.5) 28%, transparent 64%); border-radius: 0 0 20px 20px; }
/* center payline — the brighter, more valuable viewing band where wins land */
.rl-payline { position: absolute; left: 8px; right: 8px; top: 50%; height: ${TILE}px; transform: translateY(-50%); z-index: 2; pointer-events: none; border-radius: 12px;
  background: linear-gradient(180deg, rgba(240,201,74,0.10), transparent 30%, transparent 70%, rgba(240,201,74,0.10));
  box-shadow: inset 0 0 0 1.5px rgba(240,201,74,0.6), 0 0 18px -2px rgba(240,201,74,0.42), inset 0 0 26px rgba(46,224,138,0.12); }
.rl-payline::before, .rl-payline::after { content: ""; position: absolute; top: 50%; width: 11px; height: 11px; transform: translateY(-50%) rotate(45deg);
  background: linear-gradient(135deg, #fff6d5, #f0c94a 50%, #c68a2e); box-shadow: 0 0 8px rgba(240,201,74,0.85); }
.rl-payline::before { left: -3px; } .rl-payline::after { right: -3px; }
.rl-payline.is-hit { box-shadow: inset 0 0 0 2px rgba(255,246,213,0.95), 0 0 30px -1px rgba(240,201,74,0.85), inset 0 0 34px rgba(255,214,120,0.28); animation: rl-hit 1.1s ease-in-out infinite; }
@keyframes rl-hit { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }
.rl-particles { position: absolute; inset: 5px; z-index: 2; pointer-events: none; border-radius: 20px; opacity: 0.7;
  background-image:
    radial-gradient(1.7px 1.7px at 22% 26%, rgba(255,232,150,0.85), transparent),
    radial-gradient(1.5px 1.5px at 78% 62%, rgba(120,255,200,0.6), transparent),
    radial-gradient(1.5px 1.5px at 60% 18%, rgba(255,240,190,0.55), transparent),
    radial-gradient(1.4px 1.4px at 38% 82%, rgba(120,255,190,0.55), transparent),
    radial-gradient(1.4px 1.4px at 85% 32%, rgba(255,214,110,0.6), transparent),
    radial-gradient(1.3px 1.3px at 14% 68%, rgba(255,214,110,0.7), transparent); }
.rl-chamber.is-spin .rl-particles { animation: rl-mote 1.4s linear infinite; }
@keyframes rl-mote { 0%,100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-6px); opacity: 0.85; } }
/* mechanical/electronic snap on stop — a brightness flash only (never touches the
   inline translateY transform, so the landed position is preserved exactly) */
.rl-strip.is-snap { animation: rl-snap .26s ease-out; }
@keyframes rl-snap { 0% { filter: brightness(1.45); } 60% { filter: brightness(1.08); } 100% { filter: brightness(1); } }

/* ── decorative red-ball lever on the right side (never moves) ─────────────── */
.rl-lever { position: absolute; right: -13px; top: 50%; transform: translateY(-50%); width: 26px; height: 132px; z-index: 4; pointer-events: none; }
.rl-lever-arm { position: absolute; left: 50%; transform: translateX(-50%); top: 24px; bottom: 4px; width: 9px; border-radius: 6px;
  background: linear-gradient(90deg, #6c4a08, #c68a2e 38%, #fff6d5 52%, #c68a2e 66%, #5a3a08);
  box-shadow: 0 3px 7px rgba(0,0,0,0.55), inset 0 0 2px rgba(255,255,255,0.4); }
.rl-lever-arm::after { content: ""; position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%); width: 20px; height: 12px; border-radius: 5px;
  background: radial-gradient(circle at 40% 30%, #fff6d5, #c68a2e 60%, #7a4e0d); box-shadow: 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6); }
.rl-lever-ball { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 24px; height: 24px; border-radius: 50%;
  background: radial-gradient(circle at 33% 26%, #ffb3a6, #e23b2e 46%, #8f1206 100%);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.45), 0 5px 9px rgba(0,0,0,0.5), 0 0 12px rgba(226,59,46,0.5); }

/* ── controls ─────────────────────────────────────────────────────────────── */
.rl-foot { display: flex; align-items: center; gap: 14px; justify-content: center; margin-top: 16px; }
.rl-bal { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; font-size: 13px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, rgba(11,50,32,0.92), rgba(3,15,9,0.92)); box-shadow: inset 0 0 0 1px rgba(240,201,74,0.26), 0 3px 8px rgba(0,0,0,0.4); }
.rl-bal::after { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #2ee08a; box-shadow: 0 0 8px rgba(46,224,138,0.9); }
.rl-spin { position: relative; border: none; cursor: pointer; font-family: inherit; min-width: 148px; padding: 15px 26px; border-radius: 16px; overflow: hidden;
  font-size: 16px; font-weight: 900; letter-spacing: 1.4px; color: #3a2600; text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  border: 2px solid rgba(122,78,14,0.5);
  background: radial-gradient(120% 100% at 50% 8%, rgba(255,255,255,0.85), transparent 50%), linear-gradient(180deg, #fff6d5 0%, #f0c94a 40%, #c68a2e 72%, #b8860b 100%);
  box-shadow: 0 7px 0 #8a5e0a, inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -10px 16px rgba(138,100,16,0.4), 0 14px 26px -8px rgba(240,201,74,0.6), 0 0 26px -6px rgba(240,201,74,0.55); }
.rl-spin::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent); animation: rl-sheen 3.4s ease-in-out infinite; }
@keyframes rl-sheen { 0%,72% { left: -60%; } 86% { left: 130%; } 100% { left: 130%; } }
.rl-spin:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 3px 0 #8a5e0a, inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -6px 12px rgba(138,100,16,0.4); }
/* disabled (cannot spin) = darker, muted gold */
.rl-spin:disabled { cursor: not-allowed; color: rgba(58,38,0,0.6); text-shadow: none;
  background: linear-gradient(180deg, #b79238 0%, #8a6a1e 45%, #5f430c 78%, #43300a 100%);
  box-shadow: 0 5px 0 #4d3608, inset 0 2px 0 rgba(255,246,213,0.35), inset 0 -8px 14px rgba(60,42,8,0.5); }
.rl-spin:disabled::after { display: none; }
.rl-spin.is-spin { color: #6b4a08; } .rl-spin.is-spin::after { animation-duration: 0.9s; }
.rl-spin-tx { position: relative; z-index: 1; }

.rl-win { margin: 16px auto 0; max-width: 280px; padding: 13px 18px; border-radius: 16px; display: flex; flex-direction: column; gap: 3px;
  background: radial-gradient(120% 90% at 50% 0%, rgba(255,214,120,0.22), transparent 60%), linear-gradient(160deg, #123a24, #06180f); border: 1.5px solid rgba(240,201,74,0.6);
  box-shadow: 0 14px 30px -12px rgba(0,0,0,0.7), 0 0 24px -8px rgba(240,201,74,0.6); animation: rl-pop .4s cubic-bezier(.2,.9,.3,1.2); }
@keyframes rl-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.rl-win.is-jack { border-color: #ffd24d; box-shadow: 0 14px 30px -12px rgba(0,0,0,0.7), 0 0 44px -6px rgba(255,210,80,0.9); }
.rl-win-k { font-size: 11px; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; color: #ffcf4d; }
.rl-win-v { font-size: 30px; font-weight: 900; color: #fff6d5; font-variant-numeric: tabular-nums; text-shadow: 0 0 18px rgba(255,210,80,0.6); }

@media (prefers-reduced-motion: reduce) {
  .rl-strip { transition: none !important; filter: none !important; }
  .rl-spin::after, .rl-chamber.is-spin .rl-particles, .rl-payline.is-hit { animation: none !important; }
  .rl-lockfx.is-lock::before { animation: none !important; display: none; }
}
`;
