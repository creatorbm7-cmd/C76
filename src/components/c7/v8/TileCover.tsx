/**
 * TileCover — Cover image scaffold for game tiles.
 *
 * Picks the best available cover in priority order:
 *   1. Real image (if game has `cover: true`)
 *        - <picture> with <source> for AVIF + WebP + PNG fallback
 *        - Native lazy loading (loading="lazy") + async decode
 *        - On total failure, falls through to a scene or icon
 *   2. Premium SVG scene (if the game id has one registered in GameScenes)
 *   3. SVG icon (the existing GameIcon archetype, centered)
 *
 * Drop images into `/public/games/{id}.{avif|webp|png}` and set `cover: true`
 * on the game entry — they'll appear automatically on next build.
 */

import { useState } from 'react';
import GameIcon from './GameIcons';
import GameScene, { hasGameScene } from './GameScenes';

type Accent = 'aqua' | 'gold' | 'ruby' | 'emerald';

interface TileCoverProps {
  id: string;
  cover?: boolean;
  accent?: Accent;
}

// All cover assets live under /games/ in the public dir.
// Vite serves /public/games/* as /games/* in both dev and production.
const COVER_BASE = '/icons/games';

function ImageCover({ id, onFail }: { id: string; onFail: () => void }) {
  return (
    <picture style={{ display: 'block', width: '100%', height: '100%' }}>
      <source srcSet={`${COVER_BASE}/${id}.avif`} type="image/avif" />
      <source srcSet={`${COVER_BASE}/${id}.webp`} type="image/webp" />
      <img
        src={`${COVER_BASE}/${id}.png`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={onFail}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </picture>
  );
}

function IconFallback({ id, accent }: { id: string; accent?: Accent }) {
  // Icon centered in the upper portion of the tile, with a soft radial bg.
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: 28,
        background:
          'radial-gradient(60% 50% at 50% 38%, rgba(255,255,255,0.04), transparent 70%)',
      }}
    >
      <div style={{ width: 64, height: 64 }}>
        <GameIcon id={id} accent={accent} />
      </div>
    </div>
  );
}

export default function TileCover({ id, cover, accent }: TileCoverProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (cover && !imgFailed) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <ImageCover id={id} onFail={() => setImgFailed(true)} />
      </div>
    );
  }
  if (hasGameScene(id)) {
    return <GameScene id={id} />;
  }
  return <IconFallback id={id} accent={accent} />;
}
