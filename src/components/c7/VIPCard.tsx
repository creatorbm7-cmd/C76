import { c7Theme as t } from '@/theme/c7-sun27-compat';
import './c7-animations.css';

export type VipTierKey = keyof typeof t.vipTier;

export interface VIPCardProps {
  /** Current tier — drives accent color, glow, and icon */
  tier: VipTierKey;
  /** User's display name */
  username?: string;
  /** Total amount wagered to-date */
  wagered: number;
  /** Total wager required to reach the next tier */
  nextTierAt: number;
  /** Optional explicit next-tier label override (otherwise derived from tier order) */
  nextTier?: VipTierKey;
  /** List of perks active for this tier */
  perks?: string[];
  /** Cashback percentage to highlight */
  cashbackPct?: number;
  /** Daily reward amount */
  dailyReward?: number;
  /** Click handler for "Claim Perks" CTA */
  onClaim?: () => void;
}

const TIER_ORDER: VipTierKey[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const TIER_ICONS: Record<VipTierKey, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🏆',
  platinum: '💠',
  diamond: '💎',
};

const DEFAULT_PERKS: Record<VipTierKey, string[]> = {
  bronze:   ['1% cashback', 'Daily $0.50 reward', 'Standard support'],
  silver:   ['3% cashback', 'Daily $2 reward', 'Priority support', 'Weekly bonus'],
  gold:     ['5% cashback', 'Daily $5 reward', 'VIP support', 'Birthday bonus', 'Exclusive tournaments'],
  platinum: ['8% cashback', 'Daily $15 reward', '24/7 dedicated host', 'Monthly $500 bonus', 'Custom limits'],
  diamond:  ['12% cashback', 'Daily $50 reward', 'Personal account manager', 'Private high-stakes tables', 'Luxury gifts'],
};

