/**
 * HeroRotator — V8 Featured Game Carousel
 *
 * Replaces the 3 stacked HeroGameCards with a single auto-rotating premium card.
 *   - 3 slides: Crash · Mines · Plinko (the playable trio)
 *   - Auto-advance every 6s, pauses on touch/hover
 *   - Swipe left/right on mobile
 *   - Dot indicators with progress fill
 *   - Per-slide accent (aqua / gold / emerald) drives the entire palette
 *   - Live stats row: Players online · RTP · Biggest Win · Jackpot
 *   - PLAY CTA navigates to /casino/{game}
 *   - Numbers tick subtly to feel live (no backend required)
 *
 * One UI UNO V3 — 22px rounding, deep glass, mesh accent, generous spacing.
 * V8 HDR Forest — radial mesh, edge highlight, soft halo behind game art.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import GameIcon from './GameIcons';

// ─────────────────────────────────────────────────────────────────────────────
// Slide data
// ─────────────────────────────────────────────────────────────────────────────
type SlideAccent = 'aqua' | 'gold' | 'emerald';

interface Slide {
  id: 'crash' | 'mines' | 'plinko';
  name: string;
  tag: string;       // 1-line tagline
  route: string;
  accent: SlideAccent;
  // base stats — small drift applied per-tick
  players: number;
  rtp: number;       // %
  biggest: number;   // USDT
  jackpot: number;   // USDT
}

const SLIDES: Slide[] = [
  {
    id: 'crash', name: 'Crash', tag: 'Cash out before it crashes',
    route: '/casino/crash', accent: 'aqua',
    players: 1247, rtp: 97.0, biggest: 18420, jackpot: 84200,
  },
  {
    id: 'mines', name: 'Mines', tag: "Pick the safe tiles, dodge the bombs",
    route: '/casino/mines', accent: 'gold',
    players: 892, rtp: 97.5, biggest: 12660, jackpot: 41800,
  },
  {
    id: 'plinko', name: 'Plinko', tag: 'Drop the ball, ride the multipliers',
    route: '/casino/plinko', accent: 'emerald',
    players: 1108, rtp: 96.5, biggest: 9340, jackpot: 27600,
  },
];

const ROTATE_MS = 6000;

// ─────────────────────────────────────────────────────────────────────────────
// Accent helpers
// ─────────────────────────────────────────────────────────────────────────────
function accentToken(a: SlideAccent) {
  switch (a) {
    case 'gold':    return { main: t.colors.gold[400],    glow: t.colors.gold.glow,    soft: t.colors.gold.glowSoft,    text: t.colors.surface.abyss };
    case 'emerald': return { main: t.colors.emerald[500], glow: t.colors.emerald.glow, soft: 'rgba(255, 201, 53,.18)',    text: t.colors.surface.abyss };
    case 'aqua':
    default:        return { main: t.colors.aqua[500],    glow: t.colors.aqua.glow,    soft: t.colors.aqua.glowSoft,    text: t.colors.surface.abyss };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes hr-slide-in  { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes hr-fill      { from { width: 0%; } to { width: 100%; } }
@keyframes hr-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
@keyframes hr-shimmer   { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

.hr-wrap {
  position: relative;
  padding: 0 16px;
  margin-bottom: 18px;
}

.hr-card {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid ${t.colors.border.soft};
  background:
    radial-gradient(120% 80% at 20% 0%, var(--hr-glow) 0%, transparent 55%),
    radial-gradient(100% 80% at 100% 100%, var(--hr-soft) 0%, transparent 50%),
    linear-gradient(160deg, rgba(30,42,68,.7) 0%, rgba(10,15,28,.92) 100%);
  box-shadow:
    0 18px 40px rgba(0,0,0,.45),
    0 0 0 1px var(--hr-edge) inset;
  isolation: isolate;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.hr-card::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--hr-main), transparent);
  opacity: .85; z-index: 1;
}

.hr-slide {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 18px 16px 14px;
  align-items: start;
  animation: hr-slide-in .42s ease-out both;
}

.hr-meta {
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0;
}

.hr-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 900; letter-spacing: 2.2px;
  text-transform: uppercase;
  color: var(--hr-main);
  opacity: .95;
}
.hr-label-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--hr-main); animation: hr-pulse-dot 1.3s ease-in-out infinite; box-shadow: 0 0 8px var(--hr-main); }

.hr-name {
  font-size: 32px; font-weight: 900; letter-spacing: -0.5px;
  color: ${t.colors.text.primary};
  margin: 2px 0 0;
  line-height: 1;
}

.hr-tag {
  font-size: 12px; font-weight: 600;
  color: ${t.colors.text.secondary};
  letter-spacing: .1px;
}

.hr-art {
  width: 88px; height: 88px;
  border-radius: 16px;
  background: radial-gradient(60% 60% at 50% 40%, var(--hr-soft), transparent 75%);
  display: flex; align-items: center; justify-content: center;
}
.hr-art > div { width: 76px !important; height: 76px !important; max-width:76px !important; max-height:76px !important; }

.hr-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 0 14px 14px;
}
.hr-stat {
  background: rgba(4,6,10,.5);
  border: 1px solid ${t.colors.border.subtle};
  border-radius: 12px;
  padding: 8px 6px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  text-align: center;
}
.hr-stat-val {
  font-size: 13px; font-weight: 900;
  color: ${t.colors.text.primary};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  line-height: 1.05;
}
.hr-stat-val-accent { color: var(--hr-main); }
.hr-stat-label {
  font-size: 8.5px; font-weight: 800;
  color: ${t.colors.text.tertiary};
  letter-spacing: 1.2px;
  text-transform: uppercase;
  line-height: 1;
}

.hr-cta-row {
  display: flex; align-items: center; gap: 10px;
  padding: 0 14px 14px;
}

.hr-cta {
  flex: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 16px;
  border: none;
  border-radius: 14px;
  font-size: 13px; font-weight: 900; letter-spacing: 1.4px;
  text-transform: uppercase;
  background: linear-gradient(135deg, var(--hr-main) 0%, ${t.colors.gold[400]} 100%);
  color: var(--hr-text);
  cursor: pointer;
  box-shadow: 0 8px 24px var(--hr-soft), 0 0 0 1px rgba(255,255,255,.1) inset;
  transition: transform .15s ease, box-shadow .15s ease;
  -webkit-tap-highlight-color: transparent;
}
.hr-cta:active { transform: scale(.97); }
.hr-cta-shine {
  background-image: linear-gradient(90deg, transparent 30%, rgba(255,255,255,.4) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: hr-shimmer 2.8s linear infinite;
}

.hr-dots {
  display: flex; gap: 6px; align-items: center;
  padding: 4px 4px;
}
.hr-dot {
  position: relative;
  width: 22px; height: 5px;
  border-radius: 999px;
  background: rgba(255,255,255,.14);
  cursor: pointer;
  overflow: hidden;
  border: none;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.hr-dot[data-active="true"] {
  background: rgba(255,255,255,.22);
}
.hr-dot-fill {
  position: absolute; top: 0; left: 0; bottom: 0;
  background: var(--hr-main);
  width: 0%;
}
.hr-dot[data-active="true"] .hr-dot-fill {
  animation: hr-fill ${ROTATE_MS}ms linear forwards;
}
.hr-dot[data-paused="true"] .hr-dot-fill {
  animation-play-state: paused;
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Number formatters
// ─────────────────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  if (n >= 1000) return `${(n/1000).toFixed(1)}K 🪙`;
  return `${n.toFixed(0)} 🪙`;
}
function fmtPlayers(n: number) {
  if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
  return `${n}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroRotator() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0); // drives the live-number drift
  const touchStartX = useRef<number | null>(null);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [idx, paused]);

  // Live-number drift — small bounce every 2.5s
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 2500);
    return () => window.clearInterval(id);
  }, []);

  const slide = SLIDES[idx];
  const a = useMemo(() => accentToken(slide.accent), [slide.accent]);

  // Pseudo-live numbers: deterministic small drift on every tick
  const drift = useMemo(() => {
    const r = (seed: number) => {
      const x = Math.sin(seed * 9301 + tick * 49297) * 233280;
      return x - Math.floor(x);
    };
    return {
      players: slide.players + Math.floor(r(1) * 60 - 30),
      jackpot: slide.jackpot + Math.floor(r(2) * 1200),
      biggest: slide.biggest + Math.floor(r(3) * 400),
    };
  }, [slide, tick]);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) { setPaused(false); return; }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      setIdx((i) => (i + (dx < 0 ? 1 : -1) + SLIDES.length) % SLIDES.length);
    }
    // Resume after a beat
    window.setTimeout(() => setPaused(false), 200);
  };

  const styleVars: React.CSSProperties = {
    // CSS custom properties typed loosely
    ['--hr-main' as any]: a.main,
    ['--hr-glow' as any]: a.glow,
    ['--hr-soft' as any]: a.soft,
    ['--hr-edge' as any]: 'rgba(255,255,255,.06)',
    ['--hr-text' as any]: a.text,
  };

  return (
    <section className="hr-wrap" aria-label="Featured game" style={styleVars}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div
        className="hr-card"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => navigate(slide.route)}
        role="button"
        aria-label={`Play ${slide.name}`}
      >
        {/* SLIDE — re-mounted on idx change for fade-in animation */}
        <div className="hr-slide" key={slide.id}>
          <div className="hr-meta">
            <span className="hr-label">
              <span className="hr-label-dot" />
              Featured
            </span>
            <h2 className="hr-name">{slide.name}</h2>
            <p className="hr-tag">{slide.tag}</p>
          </div>
          <div className="hr-art">
            <GameIcon id={slide.id} accent={slide.accent} />
          </div>
        </div>

        {/* STATS */}
        <div className="hr-stats">
          <div className="hr-stat">
            <span className="hr-stat-val hr-stat-val-accent">
              <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:t.colors.status.online, marginRight:4, verticalAlign:'middle', animation:'hr-pulse-dot 1.3s ease-in-out infinite' }} />
              {fmtPlayers(drift.players)}
            </span>
            <span className="hr-stat-label">Playing</span>
          </div>
          <div className="hr-stat">
            <span className="hr-stat-val">{slide.rtp.toFixed(1)}%</span>
            <span className="hr-stat-label">RTP</span>
          </div>
          <div className="hr-stat">
            <span className="hr-stat-val">{fmtMoney(drift.biggest)}</span>
            <span className="hr-stat-label">Top Win</span>
          </div>
          <div className="hr-stat">
            <span className="hr-stat-val hr-stat-val-accent">{fmtMoney(drift.jackpot)}</span>
            <span className="hr-stat-label">Jackpot</span>
          </div>
        </div>

        {/* CTA + DOTS */}
        <div className="hr-cta-row" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="hr-cta hr-cta-shine"
            onClick={() => navigate(slide.route)}
            aria-label={`Play ${slide.name} now`}
          >
            ▶ Play {slide.name}
          </button>
          <div className="hr-dots" role="tablist" aria-label="Featured games">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="hr-dot"
                data-active={i === idx}
                data-paused={paused}
                onClick={() => setIdx(i)}
                aria-label={`Show ${s.name}`}
                aria-selected={i === idx}
                role="tab"
              >
                <span className="hr-dot-fill" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
