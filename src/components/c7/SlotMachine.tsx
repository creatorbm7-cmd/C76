/**
 * SlotMachine — interactive 3-reel slot game for the C7 Casino page.
 *
 * Mechanics:
 *  - 3 reels, each showing 3 symbols (top / center / bottom). Center row is the
 *    payline.
 *  - SPIN deducts the bet, sets each reel to "spinning" (cycles random symbols
 *    every ~70ms), then staggers stop times per reel for a real slot feel.
 *  - Win detection: 3 matching symbols on the center line. Weighted symbol pool
 *    skews toward the cheaper symbols (real slot economics).
 *  - Wins call playWin (small/big/jackpot) and surface a RewardPopup for 5x+ wins.
 *  - Pure CSS animation + React state — no external libs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import RewardPopup from './RewardPopup';

// ──────────────────────────────────────────────────────────────────────────
// SYMBOLS & PAYTABLE
// ──────────────────────────────────────────────────────────────────────────

type Symbol = {
  emoji: string;
  name: string;
  weight: number;   // higher weight = more frequent
  payout: number;   // multiplier for 3 of a kind on payline
};

const SYMBOLS: Symbol[] = [
  { emoji: '🍒', name: 'cherry',  weight: 22, payout: 2   },
  { emoji: '🍋', name: 'lemon',   weight: 20, payout: 3   },
  { emoji: '🍊', name: 'orange',  weight: 18, payout: 4   },
  { emoji: '🍇', name: 'grape',   weight: 16, payout: 5   },
  { emoji: '🔔', name: 'bell',    weight: 12, payout: 10  },
  { emoji: '💎', name: 'gem',     weight: 8,  payout: 25  },
  { emoji: '7️⃣', name: 'seven',  weight: 4,  payout: 50  },
  { emoji: '👑', name: 'jackpot', weight: 1,  payout: 250 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);

function pickWeightedSymbol(): Symbol {
  const r = Math.random() * TOTAL_WEIGHT;
  let acc = 0;
  for (const s of SYMBOLS) {
    acc += s.weight;
    if (r < acc) return s;
  }
  return SYMBOLS[0];
}

function pickRandomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

// Three positions per reel (top, center, bottom). We only render these for
// visual richness; only the center row pays.
type Reel = [Symbol, Symbol, Symbol];

function buildReel(centerSymbol: Symbol): Reel {
  return [pickRandomSymbol(), centerSymbol, pickRandomSymbol()];
}

// ──────────────────────────────────────────────────────────────────────────
// CSS — keyframes for the spinning effect
// ──────────────────────────────────────────────────────────────────────────

const SLOT_CSS = `
@keyframes c7-reel-blur {
  0%   { filter: blur(0); transform: translateY(0); }
  50%  { filter: blur(2px); transform: translateY(-4px); }
  100% { filter: blur(0); transform: translateY(0); }
}
@keyframes c7-payline-pulse {
  0%, 100% { box-shadow: 0 0 0 1px ${t.colors.aqua[500]}66, inset 0 0 18px ${t.colors.aqua[500]}22; }
  50%      { box-shadow: 0 0 0 2px ${t.colors.aqua[500]}cc, inset 0 0 32px ${t.colors.aqua[500]}55; }
}
@keyframes c7-win-flash {
  0%, 100% { background: ${t.colors.surface.raised}; }
  50%      { background: ${t.colors.gold[400]}33; }
}
@keyframes c7-spin-button-glow {
  0%, 100% { box-shadow: 0 0 20px ${t.colors.aqua[500]}55, 0 0 0 1px ${t.colors.aqua[500]}aa; }
  50%      { box-shadow: 0 0 36px ${t.colors.aqua[500]}cc, 0 0 0 2px ${t.colors.aqua[500]}; }
}
.c7-reel-cell-spinning { animation: c7-reel-blur 0.18s linear infinite; }
.c7-payline             { animation: c7-payline-pulse 1.6s ease-in-out infinite; }
.c7-cell-win            { animation: c7-win-flash 0.5s ease-in-out 4; }
.c7-spin-btn-idle       { animation: c7-spin-button-glow 2s ease-in-out infinite; }
`;

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────

interface SlotMachineProps {
  initialBalance?: number;
  onBalanceChange?: (newBalance: number) => void;
}

const BETS = [10, 50, 100, 500];

export default function SlotMachine({
  initialBalance = 1000,
  onBalanceChange,
}: SlotMachineProps) {
  const { play } = useSound();

  // Game state
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(BETS[1]); // default 50
  const [reels, setReels] = useState<[Reel, Reel, Reel]>([
    buildReel(SYMBOLS[0]),
    buildReel(SYMBOLS[1]),
    buildReel(SYMBOLS[2]),
  ]);
  const [spinning, setSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [lastWin, setLastWin] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [biggestWin, setBiggestWin] = useState(0);
  const [winCells, setWinCells] = useState<boolean>(false);

  // Reward popup
  const [popup, setPopup] = useState<{ amount: number; tier: 'normal' | 'big' | 'jackpot' } | null>(null);

  // Intervals for the spinning cycle
  const intervalsRef = useRef<Array<ReturnType<typeof setInterval> | null>>([null, null, null]);
  const timeoutsRef  = useRef<Array<ReturnType<typeof setTimeout>  | null>>([null, null, null]);

  // Notify parent of balance changes
  useEffect(() => {
    onBalanceChange?.(balance);
  }, [balance, onBalanceChange]);

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById('c7-slot-css')) return;
    const tag = document.createElement('style');
    tag.id = 'c7-slot-css';
    tag.textContent = SLOT_CSS;
    document.head.appendChild(tag);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((i) => i && clearInterval(i));
      timeoutsRef.current.forEach((to) => to && clearTimeout(to));
    };
  }, []);

  const canSpin = !spinning.some(Boolean) && balance >= bet;

  // ──────────────────────────────────────────────────────────────────
  // Spin
  // ──────────────────────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (!canSpin) return;

    play('buttonClick');
    play('spinStart');

    // Deduct bet up front
    setBalance((b) => b - bet);
    setLastWin(0);
    setWinCells(false);
    setTotalSpins((n) => n + 1);
    setSpinning([true, true, true]);

    // Pre-pick the final symbols so we can stop the reels there
    const finalSymbols: [Symbol, Symbol, Symbol] = [
      pickWeightedSymbol(),
      pickWeightedSymbol(),
      pickWeightedSymbol(),
    ];

    // Each reel spins through random symbols rapidly
    [0, 1, 2].forEach((i) => {
      intervalsRef.current[i] = setInterval(() => {
        setReels((curr) => {
          const next: [Reel, Reel, Reel] = [...curr] as [Reel, Reel, Reel];
          next[i] = buildReel(pickRandomSymbol());
          return next;
        });
      }, 70);
    });

    // Stagger reel stop times (reel 1 → 2 → 3)
    const STOP_TIMES = [1400, 1800, 2300];
    [0, 1, 2].forEach((i) => {
      timeoutsRef.current[i] = setTimeout(() => {
        if (intervalsRef.current[i]) {
          clearInterval(intervalsRef.current[i]!);
          intervalsRef.current[i] = null;
        }
        // Lock to the chosen final symbol
        setReels((curr) => {
          const next: [Reel, Reel, Reel] = [...curr] as [Reel, Reel, Reel];
          next[i] = buildReel(finalSymbols[i]);
          return next;
        });
        setSpinning((curr) => {
          const next: [boolean, boolean, boolean] = [...curr] as [boolean, boolean, boolean];
          next[i] = false;
          return next;
        });
        play('spinEnd');

        // After the last reel stops, evaluate the win
        if (i === 2) {
          setTimeout(() => evaluateWin(finalSymbols), 100);
        }
      }, STOP_TIMES[i]);
    });
  }, [canSpin, bet, play]);

  // ──────────────────────────────────────────────────────────────────
  // Win evaluation
  // ──────────────────────────────────────────────────────────────────
  const evaluateWin = useCallback((finalSymbols: [Symbol, Symbol, Symbol]) => {
    const [a, b, c] = finalSymbols;
    if (a.name === b.name && b.name === c.name) {
      const win = bet * a.payout;
      setLastWin(win);
      setBalance((bal) => bal + win);
      setBiggestWin((bw) => Math.max(bw, win));
      setWinCells(true);

      // Sound + popup tier based on win size relative to bet
      const tier =
        a.payout >= 100 ? 'jackpot' :
        a.payout >= 25  ? 'big'     :
        'normal';

      if (tier === 'jackpot') {
        play('jackpot');
        setPopup({ amount: win, tier: 'jackpot' });
      } else if (tier === 'big') {
        play('winCelebrate');
        setPopup({ amount: win, tier: 'big' });
      } else {
        play('coin');
        // Don't open the popup for small wins (keeps gameplay snappy)
      }

      // Clear the win flash after a beat
      setTimeout(() => setWinCells(false), 2400);
    }
  }, [bet, play]);

  // ──────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%' }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        padding: '10px 14px',
        background: t.colors.surface.glass,
        backdropFilter: 'blur(14px)',
        borderRadius: t.radius.card,
        border: `1px solid ${t.colors.border.aqua}`,
      }}>
        <Stat label="BALANCE" value={`$${balance.toLocaleString()}`} color={t.colors.aqua[500]} />
        <Stat label="LAST WIN" value={lastWin > 0 ? `$${lastWin.toLocaleString()}` : '—'}
              color={lastWin > 0 ? t.colors.gold[400] : t.colors.text.tertiary} />
        <Stat label="SPINS"  value={String(totalSpins)} color={t.colors.text.secondary} />
        <Stat label="BIGGEST" value={biggestWin > 0 ? `$${biggestWin.toLocaleString()}` : '—'}
              color={biggestWin > 0 ? t.colors.ruby[500] : t.colors.text.tertiary} />
      </div>

      {/* Slot housing */}
      <div style={{
        background: t.gradients.cardGlass,
        backdropFilter: 'blur(20px)',
        borderRadius: t.radius.card,
        border: `1px solid ${t.colors.border.gold}`,
        padding: '18px 14px',
        boxShadow: `${t.shadow.card}, 0 0 60px ${t.colors.gold.glowSoft}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Mesh background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: t.gradients.meshOverlay,
          opacity: 0.4, pointerEvents: 'none',
        }} />

        {/* Reels row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          position: 'relative',
        }}>
          {reels.map((reel, i) => (
            <Reel key={i} reel={reel} spinning={spinning[i]} winning={winCells} />
          ))}
        </div>

        {/* Payline indicator */}
        <div
          className="c7-payline"
          style={{
            position: 'absolute',
            left: 14, right: 14,
            top: '50%',
            height: 60,
            transform: 'translateY(-50%)',
            marginTop: 30, // offset to align with center row visually
            borderRadius: t.radius.md,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Bet selector */}
        <div style={{
          display: 'flex',
          gap: 6,
          justifyContent: 'center',
          marginTop: 14,
          flexWrap: 'wrap',
        }}>
          {BETS.map((b) => (
            <button
              key={b}
              onClick={() => { if (!spinning.some(Boolean)) { setBet(b); play('buttonClick'); } }}
              disabled={spinning.some(Boolean) || b > balance}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 800,
                background: bet === b ? t.gradients.aquaBar : t.colors.surface.raised,
                color: bet === b ? t.colors.text.onAccent : t.colors.text.secondary,
                border: `1px solid ${bet === b ? t.colors.aqua[500] : t.colors.border.medium}`,
                borderRadius: t.radius.pill,
                cursor: spinning.some(Boolean) || b > balance ? 'not-allowed' : 'pointer',
                opacity: b > balance ? 0.4 : 1,
                letterSpacing: t.type.tracking.wide,
                transition: 'all 0.18s ease',
              }}
            >
              ${b}
            </button>
          ))}
        </div>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={!canSpin}
          className={canSpin ? 'c7-spin-btn-idle' : ''}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: t.type.tracking.widest,
            background: canSpin ? t.gradients.aquaBar : t.colors.surface.raised,
            color: canSpin ? t.colors.text.onAccent : t.colors.text.tertiary,
            border: 'none',
            borderRadius: t.radius.pill,
            cursor: canSpin ? 'pointer' : 'not-allowed',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {spinning.some(Boolean) ? '⟳ SPINNING…' : balance < bet ? 'INSUFFICIENT BALANCE' : `▶ SPIN  •  $${bet}`}
        </button>
      </div>

      {/* Paytable */}
      <div style={{
        marginTop: 12,
        padding: '10px 12px',
        background: t.colors.surface.glass,
        backdropFilter: 'blur(10px)',
        borderRadius: t.radius.card,
        border: `1px solid ${t.colors.border.subtle}`,
        fontSize: 11,
      }}>
        <div style={{
          color: t.colors.text.tertiary,
          fontWeight: 800,
          letterSpacing: t.type.tracking.wider,
          marginBottom: 8,
        }}>PAYTABLE (3 in a row, payline)</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}>
          {SYMBOLS.slice().reverse().map((s) => (
            <div key={s.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 6px',
              background: t.colors.surface.raised,
              borderRadius: t.radius.sm,
              border: `1px solid ${s.payout >= 100 ? t.colors.border.gold : t.colors.border.subtle}`,
            }}>
              <span style={{ fontSize: 16 }}>{s.emoji}</span>
              <span style={{
                fontWeight: 900,
                color: s.payout >= 100 ? t.colors.gold[400] :
                       s.payout >= 25  ? t.colors.aqua[500] :
                                         t.colors.text.secondary,
              }}>{s.payout}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reward popup for big / jackpot wins */}
      {popup && (
        <RewardPopup
          open
          onClose={() => setPopup(null)}
          prize={`$${popup.amount.toLocaleString()}`}
          variant={popup.tier}
          autoDismissMs={popup.tier === 'jackpot' ? 6000 : 4000}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{
        fontSize: 9,
        color: t.colors.text.tertiary,
        letterSpacing: t.type.tracking.widest,
        fontWeight: 700,
      }}>{label}</div>
      <div style={{
        fontSize: 14,
        color,
        fontWeight: 900,
        marginTop: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  );
}

function Reel({ reel, spinning, winning }: { reel: Reel; spinning: boolean; winning: boolean }) {
  return (
    <div style={{
      background: t.colors.surface.void,
      borderRadius: t.radius.md,
      border: `1px solid ${t.colors.border.medium}`,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'inset 0 8px 18px rgba(0,0,0,0.6)',
    }}>
      {reel.map((sym, idx) => (
        <div
          key={idx}
          className={`${spinning ? 'c7-reel-cell-spinning' : ''} ${winning && idx === 1 ? 'c7-cell-win' : ''}`}
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            background: idx === 1 ? t.colors.surface.raised : 'transparent',
            borderTop: idx > 0 ? `1px solid ${t.colors.border.subtle}` : 'none',
            opacity: idx === 1 ? 1 : 0.55,
          }}
        >
          {sym.emoji}
        </div>
      ))}
    </div>
  );
}
