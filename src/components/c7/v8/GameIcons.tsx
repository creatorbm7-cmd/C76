/**
 * GameIcons — Hand-drawn SVG illustrations for the V8 Game Library.
 *
 * Replaces emoji in GameGridV8 with crafted vector art.
 *   - 16 archetype SVGs covering all 52 games (specific designs for the 3
 *     playable games + Live category, archetype reuse for the rest).
 *   - 64×64 viewBox, theme-aware via accent gradients.
 *   - Multi-layer: shadow disc → body → highlight → glow sparkle.
 *   - All paths use stroke+fill mix for premium feel; no external fonts.
 *
 * Usage:  <GameIcon id="crash" accent="aqua" />
 */

import { c7Theme as t } from '@/theme/c7-sun27-compat';

type Accent = 'aqua' | 'gold' | 'ruby' | 'emerald';

// ─────────────────────────────────────────────────────────────────────────────
// Accent palette
// ─────────────────────────────────────────────────────────────────────────────
function palette(accent: Accent) {
  switch (accent) {
    case 'gold':
      return { main: t.colors.gold[400],   light: t.colors.gold[200],    dark: t.colors.gold[600],   stroke: t.colors.gold[300] };
    case 'ruby':
      return { main: t.colors.ruby[500],   light: t.colors.ruby[400],    dark: t.colors.ruby[600],   stroke: t.colors.ruby[400] };
    case 'emerald':
      return { main: t.colors.emerald[500],light: t.colors.emerald[400], dark: t.colors.emerald[600],stroke: t.colors.emerald[400] };
    case 'aqua':
    default:
      return { main: t.colors.aqua[500],   light: t.colors.aqua[300],    dark: t.colors.aqua[700],   stroke: t.colors.aqua[400] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared wrapper — shadow disc + soft halo
// ─────────────────────────────────────────────────────────────────────────────
const VB = '0 0 64 64';
const C = 32;

function Halo({ color }: { color: string }) {
  return (
    <>
      <defs>
        <radialGradient id="halo-grad">
          <stop offset="0%"   stopColor={color} stopOpacity="0.55" />
          <stop offset="60%"  stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r="30" fill="url(#halo-grad)" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual archetype icons
// ─────────────────────────────────────────────────────────────────────────────

// 1. Crash — rocket on rising curve
function Crash({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <path d="M10 50 Q 25 48, 32 38 T 56 14" fill="none" stroke={p.main} strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
      <path d="M10 50 Q 25 48, 32 38 T 56 14" fill="none" stroke={p.light} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* rocket body */}
      <g transform="translate(50 16) rotate(35)">
        <path d="M0 -10 L4 0 L0 12 L-4 0 Z" fill={p.light} />
        <path d="M0 -10 L4 0 L0 12 L-4 0 Z" fill={p.dark} opacity="0.35" />
        <circle cx="0" cy="-2" r="2" fill="#fff" opacity="0.9" />
        <path d="M-4 4 L-8 10 L-3 7 Z" fill={p.main} opacity="0.85" />
        <path d="M4 4 L8 10 L3 7 Z" fill={p.main} opacity="0.85" />
        <path d="M-2 12 L0 18 L2 12 Z" fill="#ffc940" opacity="0.95" />
      </g>
      <circle cx="14" cy="48" r="1.4" fill={p.light} opacity="0.7" />
      <circle cx="22" cy="44" r="1" fill={p.light} opacity="0.5" />
    </svg>
  );
}

// 2. Mines — bomb with spark
function Mines({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <circle cx="30" cy="38" r="18" fill="#0e1424" stroke={p.main} strokeWidth="2" />
      <circle cx="24" cy="32" r="3.5" fill={p.light} opacity="0.45" />
      <path d="M44 22 L52 14" stroke={p.main} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M44 22 L52 14" stroke={p.light} strokeWidth="1" strokeLinecap="round" />
      {/* fuse spark */}
      <g transform="translate(52 14)">
        <circle r="3" fill="#ffc940" />
        <circle r="5" fill="#ffc940" opacity="0.35" />
        <path d="M-6 -1 L-3 0 M6 0 L3 0 M0 -6 L0 -3 M0 6 L0 3 M-4 -4 L-2 -2 M4 4 L2 2 M-4 4 L-2 2 M4 -4 L2 -2"
              stroke="#ffc940" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 3. Plinko — pegboard with ball
function Plinko({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      {/* pegs */}
      {[
        [22,18],[32,18],[42,18],
        [18,28],[28,28],[38,28],[48,28],
        [22,38],[32,38],[42,38],
        [18,48],[28,48],[38,48],[48,48],
      ].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill={p.stroke} opacity={0.85} />
      ))}
      {/* dropping ball */}
      <circle cx="32" cy="10" r="3.2" fill={p.light} />
      <circle cx="32" cy="10" r="3.2" fill={p.main} opacity="0.45" />
      <circle cx="31" cy="9" r="1" fill="#fff" opacity="0.9" />
      {/* bottom slots */}
      <path d="M10 56 L54 56" stroke={p.main} strokeWidth="1.6" opacity="0.7" />
      <path d="M16 53 L16 58 M24 53 L24 58 M32 53 L32 58 M40 53 L40 58 M48 53 L48 58" stroke={p.stroke} strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

// 4. Slot machine reels
function SlotReels({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <rect x="8" y="14" width="48" height="36" rx="5" fill="#0e1424" stroke={p.main} strokeWidth="1.8" />
      {/* 3 reels */}
      <rect x="13" y="20" width="11" height="24" rx="2" fill="#1a2440" stroke={p.stroke} strokeWidth="0.8" opacity="0.9" />
      <rect x="26.5" y="20" width="11" height="24" rx="2" fill="#1a2440" stroke={p.stroke} strokeWidth="0.8" opacity="0.9" />
      <rect x="40" y="20" width="11" height="24" rx="2" fill="#1a2440" stroke={p.stroke} strokeWidth="0.8" opacity="0.9" />
      {/* symbols */}
      <circle cx="18.5" cy="32" r="3" fill="#ef2a4c" />
      <path d="M28 32 L33 27 L38 32 L33 37 Z" fill={p.light} />
      <text x="42" y="36" fill="#ffc940" fontSize="9" fontWeight="900" fontFamily="system-ui">7</text>
      {/* arm */}
      <circle cx="56" cy="26" r="2.4" fill={p.main} />
      <line x1="56" y1="26" x2="56" y2="42" stroke={p.main} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// 5. Card spread (Blackjack)
function CardSpread({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <g transform="translate(20 14) rotate(-14)">
        <rect width="20" height="28" rx="3" fill="#fff" />
        <text x="3" y="11" fill="#04060a" fontSize="9" fontWeight="900" fontFamily="system-ui">A</text>
        <path d="M10 16 L13 21 L10 26 L7 21 Z" fill="#04060a" />
      </g>
      <g transform="translate(28 18) rotate(8)">
        <rect width="20" height="28" rx="3" fill="#fff" />
        <text x="3" y="11" fill="#ef2a4c" fontSize="9" fontWeight="900" fontFamily="system-ui">K</text>
        <path d="M10 24 C 7 20, 13 20, 10 24 M10 24 C 13 20, 7 20, 10 24" fill="#ef2a4c" />
        <circle cx="8" cy="20" r="2.5" fill="#ef2a4c" />
        <circle cx="12" cy="20" r="2.5" fill="#ef2a4c" />
      </g>
      <circle cx="50" cy="14" r="2" fill={p.main} opacity="0.85" />
      <circle cx="14" cy="50" r="1.5" fill={p.light} opacity="0.7" />
    </svg>
  );
}

// 6. Roulette wheel
function Roulette({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <circle cx={C} cy={C} r="20" fill="#0e1424" stroke={p.main} strokeWidth="2" />
      <circle cx={C} cy={C} r="14" fill="#1a2440" stroke={p.stroke} strokeWidth="1" opacity="0.7" />
      {/* spokes — alternating red/black */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x = C + Math.cos(angle) * 17;
        const y = C + Math.sin(angle) * 17;
        const color = i % 2 === 0 ? '#ef2a4c' : '#04060a';
        return <circle key={i} cx={x} cy={y} r="2.2" fill={color} stroke={p.light} strokeWidth="0.4" />;
      })}
      <circle cx={C} cy={C} r="3" fill={p.main} />
      <circle cx={C} cy={C} r="1.4" fill="#fff" />
      {/* ball */}
      <circle cx={C + 11} cy={C - 8} r="2" fill="#fff" />
    </svg>
  );
}

// 7. Two cards (Baccarat)
function TwoCards({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <rect x="14" y="16" width="20" height="30" rx="3" fill="#fff" stroke={p.stroke} strokeWidth="1" />
      <path d="M24 24 L29 30 L24 36 L19 30 Z" fill={p.main} />
      <text x="16" y="44" fill="#04060a" fontSize="6" fontWeight="900" fontFamily="system-ui">9</text>
      <rect x="32" y="20" width="20" height="30" rx="3" fill="#fff" stroke={p.stroke} strokeWidth="1" />
      <text x="35" y="32" fill="#ef2a4c" fontSize="9" fontWeight="900" fontFamily="system-ui">K</text>
      <path d="M44 38 C 41 34, 47 34, 44 38 M44 38 C 47 34, 41 34, 44 38" fill="#ef2a4c" />
    </svg>
  );
}

// 8. Dice
function Dice({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <g transform="translate(16 18) rotate(-10)">
        <rect width="22" height="22" rx="4" fill="#fff" />
        <circle cx="6" cy="6" r="1.8" fill="#04060a" />
        <circle cx="16" cy="6" r="1.8" fill="#04060a" />
        <circle cx="11" cy="11" r="1.8" fill="#04060a" />
        <circle cx="6" cy="16" r="1.8" fill="#04060a" />
        <circle cx="16" cy="16" r="1.8" fill="#04060a" />
      </g>
      <g transform="translate(32 30) rotate(15)">
        <rect width="20" height="20" rx="4" fill={p.main} />
        <circle cx="5" cy="5" r="1.6" fill="#fff" />
        <circle cx="15" cy="15" r="1.6" fill="#fff" />
        <circle cx="10" cy="10" r="1.6" fill="#fff" />
      </g>
    </svg>
  );
}

// 9. Crown (VIP / Crazy Time / Wheel of Wealth)
function Crown({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <path d="M14 38 L12 18 L22 28 L32 14 L42 28 L52 18 L50 38 Z" fill={p.main} stroke={p.stroke} strokeWidth="1.4" />
      <path d="M14 38 L12 18 L22 28 L32 14 L42 28 L52 18 L50 38 Z" fill="#fff" opacity="0.18" />
      <rect x="14" y="40" width="36" height="6" rx="1.5" fill={p.dark} />
      <circle cx="12" cy="16" r="2" fill={p.light} />
      <circle cx="32" cy="12" r="2.4" fill="#fff" />
      <circle cx="52" cy="16" r="2" fill={p.light} />
      <circle cx="22" cy="34" r="1.8" fill="#ef2a4c" />
      <circle cx="32" cy="34" r="1.8" fill="#ffc935" />
      <circle cx="42" cy="34" r="1.8" fill="#ffc940" />
    </svg>
  );
}

// 10. Lightning bolt (Lightning Dice, fast games)
function Lightning({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <path d="M32 8 L18 36 L28 36 L24 56 L46 28 L36 28 L42 8 Z" fill={p.main} stroke={p.light} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M32 8 L18 36 L28 36 L24 56" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

// 11. Plane (Aviator)
function Plane({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <path d="M10 54 Q 30 32, 54 12" fill="none" stroke={p.main} strokeWidth="1.6" strokeDasharray="2 3" opacity="0.7" />
      <g transform="translate(40 18) rotate(-30)">
        <path d="M-14 0 L14 -2 L18 0 L14 2 L-14 0 Z" fill={p.light} />
        <path d="M-4 -10 L6 -2 L-6 -2 Z" fill={p.main} />
        <path d="M-4 10 L6 2 L-6 2 Z" fill={p.dark} />
        <circle cx="10" cy="0" r="1.4" fill="#fff" />
      </g>
    </svg>
  );
}

// 12. Bingo balls
function Bingo({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <g><circle cx="22" cy="24" r="10" fill="#ef2a4c" /><circle cx="22" cy="24" r="6" fill="#fff" /><text x="18" y="28" fill="#04060a" fontSize="8" fontWeight="900" fontFamily="system-ui">7</text></g>
      <g><circle cx="42" cy="22" r="10" fill={p.main} /><circle cx="42" cy="22" r="6" fill="#fff" /><text x="38" y="26" fill="#04060a" fontSize="8" fontWeight="900" fontFamily="system-ui">3</text></g>
      <g><circle cx="34" cy="42" r="11" fill="#ffc940" /><circle cx="34" cy="42" r="6.5" fill="#fff" /><text x="30" y="46" fill="#04060a" fontSize="8" fontWeight="900" fontFamily="system-ui">9</text></g>
    </svg>
  );
}

// 13. Poker chips (Cards / Poker)
function PokerChips({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <g transform="translate(16 32)">
        <ellipse cx="0" cy="2" rx="14" ry="4" fill="#04060a" opacity="0.5" />
        <circle r="12" fill="#ef2a4c" stroke="#fff" strokeWidth="1.4" strokeDasharray="2 2" />
        <circle r="6" fill="#fff" />
        <text x="-4" y="3" fill="#ef2a4c" fontSize="8" fontWeight="900" fontFamily="system-ui">$</text>
      </g>
      <g transform="translate(40 28)">
        <ellipse cx="0" cy="2" rx="16" ry="4.5" fill="#04060a" opacity="0.5" />
        <circle r="14" fill={p.main} stroke="#fff" strokeWidth="1.4" strokeDasharray="2 2" />
        <circle r="7" fill="#fff" />
        <text x="-5" y="3" fill={p.dark} fontSize="9" fontWeight="900" fontFamily="system-ui">$</text>
      </g>
    </svg>
  );
}

// 14. Wheel of fortune
function Wheel({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <circle cx={C} cy={C+2} r="20" fill="#0e1424" stroke={p.main} strokeWidth="2" />
      {/* segments */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a1 = (i * 45) * Math.PI / 180;
        const a2 = ((i+1) * 45) * Math.PI / 180;
        const x1 = C + Math.cos(a1) * 19;
        const y1 = C + 2 + Math.sin(a1) * 19;
        const x2 = C + Math.cos(a2) * 19;
        const y2 = C + 2 + Math.sin(a2) * 19;
        const colors = ['#ef2a4c','#ffc940','#ffc935','#ffc935','#ef2a4c','#ffc940','#ffc935','#ffc935'];
        return <path key={i} d={`M${C} ${C+2} L${x1} ${y1} A19 19 0 0 1 ${x2} ${y2} Z`} fill={colors[i]} opacity="0.85" />;
      })}
      <circle cx={C} cy={C+2} r="3" fill="#fff" />
      {/* pointer */}
      <path d="M32 8 L28 16 L36 16 Z" fill={p.main} stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}

// 15. Cherry / fruit (Sweet Bonanza / Fruit Party)
function Cherry({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <path d="M32 10 Q 30 22, 22 30" fill="none" stroke="#ffc935" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 10 Q 36 24, 44 32" fill="none" stroke="#ffc935" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="38" r="10" fill="#ef2a4c" />
      <circle cx="17" cy="35" r="2.5" fill="#fff" opacity="0.65" />
      <circle cx="46" cy="40" r="11" fill={p.main} />
      <circle cx="43" cy="37" r="2.8" fill="#fff" opacity="0.65" />
      <path d="M32 10 L34 6" stroke={p.light} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// 16. Hat (Crazy Time / Monopoly Live)
function TopHat({ accent }: { accent: Accent }) {
  const p = palette(accent);
  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Halo color={p.main} />
      <rect x="10" y="42" width="44" height="6" rx="1.5" fill="#04060a" stroke={p.main} strokeWidth="1.4" />
      <rect x="18" y="12" width="28" height="32" rx="2" fill="#04060a" stroke={p.main} strokeWidth="1.6" />
      <rect x="18" y="32" width="28" height="4" fill={p.main} />
      <path d="M18 32 L46 32" stroke={p.light} strokeWidth="0.6" />
      <circle cx="50" cy="14" r="2" fill={p.light} />
      <circle cx="14" cy="20" r="1.4" fill={p.light} opacity="0.7" />
      <circle cx="54" cy="36" r="1" fill="#fff" opacity="0.8" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry — game id → archetype
// ─────────────────────────────────────────────────────────────────────────────
const ARCHETYPES = {
  Crash, Mines, Plinko, SlotReels, CardSpread, Roulette, TwoCards, Dice,
  Crown, Lightning, Plane, Bingo, PokerChips, Wheel, Cherry, TopHat,
} as const;

type ArchKey = keyof typeof ARCHETYPES;

const REGISTRY: Record<string, ArchKey> = {
  // Playable hero
  crash: 'Crash',
  mines: 'Mines',
  plinko: 'Plinko',

  // Live
  'live-roulette':  'Roulette',
  'live-blackjack': 'CardSpread',
  'live-baccarat':  'TwoCards',
  'crazy-time':     'TopHat',
  'monopoly-live':  'TopHat',
  'lightning-dice': 'Lightning',

  // Crash family
  aviator:    'Plane',
  spaceman:   'Plane',
  jetx:       'Plane',
  'cash-crash': 'Crash',

  // Mines family
  hilo:  'Dice',
  keno:  'Dice',
  limbo: 'Crash',

  // Plinko family
  pachinko: 'Plinko',
  'drop-em': 'Plinko',

  // Slots — varied
  'sweet-bonanza': 'Cherry',
  'gates-olympus': 'Lightning',
  'wolf-gold':     'SlotReels',
  'starburst':     'SlotReels',
  'book-dead':     'SlotReels',
  'big-bass':      'SlotReels',
  'reactoonz':     'SlotReels',
  'bonanza':       'SlotReels',
  'money-train':   'SlotReels',
  'razor-shark':   'SlotReels',
  'fruit-party':   'Cherry',
  'doom-dead':     'SlotReels',
  'mustang-gold':  'SlotReels',
  'buffalo-king':  'SlotReels',
  'wild-west':     'SlotReels',
  'wanted-dead-wild': 'SlotReels',

  // Table
  blackjack:     'CardSpread',
  baccarat:      'TwoCards',
  roulette:      'Roulette',
  'casino-holdem': 'CardSpread',
  'three-card':  'CardSpread',
  caribbean:     'CardSpread',
  'sic-bo':      'Dice',
  'andar-bahar': 'CardSpread',

  // Cards
  'teen-patti':  'PokerChips',
  rummy:         'CardSpread',
  poker:         'PokerChips',
  solitaire:     'CardSpread',
  'hilo-switch': 'Dice',
  hearts:        'CardSpread',

  // Specialty
  wheel:         'Wheel',
  scratchcards:  'TwoCards',
  bingo:         'Bingo',
  'wheel-wealth': 'Wheel',
};

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────
export default function GameIcon({
  id,
  accent = 'aqua',
}: {
  id: string;
  accent?: Accent;
}) {
  const key = REGISTRY[id] ?? 'SlotReels';
  const Comp = ARCHETYPES[key];
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        maxWidth: 64,
        maxHeight: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.5))',
      }}
    >
      <Comp accent={accent} />
    </div>
  );
}
