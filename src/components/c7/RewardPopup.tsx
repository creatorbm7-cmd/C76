import { useEffect, useMemo } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import { AnimatedModal } from './AnimatedModal';
import './c7-animations.css';

export interface RewardPopupProps {
  open: boolean;
  /** Prize label, e.g. "$500", "FREE SPIN", "JACKPOT" */
  prize: string;
  /** Subtitle / category, e.g. "Wheel Bonus", "Welcome Reward" */
  category?: string;
  /** Drives confetti color + emoji + glow intensity */
  variant?: 'normal' | 'big' | 'jackpot';
  /** Auto-dismiss after N ms (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Show "Claim" button. If false, popup is informational only. */
  showClaim?: boolean;
  /** Claim button label */
  claimLabel?: string;
  /** Called when claim button pressed */
  onClaim?: () => void;
  /** Called when popup closes (backdrop / ESC / auto-dismiss) */
  onClose?: () => void;
}

const VARIANT_CONFIG = {
  normal: {
    emoji: '🎉',
    sound: 'coin' as const,
    pieces: 24,
    colors: ['#ffc935', '#e0a81f', '#ffc935', '#ffc940'],
    headerGradient: null, // uses default aqua
    glow: '0 0 30px rgba(255, 201, 53,0.55)',
  },
  big: {
    emoji: '💰',
    sound: 'winCelebrate' as const,
    pieces: 38,
    colors: ['#ffc940', '#fbbf24', '#ffc935', '#a78bfa', '#ef2a4c'],
    headerGradient: null,
    glow: '0 0 40px rgba(255,201,64,0.7)',
  },
  jackpot: {
    emoji: '👑',
    sound: 'jackpot' as const,
    pieces: 60,
    colors: ['#ffc940', '#fbbf24', '#ef2a4c', '#a78bfa', '#ffc935', '#ffc935'],
    headerGradient: null,
    glow: '0 0 60px rgba(255,201,64,0.85), 0 0 80px rgba(255, 201, 53,0.4)',
  },
} as const;

// Confetti pieces — generated once per open
interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  size: number;
  shape: 'square' | 'circle';
}

function makeConfetti(count: number, colors: readonly string[]): ConfettiPiece[] {
  const out: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: Math.random() * 720 - 360,
      size: 6 + Math.random() * 8,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    });
  }
  return out;
}

const CONFETTI_CSS = `
@keyframes c7-confetti-fall {
  0% { transform: translateY(-40px) rotate(0deg); opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(400px) rotate(var(--c7-rot, 360deg)); opacity: 0; }
}
.c7-confetti-piece {
  position: absolute;
  top: 0;
  animation: c7-confetti-fall var(--c7-dur, 2s) cubic-bezier(0.4, 0, 0.6, 1) var(--c7-delay, 0s) both;
}
@keyframes c7-prize-scale {
  0% { opacity: 0; transform: scale(0.3); }
  60% { transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes c7-emoji-bounce {
  0%,100% { transform: translateY(0) scale(1); }
  50%     { transform: translateY(-8px) scale(1.08); }
}
@keyframes c7-aura-pulse {
  0%,100% { opacity: 0.4; transform: scale(0.9); }
  50%     { opacity: 0.7; transform: scale(1.05); }
}
.c7-prize-amount { animation: c7-prize-scale 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
.c7-emoji-bounce { animation: c7-emoji-bounce 1.4s ease-in-out infinite; }
.c7-aura { animation: c7-aura-pulse 2s ease-in-out infinite; }
`;

