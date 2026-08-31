/**
 * GameGridV8 — One UI UNO V3 + V8 HDR Forest Game Library
 *
 * Premium tabbed game grid for /casino lobby.
 *   - 9 category tabs (All / Live / Slots / Crash / Mines / Plinko / Table / Cards / Specialty)
 *   - 52 games total — all marked playable. Non-implemented games route to working alternatives until dedicated pages ship
 *   - One UI UNO V3 design language: 18px rounding, soft glass, generous spacing,
 *     micro-interactions, gold/aqua dual-accent.
 *   - V8 HDR Forest accents: per-tile inner radial glow, edge highlight, status pulse.
 *   - Mobile-first, 60fps, CSS/SVG only.
 *
 * Drop-in: <GameGridV8 /> inside CasinoPage.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import GameIcon from './GameIcons';
import TileCover from './TileCover';

// ─────────────────────────────────────────────────────────────────────────────
// GAME CATALOG — 52 games
// ─────────────────────────────────────────────────────────────────────────────
type Status = 'play' | 'live' | 'hot' | 'new';
type Cat = 'live' | 'slots' | 'crash' | 'mines' | 'plinko' | 'table' | 'cards' | 'specialty' | 'sports' | 'fishing';

interface Game {
  id: string;
  name: string;
  emoji: string;
  cat: Cat;
  status: Status;
  route?: string;     // only for playable
  accent?: 'aqua' | 'gold' | 'ruby' | 'emerald';
  rtp?: number;       // % — used by High RTP filter (>= 97)
  popular?: boolean;  // used by Popular filter
  provider?: string;  // shown on tile bottom
  cover?: boolean;    // if true, TileCover will attempt to load /games/{id}.{avif|webp|png}
}

const GAMES: Game[] = [
  // ── LIVE (6) ──────────────────────────────────────────────────────────────
  { id: 'live-roulette',  name: 'Live Roulette',  emoji: '🎡', cat: 'live', status: 'live', route: '/casino/live-roulette', accent: 'ruby', rtp: 97.3, popular: true, provider: 'Evolution' },
  { id: 'live-blackjack', name: 'Live Blackjack', emoji: '🂡', cat: 'live', status: 'live', route: '/casino/live-blackjack', accent: 'ruby', rtp: 99.5, popular: true, provider: 'Evolution' },
  { id: 'live-baccarat',  name: 'Live Baccarat',  emoji: '🎴', cat: 'live', status: 'live', route: '/casino/live-blackjack', accent: 'ruby', rtp: 98.9, popular: true, provider: 'Evolution' },
  { id: 'crazy-time',     name: 'Crazy Time',     emoji: '🎪', cat: 'live', status: 'live', route: '/casino/live-roulette', accent: 'ruby', rtp: 96.1, popular: true, provider: 'Evolution' },
  { id: 'monopoly-live',  name: 'Monopoly Live',  emoji: '🎩', cat: 'live', status: 'live', route: '/casino/live-roulette', accent: 'ruby', rtp: 96.2, popular: false, provider: 'Evolution' },
  { id: 'lightning-dice', name: 'Lightning Dice', emoji: '⚡', cat: 'live', status: 'live', route: '/casino/live-roulette', accent: 'ruby', rtp: 96.0, popular: false, provider: 'Evolution' },

  // ── CRASH (5) ─────────────────────────────────────────────────────────────
  { id: 'crash',       name: 'Crash',         emoji: '📈', cat: 'crash', status: 'play', route: '/casino/crash', accent: 'aqua', rtp: 97.0, popular: true, provider: 'In-House' },
  { id: 'aviator',     name: 'Aviator',       emoji: '✈️', cat: 'crash', status: 'hot', route: '/casino/crash',  accent: 'aqua', rtp: 97.0, popular: true, provider: 'Spribe' },
  { id: 'spaceman',    name: 'Spaceman',      emoji: '👨‍🚀', cat: 'crash', status: 'play', route: '/casino/crash', accent: 'aqua', rtp: 96.8, popular: false, provider: 'In-House' },
  { id: 'jetx',        name: 'JetX',          emoji: '🚀', cat: 'crash', status: 'play', route: '/casino/crash', accent: 'aqua', rtp: 97.0, popular: false, provider: 'In-House' },
  { id: 'cash-crash',  name: 'Cash or Crash', emoji: '🎈', cat: 'crash', status: 'play', route: '/casino/crash', accent: 'aqua', rtp: 96.5, popular: false, provider: 'In-House' },

  // ── MINES (4) ─────────────────────────────────────────────────────────────
  { id: 'mines',  name: 'Mines',  emoji: '💣', cat: 'mines', status: 'play', route: '/casino/mines', accent: 'gold', rtp: 97.5, popular: true, provider: 'In-House' },
  { id: 'hilo',   name: 'HiLo',   emoji: '🔼', cat: 'mines', status: 'new', route: '/casino/blackjack',  accent: 'gold', rtp: 98.0, popular: false, provider: 'BGaming' },
  { id: 'keno',   name: 'Keno',   emoji: '🔢', cat: 'mines', status: 'play', route: '/casino/mines', accent: 'gold', rtp: 95.5, popular: false, provider: 'In-House' },
  { id: 'limbo',  name: 'Limbo',  emoji: '🎯', cat: 'mines', status: 'play', route: '/casino/mines', accent: 'gold', rtp: 99.0, popular: true, provider: 'In-House' },

  // ── PLINKO (3) ────────────────────────────────────────────────────────────
  { id: 'plinko',    name: 'Plinko',   emoji: '🟡', cat: 'plinko', status: 'play', route: '/casino/plinko', accent: 'emerald', rtp: 96.5, popular: true, provider: 'In-House' },
  { id: 'pachinko',  name: 'Pachinko', emoji: '🎰', cat: 'plinko', status: 'play', route: '/casino/plinko', accent: 'emerald', rtp: 96.5, popular: false, provider: 'In-House' },
  { id: 'drop-em',   name: "Drop'Em",  emoji: '⚪', cat: 'plinko', status: 'play', route: '/casino/plinko', accent: 'emerald', rtp: 96.0, popular: false, provider: 'In-House' },

  // ── SLOTS (16) ────────────────────────────────────────────────────────────
  { id: 'jungle-king',      name: 'Jungle King',       emoji: '🦁', cat: 'slots', status: 'new', route: '/casino/slots/jungle-king',  accent: 'emerald', rtp: 96.5, popular: true, provider: 'C7Studios' },
  { id: 'sweet-bonanza',    name: 'Sweet Bonanza',     emoji: '🍬', cat: 'slots', status: 'hot', route: '/casino/slots/sweet-bonanza',  accent: 'gold', rtp: 96.5, popular: true, provider: 'In-House' },
  { id: 'gates-olympus',    name: 'Gates of Olympus',  emoji: '⚡', cat: 'slots', status: 'hot', route: '/casino/slots/gates-olympus',  accent: 'gold', rtp: 96.5, popular: true, provider: 'In-House' },
  { id: 'wolf-gold',        name: 'Wolf Gold',         emoji: '🐺', cat: 'slots', status: 'hot', route: '/casino/slots/wolf-gold',  accent: 'gold', rtp: 96.0, popular: true, provider: 'In-House' },
  { id: 'starburst',        name: 'Starburst',         emoji: '✨', cat: 'slots', status: 'new', route: '/casino/slots/starburst',  accent: 'gold', rtp: 96.1, popular: false, provider: 'In-House' },
  { id: 'book-dead',        name: 'Book of Dead',      emoji: '📕', cat: 'slots', status: 'play', route: '/casino/slots/book-dead', accent: 'gold', rtp: 96.2, popular: false, provider: "Play'n GO" },
  { id: 'big-bass',         name: 'Big Bass Bonanza',  emoji: '🐟', cat: 'slots', status: 'play', route: '/casino/slots/big-bass', accent: 'gold', rtp: 96.7, popular: false, provider: 'In-House' },
  { id: 'reactoonz',        name: 'Reactoonz',         emoji: '👾', cat: 'slots', status: 'play', route: '/casino/slots/reactoonz', accent: 'gold', rtp: 96.5, popular: false, provider: "Play'n GO" },
  { id: 'bonanza',          name: 'Bonanza',           emoji: '💎', cat: 'slots', status: 'play', route: '/casino/slots/bonanza', accent: 'gold', rtp: 96.0, popular: false, provider: 'In-House' },
  { id: 'money-train',      name: 'Money Train',       emoji: '🚂', cat: 'slots', status: 'play', route: '/casino/slots/money-train', accent: 'gold', rtp: 96.4, popular: false, provider: 'In-House' },
  { id: 'razor-shark',      name: 'Razor Shark',       emoji: '🦈', cat: 'slots', status: 'play', route: '/casino/slots/razor-shark', accent: 'gold', rtp: 96.7, popular: false, provider: 'In-House' },
  { id: 'fruit-party',      name: 'Fruit Party',       emoji: '🍓', cat: 'slots', status: 'play', route: '/casino/slots/fruit-party', accent: 'gold', rtp: 96.5, popular: false, provider: 'In-House' },
  { id: 'doom-dead',        name: 'Doom of Dead',      emoji: '☠️', cat: 'slots', status: 'play', route: '/casino/slots/doom-dead', accent: 'gold', rtp: 96.3, popular: false, provider: 'In-House' },
  { id: 'mustang-gold',     name: 'Mustang Gold',      emoji: '🐎', cat: 'slots', status: 'play', route: '/casino/slots/mustang-gold', accent: 'gold', rtp: 96.5, popular: false, provider: 'In-House' },
  { id: 'buffalo-king',     name: 'Buffalo King',      emoji: '🦬', cat: 'slots', status: 'play', route: '/casino/slots/buffalo-king', accent: 'gold', rtp: 96.5, popular: false, provider: 'In-House' },
  { id: 'wild-west',        name: 'Wild West Gold',    emoji: '🤠', cat: 'slots', status: 'play', route: '/casino/slots/wild-west', accent: 'gold', rtp: 96.5, popular: false, provider: 'In-House' },
  { id: 'wanted-dead-wild', name: 'Wanted Dead/Wild',  emoji: '🎯', cat: 'slots', status: 'play', route: '/casino/slots/wanted-dead-wild', accent: 'gold', rtp: 96.4, popular: false, provider: 'In-House' },

  // ── TABLE (8) ─────────────────────────────────────────────────────────────
  { id: 'blackjack',     name: 'Blackjack',        emoji: '♠️', cat: 'table', status: 'play', route: '/casino/blackjack', accent: 'emerald', rtp: 99.5, popular: true, provider: 'Evolution' },
  { id: 'baccarat',      name: 'Baccarat',         emoji: '♦️', cat: 'table', status: 'play', route: '/casino/live-blackjack', accent: 'emerald', rtp: 98.9, popular: false, provider: 'Evolution' },
  { id: 'roulette',      name: 'Roulette',         emoji: '🔴', cat: 'table', status: 'play', route: '/casino/roulette', accent: 'emerald', rtp: 97.3, popular: false, provider: 'Evolution' },
  { id: 'casino-holdem', name: "Casino Hold'em",   emoji: '♣️', cat: 'table', status: 'play', route: '/casino/live-blackjack', accent: 'emerald', rtp: 97.8, popular: false, provider: 'Evolution' },
  { id: 'three-card',    name: 'Three Card Poker', emoji: '🃏', cat: 'table', status: 'play', route: '/casino/live-blackjack', accent: 'emerald', rtp: 96.6, popular: false, provider: 'Evolution' },
  { id: 'caribbean',     name: 'Caribbean Stud',   emoji: '🏝️', cat: 'table', status: 'play', route: '/casino/live-blackjack', accent: 'emerald', rtp: 94.8, popular: false, provider: 'Evolution' },
  { id: 'sic-bo',        name: 'Sic Bo',           emoji: '🎲', cat: 'table', status: 'play', route: '/casino/live-roulette', accent: 'emerald', rtp: 97.2, popular: false, provider: 'Evolution' },
  { id: 'andar-bahar',   name: 'Andar Bahar',      emoji: '🪔', cat: 'table', status: 'play', route: '/casino/live-blackjack', accent: 'emerald', rtp: 97.8, popular: false, provider: 'Ezugi' },

  // ── CARDS (6) ─────────────────────────────────────────────────────────────
  { id: 'teen-patti',    name: 'Teen Patti',     emoji: '🎴', cat: 'cards', status: 'new', route: '/casino/blackjack',  accent: 'gold', rtp: 97.0, popular: true, provider: 'Ezugi' },
  { id: 'rummy',         name: 'Rummy',          emoji: '🂠', cat: 'cards', status: 'play', route: '/casino/blackjack', accent: 'gold', rtp: 96.0, popular: false, provider: 'BGaming' },
  { id: 'poker',         name: 'Poker',          emoji: '♠️', cat: 'cards', status: 'play', route: '/casino/blackjack', accent: 'gold', rtp: 98.0, popular: false, provider: 'Evolution' },
  { id: 'solitaire',     name: 'Solitaire Cash', emoji: '🂡', cat: 'cards', status: 'play', route: '/casino/blackjack', accent: 'gold', rtp: 96.0, popular: false, provider: 'BGaming' },
  { id: 'hilo-switch',   name: 'Hi-Lo Switch',   emoji: '🔀', cat: 'cards', status: 'play', route: '/casino/blackjack', accent: 'gold', rtp: 97.5, popular: false, provider: 'BGaming' },
  { id: 'hearts',        name: 'Hearts',         emoji: '♥️', cat: 'cards', status: 'play', route: '/casino/blackjack', accent: 'gold', rtp: 96.0, popular: false, provider: 'BGaming' },

  // ── SPECIALTY (4) ─────────────────────────────────────────────────────────
  { id: 'wheel',         name: 'Wheel',          emoji: '🎡', cat: 'specialty', status: 'soon', accent: 'ruby', rtp: 96.0, popular: false, provider: 'BGaming' },
  { id: 'scratchcards',  name: 'Scratchcards',   emoji: '🪙', cat: 'specialty', status: 'soon', accent: 'ruby', rtp: 95.5, popular: false, provider: 'BGaming' },
  { id: 'bingo',         name: 'Bingo',          emoji: '🎱', cat: 'specialty', status: 'soon', accent: 'ruby', rtp: 95.0, popular: false, provider: 'BGaming' },
  { id: 'wheel-wealth',  name: 'Wheel of Wealth',emoji: '💰', cat: 'specialty', status: 'soon', accent: 'ruby', rtp: 96.0, popular: false, provider: 'BGaming' },

  // ── SPORTS (7) ────────────────────────────────────────────────────────────
  { id: 'football',    name: 'Football X',    emoji: '⚽', cat: 'sports', status: 'hot',  accent: 'emerald', rtp: 96.5, popular: true,  provider: 'C7Studios' },
  { id: 'cricket-x',   name: 'Cricket X',     emoji: '🏏', cat: 'sports', status: 'hot',  accent: 'ruby',    rtp: 96.8, popular: true,  provider: 'C7Studios' },
  { id: 'ipl-cricket', name: 'IPL Champions', emoji: '🏆', cat: 'sports', status: 'new',  accent: 'gold',    rtp: 97.0, popular: true,  provider: 'C7Studios' },
  { id: 'basketball',  name: 'Basketball X',  emoji: '🏀', cat: 'sports', status: 'soon', accent: 'ruby',    rtp: 96.5, popular: false, provider: 'C7Studios' },
  { id: 'tennis',      name: 'Tennis Ace',    emoji: '🎾', cat: 'sports', status: 'soon', accent: 'emerald', rtp: 96.3, popular: false, provider: 'C7Studios' },
  { id: 'e-sports',    name: 'E-Sports',      emoji: '🎮', cat: 'sports', status: 'new',  accent: 'aqua',    rtp: 96.7, popular: false, provider: 'C7Studios' },
  { id: 'kabaddi',     name: 'Kabaddi',       emoji: '🤼', cat: 'sports', status: 'soon', accent: 'gold',    rtp: 96.4, popular: false, provider: 'C7Studios' },

  // ── EXTENDED CRASH FAMILY (4) ────────────────────────────────────────────
  { id: 'aviator-2',   name: 'Aviator 2',     emoji: '✈️',  cat: 'crash', status: 'new',  accent: 'ruby',    rtp: 96.9, popular: false, provider: 'Spribe'    },
  { id: 'aviatrix',    name: 'Aviatrix',      emoji: '🛩️',  cat: 'crash', status: 'new',  accent: 'emerald', rtp: 97.0, popular: false, provider: 'AviaTrix' },
  { id: 'canado',      name: 'Canado',        emoji: '🦆',  cat: 'crash', status: 'soon', accent: 'gold',    rtp: 96.5, popular: false, provider: 'C7Studios' },
  { id: 'zeppelin',    name: 'Zeppelin',      emoji: '🎈',  cat: 'crash', status: 'soon', accent: 'gold',    rtp: 96.6, popular: false, provider: 'BetSol'    },

  // ── PREDICTION (1) ───────────────────────────────────────────────────────
  { id: 'wingo',       name: 'WinGo',         emoji: '🎯', cat: 'specialty', status: 'new', accent: 'aqua', rtp: 97.0, popular: true, provider: 'C7Studios' },

  // ── INDIAN CARD GAMES (4 additions) ──────────────────────────────────────
  { id: 'uno',         name: 'Uno',           emoji: '🃏', cat: 'cards', status: 'new',  accent: 'ruby',    rtp: 96.8, popular: false, provider: 'C7Studios' },
  { id: 'ludo',        name: 'Ludo Cash',     emoji: '🎲', cat: 'cards', status: 'new',  accent: 'gold',    rtp: 96.5, popular: false, provider: 'C7Studios' },
  { id: 'jhandi-munda',name: 'Jhandi Munda',  emoji: '🎴', cat: 'cards', status: 'soon', accent: 'gold',    rtp: 96.4, popular: false, provider: 'C7Studios' },
  { id: 'call-break',  name: 'Call Break',    emoji: '♠️', cat: 'cards', status: 'soon', accent: 'emerald', rtp: 96.6, popular: false, provider: 'C7Studios' },

  // ── EXTRA SLOTS (2) ──────────────────────────────────────────────────────
  { id: 'wild-ape',    name: 'Wild Ape',      emoji: '🦍', cat: 'slots', status: 'hot',  accent: 'gold',    rtp: 96.4, popular: false, provider: 'Pragmatic' },
  { id: 'starlight',   name: 'Starlight',     emoji: '👑', cat: 'slots', status: 'hot',  accent: 'gold',    rtp: 96.8, popular: false, provider: 'Pragmatic' },

  // ── FISHING (5) ──────────────────────────────────────────────────────────
  { id: 'happy-fishing', name: 'Happy Fishing', emoji: '🐟', cat: 'fishing', status: 'hot',  accent: 'gold',    rtp: 96.7, popular: true,  provider: 'JILI'      },
  { id: 'ocean-king',    name: 'Ocean King',    emoji: '🐉', cat: 'fishing', status: 'hot',  accent: 'gold',    rtp: 97.0, popular: true,  provider: 'JILI'      },
  { id: 'fish-hunter',   name: 'Fish Hunter',   emoji: '🎣', cat: 'fishing', status: 'new',  accent: 'aqua',    rtp: 96.5, popular: false, provider: 'C7Studios' },
  { id: 'deep-sea',      name: 'Deep Sea',      emoji: '🦈', cat: 'fishing', status: 'soon', accent: 'aqua',    rtp: 96.6, popular: false, provider: 'C7Studios' },
  { id: 'bomb-fishing',  name: 'Bomb Fishing',  emoji: '💣', cat: 'fishing', status: 'soon', accent: 'ruby',    rtp: 96.4, popular: false, provider: 'C7Studios' },

  // ── DRAGONS (2) — folded into specialty ──────────────────────────────────
  { id: 'dragon-king',   name: 'Dragon King',   emoji: '🐉', cat: 'specialty', status: 'hot', accent: 'gold', rtp: 96.8, popular: true, provider: 'C7Studios' },
  { id: 'dragon-tiger',  name: 'Dragon Tiger',  emoji: '🐅', cat: 'specialty', status: 'new', accent: 'ruby', rtp: 96.5, popular: true, provider: 'Evolution' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────
import {
  Sparkles, Tv, Cherry, TrendingUp, Bomb,
  CircleDot, Spade, Diamond, Target,
} from 'lucide-react';
type LucideIcon = typeof Sparkles;

const TABS: { key: Cat | 'all'; label: string; Icon: LucideIcon }[] = [
  { key: 'all',       label: 'All',       Icon: Sparkles    },
  { key: 'live',      label: 'Live',      Icon: Tv          },
  { key: 'slots',     label: 'Slots',     Icon: Cherry      },
  { key: 'crash',     label: 'Crash',     Icon: TrendingUp  },
  { key: 'mines',     label: 'Mines',     Icon: Bomb        },
  { key: 'plinko',    label: 'Plinko',    Icon: CircleDot   },
  { key: 'table',     label: 'Table',     Icon: Spade       },
  { key: 'cards',     label: 'Cards',     Icon: Diamond     },
  { key: 'specialty', label: 'Specialty', Icon: Target      },
  { key: 'sports',    label: 'Sports',    Icon: Target      },
  { key: 'fishing',   label: 'Fishing',   Icon: Target      },
];

// Quick-filter chip definitions — combined with tab AND search
type FilterKey = 'all' | 'hot' | 'new' | 'live' | 'play' | 'high-rtp' | 'popular';
const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: 'all',      label: 'All',      emoji: '✦'  },
  { key: 'hot',      label: 'Hot',      emoji: '🔥' },
  { key: 'new',      label: 'New',      emoji: '✨' },
  { key: 'live',     label: 'Live',     emoji: '🔴' },
  { key: 'play',     label: 'Playable', emoji: '▶'  },
  { key: 'high-rtp', label: 'High RTP', emoji: '📈' },
  { key: 'popular',  label: 'Popular',  emoji: '⭐' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes ggv8-fade-in   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ggv8-shake     { 0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)} }
@keyframes ggv8-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
@keyframes ggv8-shine     { 0%{transform:translateX(-120%) skewX(-20deg)} 100%{transform:translateX(220%) skewX(-20deg)} }
@keyframes ggv8-glow-pulse{ 0%,100%{box-shadow:0 0 0 0 var(--ggv8-glow,rgba(224, 43, 60, .5))} 50%{box-shadow:0 0 22px 2px var(--ggv8-glow,rgba(224, 43, 60, .5))} }

.ggv8-root { animation: ggv8-fade-in .4s ease-out both; }

.ggv8-tabs-wrap {
  /* Sticks to the bottom of the page header. The host page publishes
   * its measured header height as --c7-header-h via ResizeObserver
   * (CasinoPage.tsx). Fallback 64px matches the typical mobile header
   * height so the layout still works if the var is missing. */
  position: sticky;
  top: var(--c7-header-h, 64px);
  z-index: 20;  /* above content, below the page header (z=30) */
  padding: 10px 0 8px;
  /* Solid bottom of the gradient is opaque enough to mask scrolling
   * content underneath — no see-through "white gap" effect. Avoids
   * the transparent ~30% bottom of the previous gradient that let
   * cards bleed visibly through during fast scroll. */
  background: linear-gradient(180deg,
    rgba(4, 6, 10, 0.96) 0%,
    rgba(4, 6, 10, 0.94) 70%,
    rgba(4, 6, 10, 0.78) 100%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.ggv8-tabs {
  display: flex; gap: 6px;
  overflow-x: auto; overflow-y: hidden;
  padding: 4px 16px 6px;
  scrollbar-width: none;
}
.ggv8-tabs::-webkit-scrollbar { display: none; }

.ggv8-tab {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px;
  font-size: 12px; font-weight: 800; letter-spacing: .4px;
  color: ${t.colors.text.secondary};
  background: rgba(28, 28, 32, 0.55);
  border: 1px solid ${t.colors.border.soft};
  border-radius: 999px;
  cursor: pointer;
  transition: all .22s ease;
  white-space: nowrap;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.ggv8-tab:active { transform: scale(.96); }
.ggv8-tab[data-active="true"] {
  color: ${t.colors.surface.abyss};
  background: ${t.gradients.hero};
  border-color: transparent;
  box-shadow: 0 4px 18px ${t.colors.aqua.glowSoft}, 0 0 0 1px ${t.colors.gold[400]} inset;
}
.ggv8-tab-count {
  display: inline-block;
  font-size: 10px; font-weight: 900;
  padding: 1px 6px;
  background: rgba(0,0,0,.25);
  border-radius: 999px;
  min-width: 16px; text-align: center;
}
.ggv8-tab[data-active="true"] .ggv8-tab-count {
  background: rgba(0, 0, 0, .35);
  color: ${t.colors.gold[100]};
}

.ggv8-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 4px 16px 24px;
}
@media (min-width: 380px) { .ggv8-grid { gap: 12px; } }

.ggv8-tile {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1.15;
  padding: 0;
  background:
    radial-gradient(120% 60% at 50% 0%, var(--ggv8-glow, rgba(224, 43, 60, .10)) 0%, transparent 60%),
    linear-gradient(160deg, rgba(40,60,90,.45) 0%, rgba(14,20,36,.78) 100%);
  border: 1px solid ${t.colors.border.soft};
  border-radius: 18px;
  cursor: pointer;
  overflow: hidden;
  transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
  -webkit-tap-highlight-color: transparent;
  isolation: isolate;
  width: 100%;
  text-align: left;
}
.ggv8-tile::before {
  /* HDR forest top edge */
  content: '';
  position: absolute; inset: 0 0 auto 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--ggv8-edge, ${t.colors.aqua[500]}), transparent);
  opacity: .65;
  pointer-events: none;
}
.ggv8-tile::after {
  /* shine sweep */
  content: '';
  position: absolute; top: 0; left: 0; width: 35%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
  transform: translateX(-120%) skewX(-20deg);
  pointer-events: none;
}
.ggv8-tile:hover { transform: translateY(-2px); border-color: ${t.colors.border.medium}; }
.ggv8-tile:hover::after { animation: ggv8-shine 1.1s ease-out forwards; }
.ggv8-tile:active { transform: scale(.97); }

