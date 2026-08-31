import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import './c7-animations.css';

export type GameBadge = 'HOT' | 'NEW' | 'JACKPOT' | 'EXCLUSIVE' | null;

export interface CasinoCardProps {
  name: string;
  provider?: string;
  /** Emoji or single character to render in the center (fallback when no image) */
  emoji?: string;
  /** Optional image URL — overrides emoji if provided */
  imageUrl?: string;
  /** Background tint overlay color (rgba recommended) */
  tint?: string;
  /** Badge type, shown in top-left corner */
  badge?: GameBadge;
  /** Players currently online (rendered as live indicator if > 0) */
  playersOnline?: number;
  /** Whether the user has favorited this game */
  favorited?: boolean;
  /** Animation index for staggered entrance */
  index?: number;
  /** Click handler — plays click sound + invokes prop */
  onClick?: () => void;
  /** Toggle favorite handler */
  onToggleFavorite?: () => void;
}

const badgeConfig: Record<NonNullable<GameBadge>, { bg: string; glow: string; color: string }> = {
  HOT:       { bg: 'linear-gradient(135deg,#ef2a4c,#ff6b35)', glow: '0 0 12px rgba(239,42,76,0.6)', color: '#fff' },
  NEW:       { bg: 'linear-gradient(135deg,#ffc935,#e0a81f)', glow: '0 0 12px rgba(255, 201, 53,0.6)', color: '#04060a' },
  JACKPOT:   { bg: 'linear-gradient(135deg,#ffc940,#fbbf24)', glow: '0 0 16px rgba(255,201,64,0.75)', color: '#04060a' },
  EXCLUSIVE: { bg: 'linear-gradient(135deg,#a78bfa,#7c3aed)', glow: '0 0 12px rgba(167,139,250,0.6)', color: '#fff' },
};

export function CasinoCard({
  name,
  provider,
  emoji = '🎰',
  imageUrl,
  tint = 'rgba(255, 201, 53,0.14)',
  badge = null,
  playersOnline,
  favorited = false,
  index = 0,
  onClick,
  onToggleFavorite,
}: CasinoCardProps) {
  const { play } = useSound();

  const handleClick = () => {
    play('buttonClick');
    onClick?.();
  };

  const handleFav: React.MouseEventHandler = (e) => {
    e.stopPropagation();
    play('buttonClick');
    onToggleFavorite?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      className="c7-card c7-game"
      style={{
        animationDelay: `${index * 0.04}s`,
        position: 'relative',
        borderRadius: t.radius.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        background: t.colors.surface.elevated,
        border: `1px solid ${t.colors.border.soft}`,
        minHeight: 124,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: t.shadow.card,
        outline: 'none',
      }}
    >
      {/* Background image or tint */}
      {imageUrl ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: tint }} />

      {/* Hover/idle dark gradient at bottom for legibility */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 56,
          background: 'linear-gradient(180deg, transparent 0%, rgba(4,6,10,0.85) 100%)',
        }}
      />

      {/* Emoji icon */}
      {!imageUrl && (
        <div
          style={{
            position: 'relative',
            fontSize: 40,
            filter: 'drop-shadow(0 2px 8px rgba(255, 201, 53,0.3))',
            marginBottom: 6,
          }}
        >
          {emoji}
        </div>
      )}

      {/* Name + provider */}
      <div
        style={{
          position: 'relative',
          fontSize: 10,
          fontWeight: 800,
          color: t.colors.text.primary,
          textAlign: 'center',
          padding: '0 4px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </div>
      {provider && (
        <div
          style={{
            position: 'relative',
            fontSize: 9,
            color: t.colors.aqua[500],
            fontWeight: 700,
            letterSpacing: t.type.tracking.wide,
            marginTop: 2,
          }}
        >
          {provider}
        </div>
      )}

      {/* Badge */}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            ...((() => {
              const b = badgeConfig[badge];
              return {
                background: b.bg,
                color: b.color,
                boxShadow: b.glow,
              };
            })()),
            fontSize: 8,
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 900,
            letterSpacing: t.type.tracking.wide,
          }}
        >
          {badge}
        </div>
      )}

      {/* Favorite button */}
      <button
        type="button"
        onClick={handleFav}
        aria-label={favorited ? 'Unfavorite' : 'Favorite'}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: '50%',
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          border: `1px solid ${favorited ? t.colors.ruby[500] : t.colors.border.aqua}`,
          color: favorited ? t.colors.ruby[500] : t.colors.text.primary,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        ♥
      </button>

      {/* Players online */}
      {typeof playersOnline === 'number' && playersOnline > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 9,
            fontWeight: 700,
            color: t.colors.emerald[500],
            background: 'rgba(4,6,10,0.7)',
            padding: '2px 6px',
            borderRadius: 8,
            border: `1px solid ${t.colors.emerald[500]}55`,
          }}
        >
          <span
            className="c7-pulse-live"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: t.colors.emerald[500],
              boxShadow: t.glow.emerald,
            }}
          />
          {playersOnline.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default CasinoCard;
