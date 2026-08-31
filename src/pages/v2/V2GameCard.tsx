// V2GameCard — premium card for a real C74 Casino catalog game.
//
// Presentational: renders the game's art (admin-bound game.<uid> → bundled icon
// → CDN thumbnail on error → placeholder), a synthetic badge, the C74 provider
// chip, and a presentational RTP. Tapping calls onPlay — the launcher reuses the
// existing launchProviderGame flow. Card styles come from the shared v2CardCss
// (injected once per page). The `size` prop selects the R2 hierarchy variant
// (hero spotlight · normal reel card · mini dense-grid card) — CSS-only.

import { gameArt, rtpOf, type CatalogGame, type V2Badge } from "./v2catalog";
import V2GameArt from "./V2GameArt";

export type V2CardSize = "hero" | "normal" | "mini";

const BADGE_TONE: Record<V2Badge, string> = {
  HOT: "linear-gradient(180deg,#7ff0c0,#37e29a)",      // bright emerald
  NEW: "linear-gradient(180deg,#37e29a,#0a5638)",      // deep jade
  JACKPOT: "linear-gradient(180deg,#ffe79a,#d4a017)",  // rich gold — premium apex
};

export default function V2GameCard({
  game, assets, badge, index = 0, size = "normal", onPlay,
}: {
  game: CatalogGame;
  assets: Record<string, string>;
  badge?: V2Badge;
  index?: number;
  size?: V2CardSize;
  onPlay: (g: CatalogGame) => void;
}) {
  return (
    <button type="button" aria-label={game.name} className={`v2c${size !== "normal" ? ` v2c--${size}` : ""}`} style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }} onClick={() => onPlay(game)}>
      {badge && (assets[`v2.badge.${badge.toLowerCase()}`]
        ? <img className="v2c-badge v2c-badge--img" src={assets[`v2.badge.${badge.toLowerCase()}`]} alt={badge} loading="lazy" />
        : <span className="v2c-badge" style={{ background: BADGE_TONE[badge], color: badge === "HOT" ? "#fff" : "#2a1608" }}>{badge}</span>
      )}
      <span className="v2c-rtp">RTP {rtpOf(game.uid)}%</span>
      {/* Procedural 2D art — the base layer; the image (bound art / CDN thumb)
          paints on top when present, and this shows through when it's absent. */}
      <V2GameArt game={game} />
      <img
        className="v2c-img"
        src={gameArt(assets, game.uid)}
        alt={game.name}
        loading="lazy"
        onError={(e) => {
          const t = e.currentTarget;
          if (!t.dataset.f && game.thumbnail) { t.dataset.f = "1"; t.src = game.thumbnail; }
          else { t.style.display = "none"; } // fall through to the procedural art beneath
        }}
      />
      <div className="v2c-gloss" aria-hidden="true" />
      <div className="v2c-foot">
        {/* game name lives in the art itself — keep only the C74/provider meta */}
        <span className="v2c-meta"><span className="v2c-2j">C74</span> {game.provider}</span>
      </div>
    </button>
  );
}