export function RewardPopup({
  open,
  prize,
  category = 'Reward',
  variant = 'normal',
  autoDismissMs = 0,
  showClaim = true,
  claimLabel = 'CLAIM',
  onClaim,
  onClose,
}: RewardPopupProps) {
  const { play } = useSound();
  const config = VARIANT_CONFIG[variant];
  const confetti = useMemo(
    () => (open ? makeConfetti(config.pieces, config.colors) : []),
    [open, config.pieces, config.colors]
  );

  // Play celebrate sound on open
  useEffect(() => {
    if (open) play(config.sound);
  }, [open, config.sound, play]);

  // Auto-dismiss
  useEffect(() => {
    if (!open || !autoDismissMs || autoDismissMs <= 0) return;
    const t = setTimeout(() => onClose?.(), autoDismissMs);
    return () => clearTimeout(t);
  }, [open, autoDismissMs, onClose]);

  const accent =
    variant === 'jackpot' ? t.colors.gold[400] :
    variant === 'big'     ? t.colors.gold[400] :
                            t.colors.aqua[500];

  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      bare
      maxWidth={340}
      showCloseButton={false}
    >
      <style>{CONFETTI_CSS}</style>
      <div
        style={{
          position: 'relative',
          padding: '36px 24px 28px',
          background: t.colors.surface.deep,
          borderRadius: 26,
          border: `1.5px solid ${accent}55`,
          boxShadow: `${config.glow}, 0 14px 34px rgba(0,0,0,0.5)`,
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Confetti layer */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {confetti.map((p, i) => (
            <span
              key={i}
              className="c7-confetti-piece"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : 2,
                ['--c7-rot' as any]: `${p.rotate}deg`,
                ['--c7-dur' as any]: `${p.duration}s`,
                ['--c7-delay' as any]: `${p.delay}s`,
                boxShadow: `0 0 6px ${p.color}88`,
              }}
            />
          ))}
        </div>

        {/* Aura glow behind emoji */}
        <div
          aria-hidden
          className="c7-aura"
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 140,
            height: 140,
            background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Emoji */}
        <div
          className="c7-emoji-bounce"
          style={{
            fontSize: 64,
            marginBottom: 12,
            filter: `drop-shadow(0 4px 12px ${accent}aa)`,
            position: 'relative',
          }}
        >
          {config.emoji}
        </div>

        {/* Category */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: t.colors.text.tertiary,
            letterSpacing: t.type.tracking.widest,
            textTransform: 'uppercase',
            position: 'relative',
            marginBottom: 6,
          }}
        >
          {category}
        </div>

        {/* Prize */}
        <div
          className="c7-prize-amount"
          style={{
            fontSize: variant === 'jackpot' ? 48 : 40,
            fontWeight: 900,
            fontFamily: t.type.family.display,
            background:
              variant === 'jackpot' ? t.gradients.jackpot :
              variant === 'big'     ? t.gradients.goldBar :
                                      t.gradients.hero,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: t.type.tracking.wide,
            lineHeight: 1.1,
            marginBottom: 4,
            textShadow: `0 0 28px ${accent}66`,
            position: 'relative',
          }}
        >
          {prize}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 12,
            color: t.colors.text.secondary,
            marginBottom: 20,
            position: 'relative',
          }}
        >
          {variant === 'jackpot' ? '🎰 LEGENDARY WIN!' : variant === 'big' ? 'Big Winner!' : 'You earned a reward'}
        </div>

        {/* CTA */}
        {showClaim && (
          <button
            className="c7-btn c7-glow-pulse"
            onClick={() => { play('buttonClick'); onClaim?.(); }}
            style={{
              width: '100%',
              padding: '13px 0',
              background:
                `radial-gradient(120% 90% at 50% -15%, rgba(255,255,255,0.45), transparent 55%), ${variant === 'jackpot' || variant === 'big' ? t.gradients.goldBar : t.gradients.aquaBar}`,
              border: 'none',
              borderRadius: t.radius.pill,
              fontSize: 16,
              fontWeight: 900,
              color: t.colors.text.onAccent,
              cursor: 'pointer',
              letterSpacing: t.type.tracking.wider,
              fontFamily: t.type.family.display,
              position: 'relative',
              boxShadow: `0 6px 0 rgba(0,0,0,0.34), inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -9px 16px rgba(0,0,0,0.2), 0 11px 20px -4px ${accent}99`,
            }}
          >{claimLabel}</button>
        )}
      </div>
    </AnimatedModal>
  );
}

export default RewardPopup;