.ggv8-tile[data-playable="true"] {
  border-color: ${t.colors.border.aqua};
  --ggv8-glow: ${t.colors.aqua.glowSoft};
  animation: ggv8-glow-pulse 3.4s ease-in-out infinite;
}
.ggv8-tile[data-shake="true"] { animation: ggv8-shake .35s ease; }

/* poster cover layer — image | scene | icon */
.ggv8-tile-cover {
  position: absolute; inset: 0;
  z-index: 0;
}
/* gradient overlay for text readability */
.ggv8-tile-grad {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0, 0, 0, .55) 70%, rgba(0, 0, 0, .95) 100%);
  pointer-events: none;
  z-index: 1;
}
.ggv8-tile-top {
  position: absolute; top: 7px; left: 7px; right: 7px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;
  z-index: 2;
}
.ggv8-tile-bottom {
  position: absolute; left: 9px; right: 9px; bottom: 8px;
  display: flex; flex-direction: column; gap: 1px;
  z-index: 2;
  min-width: 0;
}

.ggv8-name {
  font-size: 11.5px;
  font-weight: 900;
  color: #fff;
  letter-spacing: .1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgba(0,0,0,.85);
}
.ggv8-provider {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  color: rgba(255,255,255,.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* status badge (top-left) */
.ggv8-badge {
  font-size: 8.5px; font-weight: 900; letter-spacing: 1px;
  padding: 3px 7px;
  border-radius: 6px;
  text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 4px;
  line-height: 1;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0,0,0,.4);
}
.ggv8-badge-dot {
  width: 5px; height: 5px; border-radius: 50%;
  animation: ggv8-pulse-dot 1.3s ease-in-out infinite;
}
.ggv8-badge-play { background: ${t.colors.aqua[500]};   color: ${t.colors.surface.abyss}; }
.ggv8-badge-live { background: ${t.colors.ruby[500]};   color: #fff; }
.ggv8-badge-hot  { background: ${t.colors.gold[400]};   color: ${t.colors.surface.abyss}; }
.ggv8-badge-new  { background: ${t.colors.emerald[500]};color: ${t.colors.surface.abyss}; }

/* RTP badge (top-right) */
.ggv8-rtp {
  font-size: 8.5px; font-weight: 900; letter-spacing: .3px;
  padding: 3px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, .65);
  color: ${t.colors.text.secondary};
  border: 1px solid ${t.colors.border.subtle};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  line-height: 1;
  white-space: nowrap;
}
.ggv8-rtp[data-high="true"] {
  color: ${t.colors.gold[300]};
  border-color: ${t.colors.border.gold};
  background: rgba(255,201,64,.14);
}


.ggv8-toast {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px; font-weight: 900; letter-spacing: 1.5px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, .92);
  color: ${t.colors.gold[300]};
  border: 1px solid ${t.colors.border.gold};
  border-radius: 6px;
  opacity: 0; pointer-events: none;
  transition: opacity .2s ease;
  z-index: 4;
  text-transform: uppercase;
  white-space: nowrap;
}
.ggv8-tile[data-shake="true"] .ggv8-toast { opacity: 1; }

