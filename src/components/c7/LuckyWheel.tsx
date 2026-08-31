import { useState, useRef, useCallback } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import './c7-animations.css';

export interface WheelPrize {
  label: string;
  /** Background color of the segment */
  color: string;
  /** Probability weight (defaults to 1 — uniform if all are 1) */
  weight?: number;
}

export interface LuckyWheelProps {
  /** 4-12 prizes around the wheel */
  prizes?: WheelPrize[];
  /** Diameter in pixels */
  size?: number;
  /** Callback fires when wheel stops on a prize */
  onWin?: (prize: WheelPrize, index: number) => void;
  /** Disable spinning (e.g. cooldown active) */
  disabled?: boolean;
  /** Optional cooldown label rendered in center button */
  cooldownLabel?: string;
}

const DEFAULT_PRIZES: WheelPrize[] = [
  { label: '$5',        color: '#e0a81f', weight: 30 },
  { label: '$10',       color: '#0ea5e9', weight: 22 },
  { label: 'FREE SPIN', color: '#a78bfa', weight: 15 },
  { label: '$25',       color: '#ffc935', weight: 14 },
  { label: '$50',       color: '#ffc940', weight: 10 },
  { label: '$100',      color: '#ef2a4c', weight: 6  },
  { label: '$500',      color: '#7c3aed', weight: 2  },
  { label: 'JACKPOT',   color: '#fbbf24', weight: 1  },
];

export function LuckyWheel({
  prizes = DEFAULT_PRIZES,
  size = 280,
  onWin,
  disabled = false,
  cooldownLabel,
}: LuckyWheelProps) {
  const { play } = useSound();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const spinIdRef = useRef(0);

  const segCount = prizes.length;
  const segAngle = 360 / segCount;

  // Build conic gradient for segments
  const conic = prizes
    .map((p, i) => `${p.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
    .join(', ');

  const weightedPick = useCallback(() => {
    const totalWeight = prizes.reduce((s, p) => s + (p.weight ?? 1), 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < prizes.length; i++) {
      r -= prizes[i].weight ?? 1;
      if (r <= 0) return i;
    }
    return prizes.length - 1;
  }, [prizes]);

  const spin = () => {
    if (spinning || disabled) return;
    setSpinning(true);
    play('spinStart');

    const winIdx = weightedPick();
    // Center the winning segment under the pointer at top (-90°)
    // Pointer is at top (12 o'clock), so rotation must end with segment center facing up
    const segMid = winIdx * segAngle + segAngle / 2;
    const targetWithinTurn = (270 - segMid + 360) % 360; // 270deg = top in our coordinate
    const fullSpins = 6 + Math.floor(Math.random() * 3); // 6-8 full rotations
    const final = rotation + fullSpins * 360 + ((targetWithinTurn - (rotation % 360)) + 360) % 360;

    setRotation(final);
    const myId = ++spinIdRef.current;

    setTimeout(() => {
      if (spinIdRef.current !== myId) return;
      setSpinning(false);
      play('spinEnd');
      const prize = prizes[winIdx];
      // Play celebrate sound for big wins
      if (prize.label === 'JACKPOT') play('jackpot');
      else if ((prize.weight ?? 1) <= 6) play('winCelebrate');
      else play('coin');
      onWin?.(prize, winIdx);
    }, 4800);
  };

  // Position label inside each segment
  const labelRadius = size * 0.34;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
      }}
    >
      {/* Outer glow ring */}
      <div
        aria-hidden
        className={spinning ? '' : 'c7-glow-pulse'}
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          background: t.gradients.hero,
          opacity: 0.55,
          filter: 'blur(14px)',
          zIndex: 0,
        }}
      />

      {/* Wheel disc */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${conic})`,
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? 'transform 4.8s cubic-bezier(0.16,1,0.3,1)'
            : 'transform 0.2s ease',
          boxShadow:
            'inset 0 0 30px rgba(0,0,0,0.4), 0 0 40px rgba(255, 201, 53,0.35)',
          border: `4px solid ${t.colors.gold[400]}`,
          zIndex: 1,
        }}
      >
        {/* Segment labels */}
        {prizes.map((p, i) => {
          const angle = i * segAngle + segAngle / 2;
          // Convert wheel coord to CSS: 0deg in conic = top
          // We position labels at radius along this angle
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 60,
                height: 20,
                marginLeft: -30,
                marginTop: -10,
                transform: `rotate(${angle}deg) translateY(-${labelRadius}px) rotate(${-angle + 90}deg)`,
                transformOrigin: '50% 50%',
                color: '#04060a',
                fontSize: 11,
                fontWeight: 900,
                textAlign: 'center',
                lineHeight: '20px',
                letterSpacing: '0.5px',
                textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                pointerEvents: 'none',
              }}
            >
              {p.label}
            </div>
          );
        })}

        {/* Center spokes (decoration) */}
        {prizes.map((_, i) => (
          <div
            key={`spoke-${i}`}
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 2,
              height: size / 2,
              background: 'rgba(255,255,255,0.25)',
              transformOrigin: '50% 0',
              transform: `translateX(-50%) rotate(${i * segAngle}deg)`,
            }}
          />
        ))}
      </div>

      {/* Pointer at top */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: -10,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: `26px solid ${t.colors.gold[400]}`,
          filter: 'drop-shadow(0 2px 6px rgba(255,201,64,0.8))',
          zIndex: 3,
        }}
      />

      {/* Center spin button */}
      <button
        onClick={spin}
        disabled={spinning || disabled}
        className="c7-btn"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: spinning || disabled
            ? t.colors.surface.elevated
            : t.gradients.aquaBar,
          border: `4px solid ${t.colors.surface.abyss}`,
          cursor: spinning || disabled ? 'not-allowed' : 'pointer',
          fontSize: spinning ? 16 : 14,
          fontWeight: 900,
          color: t.colors.text.onAccent,
          boxShadow: spinning ? 'none' : t.glow.aqua,
          letterSpacing: t.type.tracking.wider,
          fontFamily: t.type.family.display,
          zIndex: 4,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {spinning ? (
          <span className="c7-pulse-live">…</span>
        ) : disabled && cooldownLabel ? (
          <span style={{ fontSize: 11 }}>{cooldownLabel}</span>
        ) : (
          'SPIN'
        )}
      </button>
    </div>
  );
}

export default LuckyWheel;
