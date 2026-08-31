import { useState } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import './c7-animations.css';

export interface LiveHeaderProps {
  /** Display balance in 🪙 C7 Coins (no symbol — added automatically) */
  balance?: number;
  /** Number of unread notifications (shows badge if > 0) */
  notifications?: number;
  /** Username initial for avatar */
  userInitial?: string;
  /** User VIP tier (changes avatar border) */
  vipTier?: keyof typeof t.vipTier;
  /** Show live online count next to logo */
  liveCount?: number;
  /** Callback when balance + button is clicked */
  onDeposit?: () => void;
  /** Callback when notification bell is clicked */
  onNotifications?: () => void;
  /** Callback when avatar is clicked */
  onProfile?: () => void;
  /** Sticky position the header */
  sticky?: boolean;
}

export function LiveHeader({
  balance = 0,
  notifications = 0,
  userInitial = 'U',
  vipTier,
  liveCount,
  onDeposit,
  onNotifications,
  onProfile,
  sticky = false,
}: LiveHeaderProps) {
  const { play } = useSound();
  const tier = vipTier ? t.vipTier[vipTier] : null;
  const [bellPing, setBellPing] = useState(false);

  const fmt = (n: number) =>
    Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' 🪙';

  const click = (fn?: () => void) => () => {
    play('buttonClick');
    fn?.();
  };

  return (
    <header
      style={{
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 0 : 'auto',
        zIndex: t.layer.sticky,
        background: t.colors.surface.abyss,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${t.colors.border.aqua}`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Brand + live count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            fontFamily: t.type.family.display,
            letterSpacing: t.type.tracking.wider,
          }}
        >
          <span
            style={{
              background: t.gradients.hero,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            C7
          </span>
          <span style={{ color: t.colors.gold[400] }}>Winner</span>
        </div>

        {typeof liveCount === 'number' && (
          <div
            className="c7-pulse-live"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 800,
              color: t.colors.emerald[500],
              background: 'rgba(255, 201, 53,0.12)',
              padding: '3px 8px',
              borderRadius: 10,
              border: `1px solid ${t.colors.emerald[500]}55`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: t.colors.emerald[500],
                boxShadow: t.glow.emerald,
              }}
            />
            {liveCount.toLocaleString()} online
          </div>
        )}
      </div>

      {/* Right cluster: balance + bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              fontFamily: t.type.family.mono,
              color: t.colors.gold[400],
            }}
          >
            {fmt(balance)}
          </div>
          <div style={{ fontSize: 9, color: t.colors.aqua[500], fontWeight: 700 }}>
            🪙 C7 COINS
          </div>
        </div>

        <button
          className="c7-btn"
          onClick={click(onDeposit)}
          aria-label="Claim daily bonus"
          style={{
            background: t.gradients.aquaBar,
            border: 'none',
            borderRadius: 10,
            width: 32,
            height: 32,
            fontSize: 18,
            cursor: 'pointer',
            fontWeight: 900,
            color: t.colors.text.onAccent,
            boxShadow: t.glow.aquaSm,
          }}
        >
          +
        </button>

        {/* Notification bell */}
        <button
          className="c7-btn"
          onClick={() => {
            play('notification');
            setBellPing(true);
            setTimeout(() => setBellPing(false), 600);
            onNotifications?.();
          }}
          aria-label={`${notifications} notifications`}
          style={{
            position: 'relative',
            background: t.colors.surface.elevated,
            border: `1px solid ${t.colors.border.soft}`,
            borderRadius: 10,
            width: 36,
            height: 36,
            cursor: 'pointer',
            fontSize: 16,
            color: t.colors.text.primary,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              transform: bellPing ? 'rotate(-18deg)' : 'rotate(0deg)',
            }}
          >
            🔔
          </span>
          {notifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: t.colors.ruby[500],
                color: t.colors.text.primary,
                fontSize: 9,
                fontWeight: 900,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: t.glow.ruby,
                border: `1.5px solid ${t.colors.surface.abyss}`,
              }}
            >
              {notifications > 99 ? '99+' : notifications}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button
          className="c7-btn"
          onClick={click(onProfile)}
          aria-label="Profile"
          style={{
            background: t.colors.surface.elevated,
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            border: `1.5px solid ${tier ? tier.accent : t.colors.border.aqua}`,
            color: tier ? tier.accent : t.colors.aqua[500],
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: tier ? tier.glow : 'none',
          }}
        >
          {userInitial}
        </button>
      </div>
    </header>
  );
}

export default LiveHeader;