.ggv8-section-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 8px;
}
.ggv8-section-title {
  font-size: 18px; font-weight: 900; letter-spacing: .4px;
  color: ${t.colors.text.primary};
  display: flex; align-items: center; gap: 10px;
}
.ggv8-section-total {
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase;
  color: ${t.colors.text.tertiary};
}
.ggv8-section-count {
  color: ${t.colors.aqua[400]};
  font-variant-numeric: tabular-nums;
}

/* ── Search bar ─────────────────────────────────────────────── */
.ggv8-search-wrap {
  padding: 4px 16px 6px;
}
.ggv8-search {
  position: relative;
  display: flex; align-items: center;
  background: rgba(28, 28, 32, 0.55);
  border: 1px solid ${t.colors.border.soft};
  border-radius: 14px;
  padding: 0 12px;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ggv8-search:focus-within {
  border-color: ${t.colors.border.aqua};
  box-shadow: 0 0 0 3px ${t.colors.aqua.glowSoft};
}
.ggv8-search-icon {
  color: ${t.colors.text.tertiary};
  font-size: 14px;
  margin-right: 8px;
  pointer-events: none;
}
.ggv8-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${t.colors.text.primary};
  font-size: 13px;
  font-weight: 600;
  padding: 11px 0;
  letter-spacing: .2px;
}
.ggv8-search-input::placeholder { color: ${t.colors.text.muted}; font-weight: 500; }
.ggv8-search-clear {
  appearance: none;
  background: rgba(255,255,255,.08);
  border: none;
  color: ${t.colors.text.secondary};
  width: 20px; height: 20px;
  border-radius: 50%;
  font-size: 11px; font-weight: 900;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  margin-left: 6px;
  -webkit-tap-highlight-color: transparent;
}
.ggv8-search-clear:hover { background: rgba(255,255,255,.16); color: ${t.colors.text.primary}; }

