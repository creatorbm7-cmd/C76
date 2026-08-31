import { useEffect, useState, useRef } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import './c7-animations.css';

export interface JackpotBannerProps {
  /** Current jackpot amount (cents — e.g. 1821940000 for $18,219,400.00) */
  amount: number;
  /** Auto-increment per tick (cents). Set to 0 to disable. */
  tickIncrement?: number;
  /** Ms between ticks */
  tickIntervalMs?: number;
  /** Label above number, e.g. "PROGRESSIVE JACKPOT" */
  label?: string;
  /** Subtitle below number */
  subtitle?: string;
  /** Compact slim variant (smaller padding + font) */
  compact?: boolean;
  /** Show the WIN CTA button */
  showCta?: boolean;
  /** CTA label */
  ctaLabel?: string;
  /** Click handler for CTA */
  onCta?: () => void;
  /** Show crown icon (👑) on the left */
  showCrown?: boolean;
}

export function JackpotBanner({
  amount,
  tickIncrement = 0,
  tickIntervalMs = 100,
  label = 'PROGRESSIVE JACKPOT',
  subtitle,
  compact = false,
  showCta = true,
  ctaLabel = 'PLAY TO WIN',
  onCta,
  showCrown = true,
}: JackpotBannerProps) {
  const { play } = useSound();
  const [internalAmount, setInternalAmount] = useState(amount);
  const lastPropAmount = useRef(amount);

  // Sync from prop changes
  useEffect(() => {
    if (amount !== lastPropAmount.current) {
      setInternalAmount(amount);
      lastPropAmount.current = amount;
    }
  }, [amount]);

  // Auto-increment
  useEffect(() => {
    if (!tickIncrement || tickIncrement <= 0) return;
    const id = setInterval(() => {
      setInternalAmount(v => v + Math.floor(Math.random() * tickIncrement + tickIncrement / 3));
    }, tickIntervalMs);
    return () => clearInterval(id);
  }, [tickIncrement, tickIntervalMs]);

  // Format cents → $X,XXX,XXX.XX
  const fmt = (cents: number) => {
    const dollars = cents / 100;
    return '$' + dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const padding = compact ? '10px 14px' : '14px 18px';
  const numberSize = compact ? 22 : 32;
  const labelSize = compact ? 9 : 10;

  return (
    <div
      className="c7-card"
      style={{
        position: 'relative',
        background: t.gradients.jackpot,
        borderRadius: t.radius.card,
        padding,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        border: `1.5px solid ${t.colors.border.gold}`,
        boxShadow: `${t.glow.gold}, ${t.shadow.card}`,
        overflow: 'hidden',
      }}
    >
      {/* Shimmer overlay */}
      <div
        aria-hidden
        className="c7-shimmer"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.4,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Left: crown + label/number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 14, minWidth: 0, position: 'relative', flex: 1 }}>
        {showCrown && (
          <div
            className="c7-float"
            style={{
              fontSize: compact ? 24 : 32,
              filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.4))',
              flexShrink: 0,
            }}
          >
            👑
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: labelSize,
              color: t.colors.text.onAccent,
              opacity: 0.92,
              letterSpacing: t.type.tracking.widest,
              fontWeight: 800,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
          <div
            key={Math.floor(internalAmount / 100000)}
            style={{
              fontSize: numberSize,
              fontWeight: 900,
              color: t.colors.text.onAccent,
              fontFamily: t.type.family.mono,
              textShadow: '0 0 16px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
              animation: 'c7-fade-up 0.18s cubic-bezier(0.16,1,0.3,1) both',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmt(internalAmount)}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 10,
                color: t.colors.text.onAccent,
                opacity: 0.78,
                marginTop: 2,
                fontWeight: 700,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right: CTA */}
      {showCta && (
        <button
          className="c7-btn c7-glow-pulse"
          onClick={() => { play('buttonClick'); onCta?.(); }}
          style={{
            background: t.colors.surface.abyss,
            border: `1.5px solid ${t.colors.gold[400]}`,
            borderRadius: t.radius.pill,
            padding: compact ? '6px 12px' : '9px 18px',
            fontSize: compact ? 10 : 12,
            fontWeight: 900,
            color: t.colors.gold[400],
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            letterSpacing: t.type.tracking.wider,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export default JackpotBanner;
