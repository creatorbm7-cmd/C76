import { c7Theme as t } from '@/theme/c7-sun27-compat';
import './c7-animations.css';

export interface LeaderEntry {
  /** Display name (will be masked if `mask` prop is true) */
  username: string;
  /** Total winnings or current period winnings */
  amount: number;
  /** Optional avatar emoji/initial */
  avatar?: string;
  /** VIP tier — colors avatar border */
  tier?: keyof typeof t.vipTier;
  /** Optional country flag emoji */
  country?: string;
}

export interface LeaderboardProps {
  entries: LeaderEntry[];
  /** Mask usernames as "abc***xyz" */
  mask?: boolean;
  /** Title above the table */
  title?: string;
  /** Subtitle / period (e.g. "This Week") */
  subtitle?: string;
  /** Currency symbol prefix */
  currency?: string;
  /** Max entries to render */
  limit?: number;
  /** Click handler for entries */
  onEntryClick?: (entry: LeaderEntry, rank: number) => void;
}

const RANK_BADGES: Record<number, { bg: string; glow: string; icon: string; color: string }> = {
  1: { bg: 'linear-gradient(135deg,#ffc940,#fbbf24)', glow: '0 0 20px rgba(255,201,64,0.8)', icon: '👑', color: '#04060a' },
  2: { bg: 'linear-gradient(135deg,#e5e7eb,#9ca3af)', glow: '0 0 16px rgba(229,231,235,0.6)', icon: '🥈', color: '#04060a' },
  3: { bg: 'linear-gradient(135deg,#cd7f32,#a0522d)', glow: '0 0 14px rgba(205,127,50,0.6)', icon: '🥉', color: '#04060a' },
};

function maskName(name: string): string {
  if (name.length <= 4) return name[0] + '***';
  return name.slice(0, 2) + '***' + name.slice(-2);
}

export function Leaderboard({
  entries,
  mask = true,
  title = 'Top Winners',
  subtitle = 'This Week',
  currency = '$',
  limit = 10,
  onEntryClick,
}: LeaderboardProps) {
  const sliced = entries.slice(0, limit);

  const fmt = (n: number) =>
    currency + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <div
      style={{
        background: t.colors.surface.glass,
        backdropFilter: 'blur(14px)',
        borderRadius: t.radius.card,
        padding: '16px 14px',
        border: `1px solid ${t.colors.border.aqua}`,
        boxShadow: t.shadow.card,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              fontFamily: t.type.family.display,
              background: t.gradients.hero,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: t.type.tracking.wide,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 10,
                color: t.colors.text.tertiary,
                fontWeight: 700,
                letterSpacing: t.type.tracking.wider,
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div
          className="c7-pulse-live"
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: t.colors.emerald[500],
            background: 'rgba(255, 201, 53,0.12)',
            padding: '3px 8px',
            borderRadius: 10,
            border: `1px solid ${t.colors.emerald[500]}55`,
            letterSpacing: t.type.tracking.wider,
          }}
        >
          ● LIVE
        </div>
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sliced.map((e, i) => {
          const rank = i + 1;
          const badge = RANK_BADGES[rank];
          const tier = e.tier ? t.vipTier[e.tier] : null;
          const displayName = mask ? maskName(e.username) : e.username;
          const isTop3 = rank <= 3;

          return (
            <div
              key={`${e.username}-${i}`}
              className="c7-slide-in"
              role={onEntryClick ? 'button' : undefined}
              tabIndex={onEntryClick ? 0 : undefined}
              onClick={onEntryClick ? () => onEntryClick(e, rank) : undefined}
              onKeyDown={onEntryClick ? (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') onEntryClick(e, rank);
              } : undefined}
              style={{
                animationDelay: `${i * 0.05}s`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: isTop3
                  ? `linear-gradient(90deg, ${t.colors.surface.raised} 0%, transparent 100%)`
                  : t.colors.surface.raised,
                borderRadius: t.radius.md,
                border: `1px solid ${isTop3 ? t.colors.border.gold : t.colors.border.subtle}`,
                cursor: onEntryClick ? 'pointer' : 'default',
                transition: 'transform 0.18s, box-shadow 0.18s',
                boxShadow: isTop3 ? badge?.glow : 'none',
              }}
            >
              {/* Rank */}
              {badge ? (
                <div
                  className="c7-rank-pop"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: badge.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 900,
                    color: badge.color,
                    boxShadow: badge.glow,
                    flexShrink: 0,
                  }}
                >
                  {badge.icon}
                </div>
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: t.colors.surface.elevated,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 900,
                    color: t.colors.text.secondary,
                    border: `1px solid ${t.colors.border.subtle}`,
                    fontFamily: t.type.family.mono,
                    flexShrink: 0,
                  }}
                >
                  {rank}
                </div>
              )}

              {/* Avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: tier
                    ? `linear-gradient(135deg, ${tier.accent}55, ${tier.accent}aa)`
                    : t.gradients.cardGlass,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  color: t.colors.text.primary,
                  border: `1.5px solid ${tier ? tier.accent : t.colors.border.aqua}`,
                  boxShadow: tier ? tier.glow : 'none',
                  flexShrink: 0,
                }}
              >
                {e.avatar ?? displayName[0].toUpperCase()}
              </div>

              {/* Name + flag */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: t.colors.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {e.country && <span style={{ fontSize: 14 }}>{e.country}</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </span>
                </div>
                {tier && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: tier.accent,
                      letterSpacing: t.type.tracking.wider,
                      textTransform: 'uppercase',
                      marginTop: 1,
                    }}
                  >
                    {tier.label}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: isTop3 ? t.colors.gold[400] : t.colors.aqua[500],
                  fontFamily: t.type.family.mono,
                  textShadow: isTop3 ? t.glow.goldSm : 'none',
                  flexShrink: 0,
                }}
              >
                {fmt(e.amount)}
              </div>
            </div>
          );
        })}
        {sliced.length === 0 && (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: t.colors.text.tertiary,
              fontSize: 13,
            }}
          >
            No winners yet — be the first 🎰
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