export function VIPCard({
  tier,
  username,
  wagered,
  nextTierAt,
  nextTier: nextTierProp,
  perks,
  cashbackPct,
  dailyReward,
  onClaim,
}: VIPCardProps) {
  const tierInfo = t.vipTier[tier];
  const idx = TIER_ORDER.indexOf(tier);
  const nextTier = nextTierProp ?? (idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null);
  const nextTierInfo = nextTier ? t.vipTier[nextTier] : null;

  const progress = Math.min(100, (wagered / nextTierAt) * 100);
  const remaining = Math.max(0, nextTierAt - wagered);

  const fmt = (n: number) =>
    '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const activePerks = perks ?? DEFAULT_PERKS[tier];

  return (
    <div
      className="c7-card"
      style={{
        position: 'relative',
        background: t.colors.surface.glass,
        backdropFilter: 'blur(14px)',
        borderRadius: t.radius.card,
        padding: '18px 16px 16px',
        border: `1.5px solid ${tierInfo.accent}55`,
        boxShadow: `${tierInfo.glow}, ${t.shadow.card}`,
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient orb */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          background: `radial-gradient(circle, ${tierInfo.accent}33 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header: tier badge + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position: 'relative' }}>
        <div
          className="c7-float"
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${tierInfo.accent}aa, ${tierInfo.accent}55)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            border: `2px solid ${tierInfo.accent}`,
            boxShadow: tierInfo.glow,
            flexShrink: 0,
          }}
        >
          {TIER_ICONS[tier]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {username && (
            <div
              style={{
                fontSize: 11,
                color: t.colors.text.tertiary,
                fontWeight: 700,
                letterSpacing: t.type.tracking.wide,
                marginBottom: 2,
              }}
            >
              {username}
            </div>
          )}
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: tierInfo.accent,
              fontFamily: t.type.family.display,
              letterSpacing: t.type.tracking.wider,
              textShadow: `0 0 16px ${tierInfo.accent}66`,
            }}
          >
            {tierInfo.label}
          </div>
          <div
            style={{
              fontSize: 10,
              color: t.colors.text.tertiary,
              letterSpacing: t.type.tracking.widest,
              fontWeight: 700,
              marginTop: 1,
            }}
          >
            VIP TIER
          </div>
        </div>

        {/* Cashback highlight */}
        {typeof cashbackPct === 'number' && (
          <div
            style={{
              textAlign: 'right',
              padding: '4px 10px',
              background: t.colors.surface.elevated,
              border: `1px solid ${t.colors.border.aqua}`,
              borderRadius: t.radius.md,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: t.colors.aqua[500],
                fontFamily: t.type.family.mono,
                lineHeight: 1,
              }}
            >
              {cashbackPct}%
            </div>
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: t.colors.text.tertiary,
                letterSpacing: t.type.tracking.wider,
                marginTop: 2,
              }}
            >
              CASHBACK
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {nextTierInfo && (
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontSize: 11,
              marginBottom: 6,
            }}
          >
            <span style={{ color: t.colors.text.secondary, fontWeight: 700 }}>
              Progress to <strong style={{ color: nextTierInfo.accent }}>{nextTierInfo.label}</strong>
            </span>
            <span
              style={{
                color: t.colors.gold[400],
                fontWeight: 800,
                fontFamily: t.type.family.mono,
              }}
            >
              {fmt(wagered)} / {fmt(nextTierAt)}
            </span>
          </div>
          <div
            style={{
              position: 'relative',
              height: 10,
              background: t.colors.surface.abyss,
              borderRadius: 10,
              overflow: 'hidden',
              border: `1px solid ${t.colors.border.subtle}`,
            }}
          >
            <div
              className="c7-shimmer"
              style={{
                width: `${progress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${tierInfo.accent} 0%, ${nextTierInfo.accent} 100%)`,
                borderRadius: 10,
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: `0 0 12px ${tierInfo.accent}88`,
              }}
            />
          </div>
          {remaining > 0 && (
            <div
              style={{
                fontSize: 10,
                color: t.colors.text.tertiary,
                marginTop: 6,
                textAlign: 'right',
              }}
            >
              {fmt(remaining)} wagered to unlock {nextTierInfo.label}
            </div>
          )}
        </div>
      )}

      {/* Quick stats row */}
      {(typeof dailyReward === 'number' || typeof cashbackPct === 'number') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,1fr)',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {typeof dailyReward === 'number' && (
            <div
              style={{
                background: t.colors.surface.elevated,
                borderRadius: t.radius.md,
                padding: '10px 12px',
                border: `1px solid ${t.colors.border.subtle}`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: t.colors.text.tertiary,
                  fontWeight: 700,
                  letterSpacing: t.type.tracking.wider,
                }}
              >
                DAILY REWARD
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: t.colors.gold[400],
                  fontFamily: t.type.family.mono,
                  marginTop: 2,
                }}
              >
                {fmt(dailyReward)}
              </div>
            </div>
          )}
          <div
            style={{
              background: t.colors.surface.elevated,
              borderRadius: t.radius.md,
              padding: '10px 12px',
              border: `1px solid ${t.colors.border.subtle}`,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: t.colors.text.tertiary,
                fontWeight: 700,
                letterSpacing: t.type.tracking.wider,
              }}
            >
              TOTAL WAGERED
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 900,
                color: t.colors.aqua[500],
                fontFamily: t.type.family.mono,
                marginTop: 2,
              }}
            >
              {fmt(wagered)}
            </div>
          </div>
        </div>
      )}

      {/* Perks list */}
      <div style={{ marginBottom: onClaim ? 14 : 0 }}>
        <div
          style={{
            fontSize: 10,
            color: t.colors.text.tertiary,
            fontWeight: 800,
            letterSpacing: t.type.tracking.widest,
            marginBottom: 8,
          }}
        >
          YOUR PERKS
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {activePerks.map((perk, i) => (
            <li
              key={i}
              className="c7-slide-in"
              style={{
                animationDelay: `${0.1 + i * 0.06}s`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: t.colors.text.secondary,
                padding: '6px 10px',
                background: t.colors.surface.raised,
                borderRadius: t.radius.sm,
                border: `1px solid ${t.colors.border.subtle}`,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: tierInfo.accent,
                  boxShadow: `0 0 6px ${tierInfo.accent}`,
                  flexShrink: 0,
                }}
              />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      {onClaim && (
        <button
          className="c7-btn c7-glow-pulse"
          onClick={onClaim}
          style={{
            width: '100%',
            padding: '12px 0',
            background: `linear-gradient(135deg, ${tierInfo.accent}, ${tierInfo.accent}cc)`,
            border: 'none',
            borderRadius: t.radius.pill,
            fontSize: 14,
            fontWeight: 900,
            color: '#04060a',
            cursor: 'pointer',
            letterSpacing: t.type.tracking.wider,
            fontFamily: t.type.family.display,
          }}
        >
          CLAIM PERKS
        </button>
      )}
    </div>
  );
}

export default VIPCard;