/* ── Filter chip row ─────────────────────────────────────────── */
.ggv8-filters-wrap {
  padding: 4px 0 6px;
}
.ggv8-filters {
  display: flex; gap: 6px;
  overflow-x: auto; overflow-y: hidden;
  padding: 2px 16px 4px;
  scrollbar-width: none;
}
.ggv8-filters::-webkit-scrollbar { display: none; }
.ggv8-chip {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px;
  font-size: 11px; font-weight: 800; letter-spacing: .4px;
  color: ${t.colors.text.secondary};
  background: rgba(28, 28, 32, 0.4);
  border: 1px solid ${t.colors.border.subtle};
  border-radius: 999px;
  cursor: pointer;
  transition: all .18s ease;
  white-space: nowrap;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.ggv8-chip:active { transform: scale(.95); }
.ggv8-chip[data-active="true"] {
  color: ${t.colors.surface.abyss};
  background: ${t.colors.gold[400]};
  border-color: ${t.colors.gold[300]};
  box-shadow: 0 2px 12px ${t.colors.gold.glowSoft};
}

/* ── Result meta ─────────────────────────────────────────────── */
.ggv8-meta {
  padding: 0 18px 6px;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  color: ${t.colors.text.tertiary};
}
.ggv8-meta-count { color: ${t.colors.text.primary}; }
.ggv8-meta-reset {
  appearance: none; background: transparent; border: none;
  color: ${t.colors.aqua[400]};
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  cursor: pointer; padding: 2px 6px;
  -webkit-tap-highlight-color: transparent;
}
.ggv8-meta-reset:active { transform: scale(.95); }

/* ── Empty state ─────────────────────────────────────────────── */
.ggv8-empty {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 32px 16px;
  background: rgba(28, 28, 32, 0.4);
  border: 1px dashed ${t.colors.border.soft};
  border-radius: 18px;
  color: ${t.colors.text.secondary};
  text-align: center;
}
.ggv8-empty-icon { font-size: 36px; opacity: .65; }
.ggv8-empty-title { font-size: 13px; font-weight: 900; color: ${t.colors.text.primary}; }
.ggv8-empty-sub { font-size: 11px; color: ${t.colors.text.tertiary}; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Accent → CSS var mapping
// ─────────────────────────────────────────────────────────────────────────────
function accentToVars(accent: Game['accent']): React.CSSProperties {
  switch (accent) {
    case 'gold':
      return { ['--ggv8-glow' as any]: t.colors.gold.glowSoft, ['--ggv8-edge' as any]: t.colors.gold[400] };
    case 'ruby':
      return { ['--ggv8-glow' as any]: 'rgba(239,42,76,.18)', ['--ggv8-edge' as any]: t.colors.ruby[500] };
    case 'emerald':
      return { ['--ggv8-glow' as any]: t.colors.emerald.glow, ['--ggv8-edge' as any]: t.colors.emerald[500] };
    case 'aqua':
    default:
      return { ['--ggv8-glow' as any]: t.colors.aqua.glowSoft, ['--ggv8-edge' as any]: t.colors.aqua[500] };
  }
}

function Badge({ status }: { status: Status }) {
  if (status === 'play') return <span className="ggv8-badge ggv8-badge-play">Play</span>;
  if (status === 'live') return <span className="ggv8-badge ggv8-badge-live"><span className="ggv8-badge-dot" style={{ background: '#fff' }} />Live</span>;
  if (status === 'hot')  return <span className="ggv8-badge ggv8-badge-hot">🔥 Hot</span>;
  if (status === 'new')  return <span className="ggv8-badge ggv8-badge-new">New</span>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function GameGridV8() {
  const navigate = useNavigate();
  const [active, setActive] = useState<Cat | 'all'>('all');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [shakingId, setShakingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: GAMES.length };
    for (const g of GAMES) c[g.cat] = (c[g.cat] ?? 0) + 1;
    return c;
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (active !== 'all' && g.cat !== active) return false;
      if (filter === 'hot'      && g.status !== 'hot')  return false;
      if (filter === 'new'      && g.status !== 'new')  return false;
      if (filter === 'live'     && g.status !== 'live') return false;
      if (filter === 'play'     && !g.route)            return false;
      if (filter === 'high-rtp' && (g.rtp ?? 0) < 97)   return false;
      if (filter === 'popular'  && !g.popular)          return false;
      if (q && !g.name.toLowerCase().includes(q))       return false;
      return true;
    });
  }, [active, filter, query]);

  const hasFilters = active !== 'all' || filter !== 'all' || query.trim() !== '';

  const resetAll = () => {
    setActive('all');
    setFilter('all');
    setQuery('');
  };

  const handleTap = (g: Game) => {
    if (g.route) {
      navigate(g.route);
      return;
    }
    setShakingId(g.id);
    window.setTimeout(() => setShakingId((cur) => (cur === g.id ? null : cur)), 400);
  };

  return (
    <section className="ggv8-root" aria-label="Game library">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Section header */}
      <div className="ggv8-section-head">
        <h2 className="ggv8-section-title">
          <span
            style={{
              display: 'inline-block', width: 3, height: 18, borderRadius: 2,
              background: t.gradients.hero,
            }}
          />
          Game Library
        </h2>
        <span className="ggv8-section-total">
          <span className="ggv8-section-count">{GAMES.length}</span> games
        </span>
      </div>

      {/* Search */}
      <div className="ggv8-search-wrap">
        <div className="ggv8-search">
          <span className="ggv8-search-icon" aria-hidden="true">🔍</span>
          <input
            className="ggv8-search-input"
            type="search"
            inputMode="search"
            placeholder="Search games…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search games"
          />
          {query && (
            <button
              type="button"
              className="ggv8-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >×</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="ggv8-tabs-wrap">
        <div className="ggv8-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className="ggv8-tab"
              data-active={active === tab.key}
              onClick={() => setActive(tab.key)}
            >
              <tab.Icon size={16} strokeWidth={2.4} aria-hidden="true" />
              <span>{tab.label}</span>
              <span className="ggv8-tab-count">{counts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="ggv8-filters-wrap">
        <div className="ggv8-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="ggv8-chip"
              data-active={filter === f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Result meta */}
      <div className="ggv8-meta">
        <span>
          <span className="ggv8-meta-count">{visible.length}</span> of {GAMES.length}
        </span>
        {hasFilters && (
          <button type="button" className="ggv8-meta-reset" onClick={resetAll}>
            Reset
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="ggv8-grid" key={`${active}-${filter}-${query}`}>
        {visible.length === 0 ? (
          <div className="ggv8-empty">
            <span className="ggv8-empty-icon">🎲</span>
            <span className="ggv8-empty-title">No games match</span>
            <span className="ggv8-empty-sub">Try clearing filters or another search term</span>
            <button type="button" className="ggv8-meta-reset" onClick={resetAll}>↻ Reset filters</button>
          </div>
        ) : visible.map((g) => (
          <button
            key={g.id}
            type="button"
            className="ggv8-tile"
            data-playable={!!g.route}
            data-status={g.status}
            data-shake={shakingId === g.id}
            style={accentToVars(g.accent)}
            onClick={() => handleTap(g)}
            aria-label={g.route ? `Play ${g.name}` : `${g.name} — coming soon`}
          >
            {/* full-bleed art layer */}
            <div className="ggv8-tile-cover">
              <TileCover id={g.id} cover={g.cover} accent={g.accent} />
            </div>
            {/* gradient overlay for text */}
            <div className="ggv8-tile-grad" />
            {/* top row: status + RTP */}
            <div className="ggv8-tile-top">
              <Badge status={g.status} />
              {typeof g.rtp === 'number' && (
                <span className="ggv8-rtp" data-high={g.rtp >= 97}>
                  {g.rtp.toFixed(1)}%
                </span>
              )}
            </div>
            {/* bottom: name + provider */}
            <div className="ggv8-tile-bottom">
              <span className="ggv8-name">{g.name}</span>
              {g.provider && <span className="ggv8-provider">{g.provider}</span>}
            </div>
            {!g.route && <span className="ggv8-toast">Coming Soon</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
