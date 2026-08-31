/**
 * GameScenes — Premium full-bleed SVG cover scenes for priority games.
 *
 * These are richer, multi-layer compositions designed to fill an entire tile
 * (poster-style), not centered icons. Each scene uses a 320×368 viewBox
 * (aspect 1/1.15 — matching .ggv8-tile aspect-ratio) and slice-fills so it
 * looks edge-to-edge inside the card.
 *
 * Mapped games:
 *   crash / cash-crash     → CrashScene
 *   mines                  → MinesScene
 *   plinko / pachinko      → PlinkoScene
 *   blackjack / live-blackjack → BlackjackScene
 *   roulette / live-roulette   → RouletteScene
 *   sic-bo / lightning-dice / hilo-switch → DiceScene
 *
 * Each scene is built from gradients + layered paths + particles — no images,
 * no animations (CSS handles motion at the tile level). Pure premium look.
 */

const VB = '0 0 320 368';
const SLICE = 'xMidYMid slice';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CRASH — Night sky, rising curve, rocket, multiplier
// ─────────────────────────────────────────────────────────────────────────────
function CrashScene() {
  const stars: Array<[number, number, number]> = [
    [30,40,1.4],[80,25,0.8],[140,60,1],[200,30,1.2],[260,55,0.8],[290,80,1],
    [50,90,0.8],[100,110,0.6],[230,130,1],[180,90,0.6],[280,40,1.2],[20,150,0.8],
    [270,180,0.6],[10,200,1],[300,220,0.6],[160,170,0.8],[120,40,0.6],[240,80,0.6],
  ];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a1228" />
          <stop offset="55%"  stopColor="#04060f" />
          <stop offset="100%" stopColor="#020308" />
        </linearGradient>
        <linearGradient id="cs-curve" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffc935" stopOpacity="0.3" />
          <stop offset="60%"  stopColor="#f5b300" />
          <stop offset="100%" stopColor="#ffc940" />
        </linearGradient>
        <radialGradient id="cs-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ffc940" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffc940" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#fff7d6" />
          <stop offset="40%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#ef2a4c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="368" fill="url(#cs-sky)" />

      {/* stars */}
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.4 + (i % 3) * 0.18} />
      ))}

      {/* city silhouette */}
      <path
        d="M0 320 L0 305 L18 295 L20 308 L40 298 L50 285 L65 285 L65 298 L85 290 L90 275 L105 275 L110 295 L130 288 L145 278 L160 288 L175 275 L190 282 L210 288 L225 278 L245 288 L260 292 L275 282 L290 288 L305 282 L320 292 L320 368 L0 368 Z"
        fill="#0a140f"
      />

      {/* trail haze */}
      <path
        d="M-10 345 Q 70 325, 130 265 T 280 90"
        fill="none" stroke="#ffc935" strokeWidth="22"
        strokeLinecap="round" opacity="0.18"
      />

      {/* main curve */}
      <path
        d="M-10 345 Q 70 325, 130 265 T 280 90"
        fill="none" stroke="url(#cs-curve)" strokeWidth="4" strokeLinecap="round"
      />
      <path
        d="M-10 345 Q 70 325, 130 265 T 280 90"
        fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.55"
      />

      {/* multiplier text */}
      <text x="40" y="80" fontFamily="system-ui, -apple-system, sans-serif" fontSize="42" fontWeight="900" fill="#ffc940">
        2.45×
      </text>

      {/* rocket glow */}
      <circle cx="280" cy="90" r="58" fill="url(#cs-glow)" />

      {/* rocket */}
      <g transform="translate(280 90) rotate(-28)">
        <ellipse cx="0" cy="20" rx="6" ry="22" fill="url(#cs-flame)" />
        <path d="M0 -20 L9 -4 L9 10 L0 16 L-9 10 L-9 -4 Z" fill="#e6fff9" />
        <path d="M0 -20 L9 -4 L9 10 L0 16 Z" fill="#159861" opacity="0.45" />
        <circle cx="0" cy="-6" r="3.5" fill="#ffc935" />
        <circle cx="0" cy="-6" r="1.5" fill="#fff" />
        <path d="M-9 4 L-16 14 L-5 10 Z" fill="#ef2a4c" />
        <path d="M9 4 L16 14 L5 10 Z" fill="#ef2a4c" />
      </g>

      {/* particles */}
      <circle cx="100" cy="280" r="1.4" fill="#ffc935" opacity="0.7" />
      <circle cx="60"  cy="320" r="1"   fill="#ffc935" opacity="0.5" />
      <circle cx="160" cy="220" r="1.2" fill="#ffc940" opacity="0.6" />
      <circle cx="200" cy="180" r="1"   fill="#ffc940" opacity="0.5" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MINES — 5x5 grid, diamonds + 1 detonation
// ─────────────────────────────────────────────────────────────────────────────
function MinesScene() {
  // 5x5 grid of tiles at (gx, gy)
  const grid: Array<{ x: number; y: number; kind: 'hidden' | 'gem' | 'bomb' }> = [];
  const cell = 50, gap = 5, originX = 35, originY = 85;
  const reveal: Record<string, 'gem' | 'bomb'> = {
    '0,1': 'gem', '1,3': 'gem', '2,2': 'bomb', '3,0': 'gem', '4,4': 'gem',
  };
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      grid.push({
        x: originX + c * (cell + gap),
        y: originY + r * (cell + gap),
        kind: reveal[`${r},${c}`] ?? 'hidden',
      });
    }
  }
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ms-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#12201a" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <linearGradient id="ms-hidden" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#213629" />
          <stop offset="100%" stopColor="#12201a" />
        </linearGradient>
        <linearGradient id="ms-gem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffc935" />
          <stop offset="100%" stopColor="#159861" />
        </linearGradient>
        <radialGradient id="ms-bomb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ef2a4c" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ef2a4c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="368" fill="url(#ms-bg)" />

      {/* title hint */}
      <text x="35" y="60" fontFamily="system-ui" fontSize="13" fontWeight="900" fill="#ffc940" letterSpacing="3">
        ROUND • 1.95×
      </text>
      <line x1="35" y1="68" x2="285" y2="68" stroke="#ffc940" strokeWidth="0.6" opacity="0.5" />

      {/* tiles */}
      {grid.map((t, i) => {
        if (t.kind === 'hidden') {
          return (
            <g key={i}>
              <rect x={t.x} y={t.y} width={cell} height={cell} rx="6"
                    fill="url(#ms-hidden)" stroke="#ffc940" strokeWidth="0.4" strokeOpacity="0.3" />
              <text x={t.x + cell/2} y={t.y + cell/2 + 4} textAnchor="middle"
                    fontSize="13" fontWeight="900" fill="#ffc940" opacity="0.55">?</text>
            </g>
          );
        }
        if (t.kind === 'gem') {
          return (
            <g key={i}>
              <rect x={t.x} y={t.y} width={cell} height={cell} rx="6" fill="#12201a" stroke="#ffc935" strokeWidth="1" />
              <circle cx={t.x + cell/2} cy={t.y + cell/2} r="18" fill="#ffc935" opacity="0.18" />
              {/* diamond */}
              <g transform={`translate(${t.x + cell/2} ${t.y + cell/2})`}>
                <path d="M0 -14 L12 -2 L0 16 L-12 -2 Z" fill="url(#ms-gem)" stroke="#e6fff9" strokeWidth="0.8" />
                <path d="M0 -14 L12 -2 L-12 -2 Z" fill="#fff" opacity="0.35" />
                <path d="M-6 -2 L0 -14 L6 -2 Z" fill="#fff" opacity="0.18" />
              </g>
            </g>
          );
        }
        // bomb
        return (
          <g key={i}>
            <rect x={t.x - 3} y={t.y - 3} width={cell + 6} height={cell + 6} rx="9" fill="url(#ms-bomb-glow)" />
            <rect x={t.x} y={t.y} width={cell} height={cell} rx="6" fill="#1a0810" stroke="#ef2a4c" strokeWidth="1.4" />
            <g transform={`translate(${t.x + cell/2} ${t.y + cell/2 + 2})`}>
              <circle r="13" fill="#0a140f" stroke="#ef2a4c" strokeWidth="1.5" />
              <circle cx="-3" cy="-3" r="3" fill="#ef2a4c" opacity="0.55" />
              <path d="M10 -10 L16 -16" stroke="#ffc940" strokeWidth="2" strokeLinecap="round" />
              <circle cx="17" cy="-17" r="2.5" fill="#ffc940" />
              <circle cx="17" cy="-17" r="4.5" fill="#ffc940" opacity="0.4" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLINKO — pegboard + balls + multiplier strip
// ─────────────────────────────────────────────────────────────────────────────
function PlinkoScene() {
  // Triangular peg array — 7 rows
  const pegs: Array<[number, number]> = [];
  const startY = 80, rowGap = 26, colGap = 24;
  for (let r = 0; r < 7; r++) {
    const count = r + 4;
    const totalWidth = (count - 1) * colGap;
    const startX = 160 - totalWidth / 2;
    for (let c = 0; c < count; c++) {
      pegs.push([startX + c * colGap, startY + r * rowGap]);
    }
  }
  // Multiplier slots at bottom — graduating colors
  const slots = [
    { x: 14,  m: '110×', c: '#ef2a4c' },
    { x: 50,  m: '14×',  c: '#ff5870' },
    { x: 86,  m: '5×',   c: '#ffc940' },
    { x: 122, m: '2×',   c: '#ffe48a' },
    { x: 158, m: '0.5×', c: '#ffc935' },
    { x: 194, m: '2×',   c: '#ffe48a' },
    { x: 230, m: '5×',   c: '#ffc940' },
    { x: 266, m: '14×',  c: '#ff5870' },
    { x: 302, m: '110×', c: '#ef2a4c' },
  ];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pk-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a140f" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="pk-ball" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0%"   stopColor="#fff" />
          <stop offset="40%"  stopColor="#ffd76b" />
          <stop offset="100%" stopColor="#159861" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#pk-bg)" />

      {/* pegs */}
      {pegs.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.8" fill="#213629" />
          <circle cx={x} cy={y} r="2.2" fill="#ffc935" opacity="0.85" />
          <circle cx={x - 0.6} cy={y - 0.6} r="0.7" fill="#fff" opacity="0.7" />
        </g>
      ))}

      {/* trails */}
      <path d="M155 50 Q 140 100, 170 150 Q 200 200, 175 250" stroke="#ffc935" strokeWidth="1.5"
            strokeDasharray="2 3" fill="none" opacity="0.5" />

      {/* falling balls */}
      <circle cx="155" cy="50"  r="7"  fill="url(#pk-ball)" />
      <circle cx="170" cy="155" r="6"  fill="url(#pk-ball)" opacity="0.85" />
      <circle cx="175" cy="250" r="5"  fill="url(#pk-ball)" opacity="0.65" />

      {/* divider */}
      <line x1="0" y1="288" x2="320" y2="288" stroke="#213629" strokeWidth="1" />

      {/* multiplier slots */}
      {slots.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y="296" width="32" height="36" rx="6" fill={s.c} opacity="0.92" />
          <rect x={s.x} y="296" width="32" height="6" fill="#fff" opacity="0.25" />
          <text x={s.x + 16} y="320" textAnchor="middle"
                fontSize="10" fontWeight="900" fill="#0a140f"
                fontFamily="system-ui">{s.m}</text>
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BLACKJACK — felt table, dealt hands, chip stacks
// ─────────────────────────────────────────────────────────────────────────────
function BlackjackScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bj-felt" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0%"   stopColor="#0a5d3a" />
          <stop offset="60%"  stopColor="#063d24" />
          <stop offset="100%" stopColor="#02180e" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#bj-felt)" />

      {/* table arc */}
      <ellipse cx="160" cy="180" rx="140" ry="110" fill="none"
               stroke="#ffc940" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" />
      <ellipse cx="160" cy="180" rx="120" ry="90" fill="none"
               stroke="#ffc940" strokeWidth="0.6" opacity="0.18" />

      {/* dealer hand top */}
      <g transform="translate(110 50)">
        {/* face down card */}
        <g transform="rotate(-8)">
          <rect width="50" height="68" rx="6" fill="#ef2a4c" stroke="#0a140f" strokeWidth="1" />
          <rect x="3" y="3" width="44" height="62" rx="4" fill="none" stroke="#ffc940" strokeWidth="0.6" />
          <text x="25" y="42" textAnchor="middle" fontSize="20" fontWeight="900" fill="#ffc940" fontFamily="system-ui">C7</text>
        </g>
        {/* 10 of spades */}
        <g transform="translate(38 6) rotate(8)">
          <rect width="50" height="68" rx="6" fill="#fff" stroke="#0a140f" strokeWidth="1" />
          <text x="6" y="16" fontSize="13" fontWeight="900" fill="#0a140f" fontFamily="system-ui">10</text>
          <text x="6" y="28" fontSize="12" fill="#0a140f">♠</text>
          <text x="25" y="48" textAnchor="middle" fontSize="22" fill="#0a140f">♠</text>
        </g>
      </g>

      {/* center text */}
      <text x="160" y="190" textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffc940" letterSpacing="4">
        BLACKJACK 21
      </text>
      <line x1="100" y1="200" x2="220" y2="200" stroke="#ffc940" strokeWidth="0.5" opacity="0.5" />

      {/* player hand bottom */}
      <g transform="translate(85 218)">
        {/* Ace of spades */}
        <g transform="rotate(-10)">
          <rect width="58" height="80" rx="7" fill="#fff" stroke="#0a140f" strokeWidth="1" />
          <text x="7" y="20" fontSize="16" fontWeight="900" fill="#0a140f" fontFamily="system-ui">A</text>
          <text x="7" y="34" fontSize="14" fill="#0a140f">♠</text>
          <path d="M29 36 L40 56 L18 56 Z" fill="#0a140f" />
          <circle cx="29" cy="56" r="6" fill="#0a140f" />
        </g>
        {/* King of hearts */}
        <g transform="translate(58 0) rotate(10)">
          <rect width="58" height="80" rx="7" fill="#fff" stroke="#0a140f" strokeWidth="1" />
          <text x="7" y="20" fontSize="16" fontWeight="900" fill="#ef2a4c" fontFamily="system-ui">K</text>
          <text x="7" y="34" fontSize="14" fill="#ef2a4c">♥</text>
          <path d="M29 38 C 22 30, 16 42, 29 56 C 42 42, 36 30, 29 38 Z" fill="#ef2a4c" />
        </g>
      </g>

      {/* chip stacks */}
      <g transform="translate(225 308)">
        <ellipse cx="0" cy="0"  rx="22" ry="6"  fill="#ef2a4c" stroke="#fff" strokeWidth="0.8" strokeDasharray="2 2" />
        <ellipse cx="0" cy="-6" rx="22" ry="6"  fill="#ffc940" stroke="#fff" strokeWidth="0.8" strokeDasharray="2 2" />
        <ellipse cx="0" cy="-12" rx="22" ry="6" fill="#ffc935" stroke="#fff" strokeWidth="0.8" strokeDasharray="2 2" />
        <ellipse cx="0" cy="-18" rx="22" ry="6" fill="#ef2a4c" stroke="#fff" strokeWidth="0.8" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ROULETTE — oblique wheel + ball + betting strip
// ─────────────────────────────────────────────────────────────────────────────
function RouletteScene() {
  const pockets = 16;
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rl-bg" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0%"   stopColor="#3a2010" />
          <stop offset="100%" stopColor="#08040a" />
        </radialGradient>
        <radialGradient id="rl-hub" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="60%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#704c00" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#rl-bg)" />

      {/* outer ring */}
      <ellipse cx="160" cy="150" rx="135" ry="75" fill="#2a1808" stroke="#ffc940" strokeWidth="2" />
      <ellipse cx="160" cy="150" rx="125" ry="68" fill="#0a140f" />

      {/* pockets */}
      {Array.from({ length: pockets }).map((_, i) => {
        const a = (i / pockets) * Math.PI * 2;
        const rx = 110, ry = 56;
        const x = 160 + Math.cos(a) * rx;
        const y = 150 + Math.sin(a) * ry;
        const color = i % 2 === 0 ? '#ef2a4c' : '#0a0a0a';
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="14" ry="10" fill={color} stroke="#ffc940" strokeWidth="0.6" />
            <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff" fontFamily="system-ui">
              {(i * 2 + 1) % 37}
            </text>
          </g>
        );
      })}

      {/* hub */}
      <ellipse cx="160" cy="150" rx="38" ry="22" fill="url(#rl-hub)" stroke="#704c00" strokeWidth="1" />
      <ellipse cx="160" cy="146" rx="12" ry="7" fill="#fff" opacity="0.4" />
      <line x1="160" y1="120" x2="160" y2="180" stroke="#704c00" strokeWidth="1" />
      <line x1="125" y1="150" x2="195" y2="150" stroke="#704c00" strokeWidth="1" />

      {/* ball */}
      <circle cx="245" cy="135" r="5" fill="#fff" />
      <circle cx="243" cy="133" r="1.5" fill="#fff" opacity="1" />
      <circle cx="245" cy="135" r="8" fill="#fff" opacity="0.25" />

      {/* betting strip */}
      <g transform="translate(20 245)">
        <rect width="280" height="90" rx="8" fill="#02180e" stroke="#ffc940" strokeWidth="0.6" />
        {Array.from({ length: 12 }).map((_, i) => {
          const cells = [
            { color: '#ef2a4c', n: i * 3 + 1 },
            { color: '#0a0a0a', n: i * 3 + 2 },
            { color: '#ef2a4c', n: i * 3 + 3 },
          ];
          return cells.map((c, j) => (
            <g key={`${i}-${j}`}>
              <rect x={4 + i * 23} y={4 + j * 28} width="22" height="26" rx="3" fill={c.color}
                    stroke="#ffc940" strokeWidth="0.4" />
              <text x={15 + i * 23} y={20 + j * 28} textAnchor="middle"
                    fontSize="9" fontWeight="900" fill="#fff" fontFamily="system-ui">
                {c.n}
              </text>
            </g>
          ));
        })}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DICE — pair of dice mid-tumble + motion trails
// ─────────────────────────────────────────────────────────────────────────────
function DiceScene() {
  const Pip = ({ cx, cy }: { cx: number; cy: number }) => <circle cx={cx} cy={cy} r="3" fill="#0a140f" />;
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a140f" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="dc-zone" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ffc935" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffc935" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#dc-bg)" />

      {/* motion lines */}
      <g stroke="#ffc935" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <line x1="35"  y1="100" x2="78"  y2="118" />
        <line x1="25"  y1="135" x2="68"  y2="148" />
        <line x1="40"  y1="170" x2="80"  y2="178" />
        <line x1="180" y1="80"  x2="225" y2="100" />
        <line x1="170" y1="120" x2="218" y2="138" />
        <line x1="190" y1="160" x2="232" y2="170" />
      </g>

      {/* landing zone glow */}
      <ellipse cx="160" cy="320" rx="130" ry="22" fill="url(#dc-zone)" />
      <ellipse cx="160" cy="320" rx="100" ry="14" fill="none" stroke="#ffc935" strokeWidth="0.6" opacity="0.4" strokeDasharray="3 3" />

      {/* die 1 — showing 5 */}
      <g transform="translate(95 145) rotate(-12)">
        <rect x="-32" y="-32" width="64" height="64" rx="10" fill="#fff" stroke="#12201a" strokeWidth="2" />
        <rect x="-32" y="-32" width="64" height="20" fill="#0a140f" opacity="0.06" />
        <Pip cx={-18} cy={-18} />
        <Pip cx={18}  cy={-18} />
        <Pip cx={0}   cy={0} />
        <Pip cx={-18} cy={18} />
        <Pip cx={18}  cy={18} />
      </g>

      {/* die 2 — showing 3 */}
      <g transform="translate(215 175) rotate(15)">
        <rect x="-32" y="-32" width="64" height="64" rx="10" fill="#ffc940" stroke="#12201a" strokeWidth="2" />
        <rect x="-32" y="-32" width="64" height="20" fill="#0a140f" opacity="0.08" />
        <Pip cx={-18} cy={-18} />
        <Pip cx={0}   cy={0} />
        <Pip cx={18}  cy={18} />
      </g>

      {/* sparkles */}
      <circle cx="60"  cy="250" r="1.6" fill="#ffc935" opacity="0.75" />
      <circle cx="270" cy="240" r="1.4" fill="#ffc940" opacity="0.7" />
      <circle cx="155" cy="80"  r="1.4" fill="#fff" opacity="0.8" />
      <circle cx="40"  cy="60"  r="1"   fill="#fff" opacity="0.6" />
      <circle cx="285" cy="90"  r="1.2" fill="#fff" opacity="0.7" />

      {/* total bottom-left */}
      <text x="20" y="358" fontSize="10" fontWeight="900" fill="#ffc940" letterSpacing="3" fontFamily="system-ui">
        TOTAL · 8
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 7. PLANE (Aviator / Spaceman / JetX) — full-bleed flight scene
// ─────────────────────────────────────────────────────────────────────────────
function PlaneScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a3050" />
          <stop offset="60%"  stopColor="#04060f" />
          <stop offset="100%" stopColor="#02030a" />
        </linearGradient>
        <linearGradient id="pl-trail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ef2a4c" stopOpacity="0.0" />
          <stop offset="60%"  stopColor="#ff5870" />
          <stop offset="100%" stopColor="#ffc940" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#pl-sky)" />
      {/* cloud strokes */}
      <path d="M-10 280 Q 80 270, 150 285 T 330 275" fill="none" stroke="#fff" strokeWidth="14" opacity="0.06" />
      <path d="M-10 320 Q 100 310, 180 320 T 330 315" fill="none" stroke="#fff" strokeWidth="20" opacity="0.04" />
      {/* trail */}
      <path d="M-10 340 Q 70 320, 130 270 T 270 100" fill="none" stroke="url(#pl-trail)" strokeWidth="3" strokeLinecap="round" />
      <path d="M-10 340 Q 70 320, 130 270 T 270 100" fill="none" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      {/* plane */}
      <g transform="translate(270 100) rotate(-32)">
        <path d="M-32 0 L20 -3 L34 0 L20 3 Z" fill="#f5f7fa" />
        <path d="M-10 -12 L12 -3 L-12 -3 Z" fill="#ef2a4c" />
        <path d="M-10 12 L12 3 L-12 3 Z" fill="#c81030" />
        <circle cx="22" cy="0" r="2" fill="#ffc935" />
        <ellipse cx="-30" cy="0" rx="6" ry="3" fill="#ffc940" opacity="0.85" />
      </g>
      {/* multiplier */}
      <text x="36" y="76" fontFamily="system-ui" fontSize="42" fontWeight="900" fill="#ef2a4c">3.20×</text>
      {/* stars */}
      {[[40,30,1.2],[120,20,0.8],[200,40,1],[260,30,0.8],[290,55,1]].map(([x,y,r],i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill="#fff" opacity="0.6" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. SLOT MACHINE — premium reels (fallback for slot games)
// ─────────────────────────────────────────────────────────────────────────────
function SlotMachineScene({ tint = '#ffc940', accent = '#ef2a4c' }: { tint?: string; accent?: string }) {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a1028" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="sm-glow" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%"   stopColor={tint} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#sm-bg)" />
      <rect width="320" height="368" fill="url(#sm-glow)" />

      {/* cabinet */}
      <rect x="24" y="72" width="272" height="216" rx="22" fill="#12201a" stroke={tint} strokeWidth="2.4" />
      <rect x="24" y="72" width="272" height="44" rx="22" fill={tint} opacity="0.18" />
      <text x="160" y="100" textAnchor="middle" fontSize="14" fontWeight="900" fill={tint} fontFamily="system-ui" letterSpacing="6">JACKPOT</text>

      {/* three reels */}
      {[40, 120, 200].map((x, i) => (
        <g key={i}>
          <rect x={x} y="128" width="80" height="144" rx="10" fill="#0a140f" stroke={tint} strokeWidth="1" opacity="0.95" />
          {/* symbol top */}
          <g transform={`translate(${x + 40} 162)`} opacity="0.45">
            {i === 0 && <circle r="14" fill={accent} />}
            {i === 1 && <path d="M0 -14 L14 0 L0 14 L-14 0 Z" fill="#ffc935" />}
            {i === 2 && <text x="-9" y="6" fontSize="22" fontWeight="900" fill={tint} fontFamily="system-ui">7</text>}
          </g>
          {/* symbol center (bright) */}
          <g transform={`translate(${x + 40} 200)`}>
            {i === 0 && <circle r="20" fill={accent} stroke="#fff" strokeWidth="1.2" />}
            {i === 1 && <path d="M0 -20 L20 0 L0 20 L-20 0 Z" fill="#ffc935" stroke="#fff" strokeWidth="1.2" />}
            {i === 2 && <text x="-13" y="9" fontSize="32" fontWeight="900" fill={tint} fontFamily="system-ui" stroke="#fff" strokeWidth="0.5">7</text>}
          </g>
          {/* symbol bottom */}
          <g transform={`translate(${x + 40} 238)`} opacity="0.45">
            {i === 0 && <circle r="14" fill={accent} />}
            {i === 1 && <path d="M0 -14 L14 0 L0 14 L-14 0 Z" fill="#ffc935" />}
            {i === 2 && <text x="-9" y="6" fontSize="22" fontWeight="900" fill={tint} fontFamily="system-ui">7</text>}
          </g>
          {/* winline highlight */}
          <line x1={x} y1="200" x2={x + 80} y2="200" stroke={tint} strokeWidth="0.8" opacity="0.3" />
        </g>
      ))}

      {/* lever */}
      <rect x="290" y="148" width="6" height="80" rx="3" fill={tint} />
      <circle cx="293" cy="146" r="8" fill={accent} stroke={tint} strokeWidth="1.5" />
    </svg>
  );
}
function SlotGoldRed()    { return <SlotMachineScene tint="#ffc940" accent="#ef2a4c" />; }
function SlotAquaPurple() { return <SlotMachineScene tint="#ffc935" accent="#ef2a4c" />; }

// ─────────────────────────────────────────────────────────────────────────────
// 9. CANDY — Sweet Bonanza / Fruit Party
// ─────────────────────────────────────────────────────────────────────────────
function CandyScene() {
  const sweets = [
    { x: 70,  y: 130, r: 22, c: '#ef2a4c' }, // red
    { x: 160, y: 95,  r: 26, c: '#ffc940' }, // gold
    { x: 250, y: 130, r: 22, c: '#a855f7' }, // purple
    { x: 100, y: 200, r: 20, c: '#ffc935' }, // green
    { x: 200, y: 200, r: 20, c: '#ff5870' }, // pink
    { x: 160, y: 250, r: 24, c: '#3b82f6' }, // blue
    { x: 50,  y: 270, r: 16, c: '#ffe48a' },
    { x: 270, y: 270, r: 16, c: '#ffd76b' },
  ];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cd-bg" cx="0.5" cy="0.3" r="0.7">
          <stop offset="0%"   stopColor="#6a2050" />
          <stop offset="100%" stopColor="#0c0414" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#cd-bg)" />
      {sweets.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y + 4} r={s.r} fill="#0a140f" opacity="0.35" />
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.c} stroke="#fff" strokeWidth="1.2" />
          <circle cx={s.x - s.r * 0.35} cy={s.y - s.r * 0.35} r={s.r * 0.32} fill="#fff" opacity="0.5" />
          <path d={`M${s.x - s.r * 0.6} ${s.y} Q ${s.x - s.r * 1.2} ${s.y + s.r * 0.5}, ${s.x - s.r * 1.4} ${s.y - s.r * 0.2}`} fill="none" stroke={s.c} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d={`M${s.x + s.r * 0.6} ${s.y} Q ${s.x + s.r * 1.2} ${s.y - s.r * 0.5}, ${s.x + s.r * 1.4} ${s.y + s.r * 0.2}`} fill="none" stroke={s.c} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </g>
      ))}
      {/* sparkles */}
      <circle cx="40" cy="80" r="2" fill="#fff" />
      <circle cx="280" cy="60" r="1.5" fill="#fff" />
      <circle cx="20" cy="200" r="1" fill="#ffc940" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. OLYMPUS — Gates of Olympus (Zeus lightning + column)
// ─────────────────────────────────────────────────────────────────────────────
function OlympusScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ol-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a2855" />
          <stop offset="60%"  stopColor="#0a0f28" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <linearGradient id="ol-col" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="100%" stopColor="#704c00" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#ol-bg)" />
      {/* clouds */}
      <ellipse cx="60"  cy="80"  rx="40" ry="14" fill="#ffc940" opacity="0.18" />
      <ellipse cx="240" cy="60"  rx="48" ry="16" fill="#ffc940" opacity="0.14" />
      <ellipse cx="160" cy="110" rx="60" ry="20" fill="#ffc940" opacity="0.10" />
      {/* column */}
      <rect x="130" y="160" width="60" height="170" fill="url(#ol-col)" />
      <rect x="120" y="155" width="80" height="14" rx="2" fill="#ffe48a" />
      <rect x="120" y="325" width="80" height="14" rx="2" fill="#ffe48a" />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={140 + i * 12} y1="170" x2={140 + i * 12} y2="324" stroke="#704c00" strokeWidth="1" opacity="0.4" />
      ))}
      {/* lightning */}
      <path d="M170 40 L130 130 L160 130 L120 220 L170 160 L150 160 L185 80 Z" fill="#ffc940" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M170 40 L130 130 L160 130 L120 220" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.7" />
      {/* glow */}
      <circle cx="160" cy="130" r="40" fill="#ffc940" opacity="0.18" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. WOLF — Wolf Gold (wolf silhouette + moon)
// ─────────────────────────────────────────────────────────────────────────────
function WolfScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wf-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a1f10" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="wf-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="80%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#ffc940" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#wf-bg)" />
      {/* moon */}
      <circle cx="160" cy="120" r="62" fill="url(#wf-moon)" />
      {/* mountains */}
      <path d="M0 280 L60 220 L110 250 L160 200 L220 240 L280 215 L320 250 L320 368 L0 368 Z" fill="#0a140f" />
      <path d="M0 290 L40 260 L90 280 L140 240 L200 270 L260 250 L320 280 L320 368 L0 368 Z" fill="#12201a" />
      {/* wolf silhouette (howling pose) */}
      <g transform="translate(160 270)" fill="#0a140f">
        <path d="M-30 30 Q -36 6, -22 -2 L -18 -16 Q -8 -30, 0 -38 Q 8 -52, 20 -42 L 22 -28 L 30 -22 L 36 -10 L 36 6 L 28 14 L 30 28 L 18 32 L 8 28 L -6 32 L -18 32 Z" />
        <circle cx="22" cy="-30" r="1.6" fill="#ffc940" />
      </g>
      {/* stars */}
      <circle cx="40" cy="50" r="1.2" fill="#fff" />
      <circle cx="280" cy="40" r="1" fill="#fff" />
      <circle cx="60" cy="100" r="0.8" fill="#fff" />
      <circle cx="260" cy="80" r="0.8" fill="#fff" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. STARBURST — radial gem starburst pattern
// ─────────────────────────────────────────────────────────────────────────────
function StarburstScene() {
  const gems = [
    { angle:   0, c: '#ef2a4c' }, { angle:  60, c: '#ffc940' },
    { angle: 120, c: '#ffc935' }, { angle: 180, c: '#3b82f6' },
    { angle: 240, c: '#a855f7' }, { angle: 300, c: '#ffc935' },
  ];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="st-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%"   stopColor="#3a0a4c" />
          <stop offset="100%" stopColor="#0a140f" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#st-bg)" />
      {/* radial rays */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30) * Math.PI / 180;
        return (
          <line key={i}
            x1={160 + Math.cos(a) * 30}
            y1={184 + Math.sin(a) * 30}
            x2={160 + Math.cos(a) * 200}
            y2={184 + Math.sin(a) * 200}
            stroke="#fff" strokeWidth="0.8" opacity="0.15"
          />
        );
      })}
      {/* gems */}
      {gems.map((g, i) => {
        const a = (g.angle) * Math.PI / 180;
        const x = 160 + Math.cos(a) * 90;
        const y = 184 + Math.sin(a) * 90;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${g.angle})`}>
            <path d="M0 -18 L14 0 L0 18 L-14 0 Z" fill={g.c} stroke="#fff" strokeWidth="1" />
            <path d="M0 -18 L14 0 L-14 0 Z" fill="#fff" opacity="0.4" />
          </g>
        );
      })}
      {/* center */}
      <circle cx="160" cy="184" r="22" fill="#fff" />
      <circle cx="160" cy="184" r="16" fill="#ffc940" />
      <path d="M160 174 L168 184 L160 194 L152 184 Z" fill="#fff" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. BOOK — Book of Dead (open book + Egyptian eye)
// ─────────────────────────────────────────────────────────────────────────────
function BookScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bk-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a2810" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="bk-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ffc940" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffc940" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#bk-bg)" />
      <ellipse cx="160" cy="190" rx="120" ry="80" fill="url(#bk-glow)" />
      {/* book base */}
      <path d="M60 240 L160 220 L260 240 L260 290 L160 270 L60 290 Z" fill="#704c00" stroke="#ffc940" strokeWidth="1.2" />
      {/* pages */}
      <path d="M60 240 L160 220 L160 270 L60 290 Z" fill="#f5e8c8" />
      <path d="M260 240 L160 220 L160 270 L260 290 Z" fill="#e8d4a8" />
      <path d="M160 220 L160 270" stroke="#704c00" strokeWidth="1.2" />
      {/* eye glyph */}
      <g transform="translate(110 254)">
        <path d="M-22 0 Q 0 -14, 22 0 Q 0 14, -22 0 Z" fill="none" stroke="#704c00" strokeWidth="1.6" />
        <circle r="6" fill="#704c00" />
        <circle r="2" fill="#ffc940" />
        <path d="M-22 0 L-28 8 M22 0 L28 8" stroke="#704c00" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      {/* hieroglyphs */}
      <g transform="translate(210 254)" stroke="#704c00" strokeWidth="1" fill="none">
        <path d="M-12 -6 L0 -10 L12 -6 L12 6 L0 10 L-12 6 Z" />
        <path d="M-6 -2 L6 -2 M-4 4 L4 4" strokeWidth="0.8" />
      </g>
      {/* scarab */}
      <g transform="translate(160 130)">
        <ellipse cx="0" cy="0" rx="18" ry="14" fill="#ffc940" stroke="#fff" strokeWidth="0.8" />
        <ellipse cx="0" cy="-2" rx="10" ry="8" fill="#704c00" />
        <line x1="-18" y1="-4" x2="-28" y2="-10" stroke="#ffc940" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="-4" x2="28" y2="-10" stroke="#ffc940" strokeWidth="2" strokeLinecap="round" />
        <line x1="-18" y1="4" x2="-28" y2="10" stroke="#ffc940" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="4" x2="28" y2="10" stroke="#ffc940" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. SKULL — Doom of Dead / Razor Shark / dark slots
// ─────────────────────────────────────────────────────────────────────────────
function SkullScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sk-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a0612" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#sk-bg)" />
      {/* flames */}
      <path d="M40 350 Q 60 280, 80 350" fill="#ef2a4c" opacity="0.6" />
      <path d="M50 350 Q 65 300, 78 350" fill="#ffc940" opacity="0.8" />
      <path d="M240 350 Q 260 285, 280 350" fill="#ef2a4c" opacity="0.6" />
      <path d="M252 350 Q 265 305, 278 350" fill="#ffc940" opacity="0.8" />
      {/* skull */}
      <g transform="translate(160 190)">
        <path d="M-58 -10 Q -58 -70, 0 -70 Q 58 -70, 58 -10 L 50 30 L 32 30 L 32 50 L 18 50 L 18 30 L -18 30 L -18 50 L -32 50 L -32 30 L -50 30 Z" fill="#f5f7fa" stroke="#1a1028" strokeWidth="1.5" />
        {/* eye sockets */}
        <ellipse cx="-22" cy="-20" rx="14" ry="16" fill="#0a140f" />
        <ellipse cx="22"  cy="-20" rx="14" ry="16" fill="#0a140f" />
        <circle cx="-22" cy="-20" r="6" fill="#ef2a4c" />
        <circle cx="22"  cy="-20" r="6" fill="#ef2a4c" />
        {/* nose */}
        <path d="M-3 0 L0 -8 L3 0 L0 8 Z" fill="#0a140f" />
        {/* teeth */}
        <line x1="-14" y1="30" x2="-14" y2="50" stroke="#1a1028" strokeWidth="0.8" />
        <line x1="-6"  y1="30" x2="-6"  y2="50" stroke="#1a1028" strokeWidth="0.8" />
        <line x1="6"   y1="30" x2="6"   y2="50" stroke="#1a1028" strokeWidth="0.8" />
        <line x1="14"  y1="30" x2="14"  y2="50" stroke="#1a1028" strokeWidth="0.8" />
      </g>
      {/* embers */}
      <circle cx="100" cy="80"  r="1.2" fill="#ffc940" opacity="0.8" />
      <circle cx="220" cy="60"  r="1"   fill="#ef2a4c" opacity="0.7" />
      <circle cx="50"  cy="120" r="0.8" fill="#ffc940" opacity="0.6" />
      <circle cx="270" cy="100" r="1.4" fill="#ef2a4c" opacity="0.8" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. GAME SHOW — Crazy Time / Monopoly Live (spotlight + segment wheel)
// ─────────────────────────────────────────────────────────────────────────────
function GameShowScene() {
  const segments = ['#ef2a4c','#ffc940','#ffc935','#ffc935','#a855f7','#ff5870','#3b82f6','#ffe48a'];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gs-bg" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%"   stopColor="#3a1a55" />
          <stop offset="100%" stopColor="#0a140f" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#gs-bg)" />
      {/* spotlight beams */}
      <path d="M30 0 L160 200 L160 0 Z" fill="#fff" opacity="0.04" />
      <path d="M290 0 L160 200 L160 0 Z" fill="#fff" opacity="0.04" />
      <path d="M160 0 L120 200 L200 200 Z" fill="#fff" opacity="0.05" />
      {/* wheel */}
      <g transform="translate(160 230)">
        <circle r="92" fill="#0a140f" stroke="#ffc940" strokeWidth="2.5" />
        {segments.map((c, i) => {
          const a1 = (i * 45 - 90) * Math.PI / 180;
          const a2 = ((i + 1) * 45 - 90) * Math.PI / 180;
          const r = 88;
          const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
          const x2 = Math.cos(a2) * r, y2 = Math.sin(a2) * r;
          return <path key={i} d={`M0 0 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={c} stroke="#fff" strokeWidth="0.6" opacity="0.95" />;
        })}
        <circle r="14" fill="#fff" />
        <circle r="6"  fill="#ffc940" />
      </g>
      {/* pointer */}
      <path d="M160 130 L150 148 L170 148 Z" fill="#ffc940" stroke="#fff" strokeWidth="1" />
      {/* sparkles */}
      <circle cx="50"  cy="60"  r="2"   fill="#fff" />
      <circle cx="270" cy="50"  r="1.6" fill="#ffc940" />
      <circle cx="40"  cy="160" r="1.4" fill="#fff" />
      <circle cx="280" cy="150" r="1.2" fill="#ffc940" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. MULTIPLIER CARD — HiLo / Keno / Limbo (number + multiplier feel)
// ─────────────────────────────────────────────────────────────────────────────
function MultiplierCardScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a140f" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#mc-bg)" />
      {/* big multiplier */}
      <text x="160" y="160" textAnchor="middle" fontSize="84" fontWeight="900" fill="#ffc940" fontFamily="system-ui" letterSpacing="-3">
        12.50×
      </text>
      <text x="160" y="160" textAnchor="middle" fontSize="84" fontWeight="900" fill="none" stroke="#ffc940" strokeWidth="0.4" opacity="0.4" fontFamily="system-ui" letterSpacing="-3">
        12.50×
      </text>
      <line x1="60" y1="178" x2="260" y2="178" stroke="#ffc940" strokeWidth="0.6" opacity="0.4" />
      {/* three cards */}
      <g transform="translate(80 230) rotate(-12)">
        <rect width="44" height="60" rx="6" fill="#fff" />
        <text x="6" y="16" fontSize="13" fontWeight="900" fill="#ef2a4c" fontFamily="system-ui">7</text>
        <text x="6" y="28" fontSize="11" fill="#ef2a4c">♥</text>
      </g>
      <g transform="translate(140 226)">
        <rect width="44" height="60" rx="6" fill="#fff" />
        <text x="6" y="16" fontSize="13" fontWeight="900" fill="#0a140f" fontFamily="system-ui">J</text>
        <text x="6" y="28" fontSize="11" fill="#0a140f">♠</text>
      </g>
      <g transform="translate(200 230) rotate(12)">
        <rect width="44" height="60" rx="6" fill="#fff" />
        <text x="6" y="16" fontSize="13" fontWeight="900" fill="#ef2a4c" fontFamily="system-ui">Q</text>
        <text x="6" y="28" fontSize="11" fill="#ef2a4c">♦</text>
      </g>
      {/* bottom hint */}
      <text x="160" y="76" textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffc935" letterSpacing="4" fontFamily="system-ui">HI · LO · WIN</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. FISH JUMP — Big Bass Bonanza
// ─────────────────────────────────────────────────────────────────────────────
function FishScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fs-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a3045" />
          <stop offset="55%"  stopColor="#0a1a30" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <linearGradient id="fs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a1a30" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a140f" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#fs-bg)" />
      {/* sun glow */}
      <circle cx="240" cy="80" r="50" fill="#ffc940" opacity="0.18" />
      <circle cx="240" cy="80" r="22" fill="#ffe48a" opacity="0.7" />
      {/* fish jumping */}
      <g transform="translate(140 180) rotate(-25)">
        <path d="M-40 0 Q -30 -16, 0 -14 L 22 -10 L 30 0 L 22 10 L 0 14 Q -30 16, -40 0 Z" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
        <path d="M-40 0 L-58 -14 L-50 0 L-58 14 Z" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
        <circle cx="18" cy="-2" r="2.5" fill="#fff" />
        <circle cx="18" cy="-2" r="1.2" fill="#0a140f" />
        <path d="M-20 -6 Q -10 -10, 10 -6" stroke="#ffc940" strokeWidth="1" fill="none" opacity="0.7" />
      </g>
      {/* splash */}
      <ellipse cx="100" cy="240" rx="50" ry="6" fill="#fff" opacity="0.4" />
      <path d="M70 234 L60 220 M85 230 L80 212 M115 232 L120 216 M130 238 L140 224" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      {/* water surface */}
      <rect x="0" y="240" width="320" height="128" fill="url(#fs-water)" />
      <path d="M0 248 Q 80 240, 160 248 T 320 246" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
      <path d="M0 264 Q 80 256, 160 264 T 320 260" fill="none" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. TRAIN — Money Train
// ─────────────────────────────────────────────────────────────────────────────
function TrainScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a1f3a" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#tr-bg)" />
      {/* smoke clouds */}
      <ellipse cx="100" cy="80"  rx="34" ry="20" fill="#fff" opacity="0.16" />
      <ellipse cx="60"  cy="100" rx="28" ry="16" fill="#fff" opacity="0.12" />
      <ellipse cx="140" cy="60"  rx="24" ry="14" fill="#fff" opacity="0.10" />
      {/* train body */}
      <g transform="translate(80 200)">
        <rect width="160" height="74" rx="10" fill="#704c00" stroke="#ffc940" strokeWidth="2" />
        <rect x="6" y="6" width="148" height="40" rx="6" fill="#12201a" />
        {/* $ symbols on side */}
        <text x="20" y="34" fontSize="24" fontWeight="900" fill="#ffc940" fontFamily="system-ui">$</text>
        <text x="50" y="34" fontSize="24" fontWeight="900" fill="#ffc940" fontFamily="system-ui">$</text>
        <text x="80" y="34" fontSize="24" fontWeight="900" fill="#ffc940" fontFamily="system-ui">$</text>
        <text x="110" y="34" fontSize="24" fontWeight="900" fill="#ffc940" fontFamily="system-ui">$</text>
        {/* wheels */}
        <circle cx="30"  cy="76" r="14" fill="#1a1028" stroke="#ffc940" strokeWidth="2" />
        <circle cx="80"  cy="76" r="14" fill="#1a1028" stroke="#ffc940" strokeWidth="2" />
        <circle cx="130" cy="76" r="14" fill="#1a1028" stroke="#ffc940" strokeWidth="2" />
        <circle cx="30"  cy="76" r="4" fill="#ffc940" />
        <circle cx="80"  cy="76" r="4" fill="#ffc940" />
        <circle cx="130" cy="76" r="4" fill="#ffc940" />
        {/* chimney */}
        <rect x="14" y="-22" width="20" height="22" fill="#ffc940" />
      </g>
      {/* track */}
      <line x1="0" y1="294" x2="320" y2="294" stroke="#ffc940" strokeWidth="1.4" opacity="0.45" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={4 + i * 28} y="298" width="20" height="4" rx="1" fill="#704c00" opacity="0.7" />
      ))}
    </svg>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// SPORTS SCENES — Phase 1
// ─────────────────────────────────────────────────────────────────────────────

// 19. FOOTBALL (Soccer) — flaming soccer ball + goal net
function FootballScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ft-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a3020" />
          <stop offset="60%"  stopColor="#04180e" />
          <stop offset="100%" stopColor="#020a06" />
        </linearGradient>
        <radialGradient id="ft-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#fff7d6" />
          <stop offset="35%"  stopColor="#ffc940" />
          <stop offset="70%"  stopColor="#ef2a4c" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ef2a4c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#ft-bg)" />
      {/* goal net (behind ball) */}
      <g stroke="#fff" strokeWidth="0.6" opacity="0.35" fill="none">
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={40 + i * 27} y1="80" x2={40 + i * 27} y2="240" />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1="40" y1={80 + i * 27} x2="280" y2={80 + i * 27} />
        ))}
      </g>
      {/* goal frame */}
      <path d="M40 80 L40 240 L280 240 L280 80 Z" fill="none" stroke="#fff" strokeWidth="3" opacity="0.85" />
      {/* flame halo */}
      <circle cx="160" cy="220" r="90" fill="url(#ft-flame)" />
      {/* soccer ball */}
      <g transform="translate(160 220)">
        <circle r="46" fill="#fff" stroke="#0a140f" strokeWidth="1.5" />
        {/* black pentagons */}
        <path d="M0 -30 L18 -18 L11 4 L-11 4 L-18 -18 Z" fill="#0a140f" />
        <path d="M-46 -6 L-30 -20 L-18 -18 L-24 4 L-38 4 Z" fill="#0a140f" opacity="0.85" />
        <path d="M46 -6 L30 -20 L18 -18 L24 4 L38 4 Z" fill="#0a140f" opacity="0.85" />
        <path d="M-20 20 L-11 4 L11 4 L20 20 L0 34 Z" fill="#0a140f" opacity="0.85" />
        {/* motion arcs */}
        <path d="M-52 0 L-64 -8 M-52 12 L-66 14 M52 0 L64 -8 M52 12 L66 14" stroke="#ffc940" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
      {/* trail flames */}
      <path d="M120 300 Q 100 260, 140 250" fill="#ef2a4c" opacity="0.55" />
      <path d="M200 300 Q 220 260, 180 250" fill="#ef2a4c" opacity="0.55" />
      <path d="M130 300 Q 118 268, 148 258" fill="#ffc940" opacity="0.7" />
      <path d="M190 300 Q 202 268, 172 258" fill="#ffc940" opacity="0.7" />
    </svg>
  );
}

// 20. CRICKET-X — flaming cricket ball + bat + wickets
function CricketXScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cx-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a1a10" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="cx-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#fff7d6" />
          <stop offset="45%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#ef2a4c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#cx-bg)" />
      {/* wickets (3 gold stumps) */}
      <g transform="translate(160 240)">
        {[-14, 0, 14].map((x, i) => (
          <g key={i}>
            <rect x={x - 3} y="0" width="6" height="80" fill="url(#cx-wicket)" />
            <rect x={x - 3} y="0" width="6" height="80" fill="#ffc940" />
            <rect x={x - 3} y="0" width="6" height="16" fill="#fff" opacity="0.3" />
          </g>
        ))}
        {/* bails */}
        <rect x="-14" y="-4" width="14" height="4" fill="#ffe48a" />
        <rect x="0"   y="-4" width="14" height="4" fill="#ffe48a" />
      </g>
      {/* bat behind (angled) */}
      <g transform="translate(90 200) rotate(30)">
        <rect x="-8" y="0" width="16" height="80" rx="4" fill="#c48a3a" />
        <rect x="-8" y="0" width="16" height="6" fill="#8a5a20" />
        <rect x="-4" y="80" width="8" height="30" fill="#704c00" />
        <rect x="-8" y="0" width="16" height="80" fill="none" stroke="#ffc940" strokeWidth="0.8" />
      </g>
      {/* flame trail */}
      <path d="M40 60 Q 100 80, 180 130" stroke="#ffc940" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M40 60 Q 100 80, 180 130" stroke="#ef2a4c" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.22" />
      {/* flaming ball */}
      <circle cx="180" cy="130" r="55" fill="url(#cx-flame)" />
      <g transform="translate(180 130)">
        <circle r="22" fill="#c81030" stroke="#0a140f" strokeWidth="1.4" />
        <circle r="22" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="3 2" opacity="0.9" />
        <path d="M-12 -18 L12 -18 M-14 18 L14 18" stroke="#fff" strokeWidth="1" opacity="0.85" />
        <circle cx="-7" cy="-6" r="4" fill="#ef2a4c" opacity="0.7" />
      </g>
      {/* X letter */}
      <text x="270" y="80" fontSize="42" fontWeight="900" fill="#ffc940" fontFamily="system-ui" opacity="0.85">X</text>
    </svg>
  );
}

// 21. IPL TROPHY — trophy + bat + ball, gold
function IplTrophyScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ip-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%"   stopColor="#3a1f45" />
          <stop offset="100%" stopColor="#0a140f" />
        </radialGradient>
        <linearGradient id="ip-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="50%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#704c00" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#ip-bg)" />
      {/* radial rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45) * Math.PI / 180;
        return (
          <line key={i}
            x1={160 + Math.cos(a) * 40} y1={170 + Math.sin(a) * 40}
            x2={160 + Math.cos(a) * 190} y2={170 + Math.sin(a) * 190}
            stroke="#ffc940" strokeWidth="1" opacity="0.15"
          />
        );
      })}
      {/* trophy */}
      <g transform="translate(160 170)">
        {/* handles */}
        <path d="M-44 -30 Q -66 -30, -66 -8 Q -66 20, -44 20" fill="none" stroke="url(#ip-cup)" strokeWidth="6" />
        <path d="M44 -30 Q 66 -30, 66 -8 Q 66 20, 44 20" fill="none" stroke="url(#ip-cup)" strokeWidth="6" />
        {/* cup body */}
        <path d="M-40 -45 L40 -45 L34 30 Q 34 40, 24 44 L-24 44 Q -34 40, -34 30 Z" fill="url(#ip-cup)" stroke="#704c00" strokeWidth="1.2" />
        {/* shine */}
        <path d="M-30 -40 L-24 25" stroke="#fff" strokeWidth="3" opacity="0.5" />
        <path d="M-16 -40 L-14 20" stroke="#fff" strokeWidth="1" opacity="0.4" />
        {/* stem */}
        <rect x="-8" y="44" width="16" height="18" fill="url(#ip-cup)" />
        {/* base */}
        <rect x="-30" y="62" width="60" height="12" rx="3" fill="url(#ip-cup)" stroke="#704c00" strokeWidth="0.8" />
        {/* star medal */}
        <path d="M0 -22 L4 -10 L16 -10 L6 -3 L10 8 L0 2 L-10 8 L-6 -3 L-16 -10 L-4 -10 Z" fill="#ef2a4c" stroke="#fff" strokeWidth="0.8" />
      </g>
      {/* bat + ball at bottom */}
      <g transform="translate(80 300) rotate(-30)">
        <rect x="-6" y="0" width="12" height="46" rx="3" fill="#c48a3a" />
        <rect x="-6" y="0" width="12" height="4" fill="#8a5a20" />
      </g>
      <circle cx="230" cy="315" r="14" fill="#c81030" stroke="#0a140f" strokeWidth="1" />
      <path d="M223 315 Q 230 310, 237 315" fill="none" stroke="#fff" strokeWidth="0.8" />
      {/* IPL text */}
      <text x="160" y="335" textAnchor="middle" fontSize="12" fontWeight="900" fill="#ffc940" letterSpacing="6" fontFamily="system-ui">CHAMPIONS</text>
    </svg>
  );
}

// 22. BASKETBALL — flaming basketball + hoop
function BasketballScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bb-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a1810" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <radialGradient id="bb-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#fff7d6" />
          <stop offset="35%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#ef2a4c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#bb-bg)" />
      {/* backboard */}
      <rect x="70" y="60" width="180" height="80" rx="6" fill="#f5f7fa" stroke="#0a140f" strokeWidth="1.5" />
      <rect x="130" y="90" width="60" height="34" fill="none" stroke="#ef2a4c" strokeWidth="2.5" />
      {/* rim */}
      <ellipse cx="160" cy="150" rx="42" ry="8" fill="none" stroke="#ef2a4c" strokeWidth="4" />
      {/* net */}
      <g stroke="#fff" strokeWidth="1" opacity="0.7" fill="none">
        <path d="M126 150 L124 200" /><path d="M136 150 L138 205" />
        <path d="M148 154 L150 210" /><path d="M160 154 L160 214" />
        <path d="M172 154 L170 210" /><path d="M184 150 L182 205" />
        <path d="M194 150 L196 200" />
        <path d="M124 200 L134 202 L146 205 L160 208 L174 205 L186 202 L196 200" />
      </g>
      {/* flame halo */}
      <circle cx="160" cy="270" r="80" fill="url(#bb-flame)" />
      {/* basketball */}
      <g transform="translate(160 270)">
        <circle r="46" fill="#ef7020" stroke="#0a140f" strokeWidth="1.5" />
        <path d="M-46 0 L46 0" stroke="#0a140f" strokeWidth="2" />
        <path d="M0 -46 L0 46" stroke="#0a140f" strokeWidth="2" />
        <path d="M-40 -22 Q 0 -18, 40 -22" stroke="#0a140f" strokeWidth="1.4" fill="none" />
        <path d="M-40 22  Q 0 18,  40 22"  stroke="#0a140f" strokeWidth="1.4" fill="none" />
        {/* shine */}
        <ellipse cx="-14" cy="-14" rx="8" ry="6" fill="#fff" opacity="0.35" />
      </g>
      {/* flame tails */}
      <path d="M115 340 Q 105 305, 140 300" fill="#ef2a4c" opacity="0.6" />
      <path d="M205 340 Q 215 305, 180 300" fill="#ffc940" opacity="0.8" />
    </svg>
  );
}

// 23. TENNIS — ball + racket, gold on green court
function TennisScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tn-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a4a20" />
          <stop offset="60%"  stopColor="#04180e" />
          <stop offset="100%" stopColor="#020a06" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#tn-bg)" />
      {/* court lines */}
      <rect x="30" y="90" width="260" height="240" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
      <line x1="30" y1="210" x2="290" y2="210" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
      <line x1="160" y1="90" x2="160" y2="330" stroke="#fff" strokeWidth="0.8" opacity="0.35" strokeDasharray="6 4" />
      {/* racket (angled) */}
      <g transform="translate(100 200) rotate(-32)">
        {/* handle */}
        <rect x="-8" y="30" width="16" height="72" rx="6" fill="#704c00" stroke="#ffc940" strokeWidth="1" />
        <rect x="-4" y="42" width="8" height="6" fill="#8a5a20" />
        <rect x="-4" y="58" width="8" height="6" fill="#8a5a20" />
        <rect x="-4" y="74" width="8" height="6" fill="#8a5a20" />
        {/* head */}
        <ellipse cx="0" cy="0" rx="48" ry="60" fill="none" stroke="url(#ip-cup)" strokeWidth="6" />
        <ellipse cx="0" cy="0" rx="45" ry="57" fill="#0a140f" opacity="0.6" />
        {/* strings */}
        <g stroke="#fff" strokeWidth="0.7" opacity="0.7">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`s${i}`} x1={-42 + i * 10} y1="-52" x2={-42 + i * 10} y2="52" />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`c${i}`} x1="-42" y1={-52 + i * 10} x2="42" y2={-52 + i * 10} />
          ))}
        </g>
      </g>
      {/* ball with motion curve */}
      <path d="M100 100 Q 180 130, 230 180" stroke="#ffc940" strokeWidth="1.5" fill="none" strokeDasharray="4 4" opacity="0.6" />
      <circle cx="230" cy="180" r="18" fill="#dfff5a" stroke="#0a140f" strokeWidth="1" />
      <path d="M215 172 Q 230 168, 245 172" fill="none" stroke="#fff" strokeWidth="1.2" />
      <path d="M215 188 Q 230 192, 245 188" fill="none" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}

// 24. E-SPORTS — gold gamepad, neon grid
function EsportsScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="es-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a0a55" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <linearGradient id="es-pad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="100%" stopColor="#704c00" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#es-bg)" />
      {/* horizon neon grid */}
      <g stroke="#21c07e" strokeWidth="0.8" opacity="0.5">
        <line x1="0" y1="270" x2="320" y2="270" />
        <line x1="0" y1="290" x2="320" y2="290" opacity="0.7" />
        <line x1="0" y1="315" x2="320" y2="315" opacity="0.5" />
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((x) => (
          <line key={x} x1="160" y1="270" x2={x} y2="368" opacity="0.35" />
        ))}
      </g>
      {/* gamepad */}
      <g transform="translate(160 180)">
        <path d="M-80 -20 Q -100 -20, -100 10 L -85 40 Q -70 46, -50 40 L -20 32 L 20 32 L 50 40 Q 70 46, 85 40 L 100 10 Q 100 -20, 80 -20 L 20 -20 Q 0 -30, -20 -20 Z" fill="url(#es-pad)" stroke="#704c00" strokeWidth="1.5" />
        {/* d-pad */}
        <g transform="translate(-55 10)">
          <rect x="-4" y="-14" width="8" height="28" fill="#1a1028" />
          <rect x="-14" y="-4" width="28" height="8" fill="#1a1028" />
        </g>
        {/* action buttons */}
        <circle cx="45" cy="0"   r="6" fill="#ef2a4c" />
        <circle cx="60" cy="10"  r="6" fill="#3b82f6" />
        <circle cx="30" cy="10"  r="6" fill="#10b981" />
        <circle cx="45" cy="20"  r="6" fill="#ffc940" />
        {/* start/select */}
        <rect x="-14" y="-6" width="10" height="4" rx="1" fill="#1a1028" />
        <rect x="4"   y="-6" width="10" height="4" rx="1" fill="#1a1028" />
        {/* glow */}
        <circle cx="45"  cy="0"   r="12" fill="#ef2a4c" opacity="0.35" />
        <circle cx="-55" cy="10"  r="14" fill="#21c07e" opacity="0.25" />
      </g>
      {/* PWNED text */}
      <text x="160" y="88" textAnchor="middle" fontSize="14" fontWeight="900" fill="#21c07e" letterSpacing="6" fontFamily="system-ui">E-SPORTS</text>
    </svg>
  );
}

// 25. KABADDI — whistle + player silhouette, gold
function KabaddiScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kb-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4a1c10" />
          <stop offset="70%"  stopColor="#1a0810" />
          <stop offset="100%" stopColor="#0a140f" />
        </linearGradient>
        <linearGradient id="kb-mat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#c48a3a" />
          <stop offset="100%" stopColor="#3a1810" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#kb-bg)" />
      {/* mat */}
      <path d="M0 260 L320 260 L280 368 L40 368 Z" fill="url(#kb-mat)" />
      <line x1="40" y1="368" x2="280" y2="368" stroke="#ffc940" strokeWidth="0.6" opacity="0.5" />
      <line x1="20" y1="314" x2="300" y2="314" stroke="#ffc940" strokeWidth="0.4" opacity="0.35" />
      {/* player silhouette (raiding pose) */}
      <g transform="translate(160 210)" fill="#0a140f" stroke="#ffc940" strokeWidth="1.2">
        {/* head */}
        <circle cx="0" cy="-70" r="14" />
        {/* headband */}
        <rect x="-14" y="-78" width="28" height="4" fill="#ef2a4c" stroke="none" />
        {/* torso */}
        <path d="M-16 -56 Q 0 -60, 16 -56 L 22 -6 Q 12 4, 0 4 Q -12 4, -22 -6 Z" />
        {/* right arm outstretched (touching) */}
        <path d="M16 -50 L 60 -60 L 66 -52 L 22 -40 Z" />
        <circle cx="66" cy="-56" r="6" fill="#ffc940" stroke="none" opacity="0.8" />
        {/* left arm braced */}
        <path d="M-16 -50 L -30 -30 L -22 -22 L -8 -40 Z" />
        {/* legs (crouched) */}
        <path d="M-10 4 L -30 40 L -22 46 L -4 12 Z" />
        <path d="M10 4 L 32 42 L 22 50 L 4 12 Z" />
        {/* KABADDI shout streak */}
        <text x="20" y="-70" fill="#ffc940" fontSize="11" fontWeight="900" fontFamily="system-ui" stroke="none" letterSpacing="2">KABADDI!</text>
      </g>
      {/* whistle (top-right corner) */}
      <g transform="translate(240 90) rotate(20)">
        <path d="M0 0 Q -8 -12, -22 -8 L -28 4 Q -14 12, 0 8 Z" fill="#ffc940" stroke="#8a5a20" strokeWidth="1" />
        <circle cx="-6" cy="0" r="3" fill="#0a140f" />
        {/* cord */}
        <path d="M0 -2 Q 40 -18, 60 -30" stroke="#ffc940" strokeWidth="1.4" fill="none" />
      </g>
    </svg>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FISHING SCENES (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

// 26. HAPPY FISHING — smiling gold fish + hook + bubbles
function HappyFishScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hf-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a3a55" />
          <stop offset="60%"  stopColor="#04182a" />
          <stop offset="100%" stopColor="#020a1a" />
        </linearGradient>
        <linearGradient id="hf-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="60%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#c48a3a" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#hf-bg)" />
      {/* bubbles */}
      {[[60,60,6],[86,90,4],[240,80,7],[270,120,5],[46,180,4],[290,230,5],[100,300,4],[220,320,5]].map(([x,y,r],i)=>(
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill="#fff" opacity="0.3" />
      ))}
      {/* hook */}
      <path d="M100 20 L100 70 Q 100 90, 120 90 Q 138 90, 138 74" fill="none" stroke="#ffc940" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 20 L100 70 Q 100 90, 120 90 Q 138 90, 138 74" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M138 74 L142 70" stroke="#ffc940" strokeWidth="3.5" strokeLinecap="round" />
      {/* fish body */}
      <g transform="translate(180 200)">
        {/* tail */}
        <path d="M-80 0 L-114 -30 L-106 0 L-114 30 Z" fill="url(#hf-body)" stroke="#8a5a20" strokeWidth="1.4" />
        {/* body */}
        <ellipse cx="0" cy="0" rx="80" ry="52" fill="url(#hf-body)" stroke="#8a5a20" strokeWidth="1.8" />
        {/* belly */}
        <path d="M-40 22 Q 0 40, 40 22" fill="#fff" opacity="0.3" />
        {/* top fin */}
        <path d="M-20 -50 L 0 -80 L 30 -50 Z" fill="url(#hf-body)" stroke="#8a5a20" strokeWidth="1.4" />
        {/* eye */}
        <circle cx="42" cy="-14" r="12" fill="#fff" stroke="#0a140f" strokeWidth="1.2" />
        <circle cx="46" cy="-12" r="6" fill="#0a140f" />
        <circle cx="48" cy="-14" r="2" fill="#fff" />
        {/* smile */}
        <path d="M32 12 Q 52 26, 68 12" fill="none" stroke="#0a140f" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M40 16 Q 50 22, 60 16" fill="#ef2a4c" opacity="0.5" />
        {/* scales */}
        {[[-40,-8],[-20,-14],[0,-16],[20,-14],[-30,10],[-10,16],[10,16],[30,10]].map(([x,y],i)=>(
          <path key={i} d={`M${x} ${y} Q ${x+8} ${(y as number)-6}, ${(x as number)+16} ${y}`} fill="none" stroke="#8a5a20" strokeWidth="1" opacity="0.6" />
        ))}
      </g>
      {/* splash */}
      <path d="M60 40 L64 20 L70 40 M80 30 L85 15 L90 35" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

// 27. OCEAN KING — gold dragon-fish king with jeweled crown
function OceanKingScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ok-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%"   stopColor="#0a4055" />
          <stop offset="60%"  stopColor="#04101a" />
          <stop offset="100%" stopColor="#02050a" />
        </radialGradient>
        <linearGradient id="ok-scale" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="50%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#704c00" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#ok-bg)" />
      {/* waves */}
      <path d="M0 320 Q 60 300, 120 320 T 240 320 T 320 320 L 320 368 L 0 368 Z" fill="#04486a" opacity="0.5" />
      <path d="M0 340 Q 60 322, 120 340 T 240 340 T 320 340 L 320 368 L 0 368 Z" fill="#04384a" opacity="0.5" />
      {/* dragon body coiled */}
      <path d="M60 180 Q 40 130, 90 100 Q 140 80, 180 120 Q 220 160, 210 210 Q 200 250, 160 260 Q 120 260, 100 240"
            fill="url(#ok-scale)" stroke="#8a5a20" strokeWidth="2" />
      {/* fins along the body */}
      <path d="M100 100 L110 80 L120 100 M130 90 L142 68 L152 90 M160 92 L170 70 L182 92" fill="url(#ok-scale)" stroke="#8a5a20" strokeWidth="1.4" />
      {/* head */}
      <g transform="translate(180 120)">
        <path d="M-24 -10 Q -30 -32, -6 -34 Q 20 -34, 34 -20 Q 42 -6, 34 8 Q 20 24, -6 22 Q -28 18, -24 -10 Z"
              fill="url(#ok-scale)" stroke="#8a5a20" strokeWidth="1.8" />
        {/* whiskers */}
        <path d="M-14 12 Q -30 20, -46 28" fill="none" stroke="#ffc940" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-8 14 Q -22 24, -36 40" fill="none" stroke="#ffc940" strokeWidth="1.5" strokeLinecap="round" />
        {/* eye */}
        <circle cx="6" cy="-14" r="4" fill="#0a140f" />
        <circle cx="8" cy="-16" r="1.5" fill="#fff" />
        <circle cx="6" cy="-14" r="6" fill="#ef2a4c" opacity="0.5" />
        {/* crown */}
        <path d="M-14 -34 L -8 -50 L 2 -38 L 12 -54 L 24 -38 L 32 -50 L 30 -32 Z" fill="#ffc940" stroke="#704c00" strokeWidth="1.2" />
        <circle cx="-8" cy="-46" r="2" fill="#ef2a4c" />
        <circle cx="12"  cy="-48" r="2.4" fill="#3b82f6" />
        <circle cx="24"  cy="-46" r="2" fill="#10b981" />
      </g>
      {/* pearl orb */}
      <circle cx="80" cy="200" r="14" fill="#fff" opacity="0.9" />
      <circle cx="78" cy="196" r="4" fill="#fff" />
      <circle cx="80" cy="200" r="18" fill="#21c07e" opacity="0.28" />
    </svg>
  );
}

// 28. FISH HUNTER — crossed harpoon + net + tropical fish
function FishHunterScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fh-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a3a55" />
          <stop offset="100%" stopColor="#02080f" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#fh-bg)" />
      {/* net (right diagonal, mesh) */}
      <g transform="translate(220 180) rotate(35)" stroke="#ffc940" strokeWidth="1.6" fill="none">
        <path d="M-8 -80 L-8 80 L8 80 L8 -80 Z" strokeWidth="3" />
        <ellipse cx="0" cy="80" rx="46" ry="34" fill="rgba(255,201,64,0.06)" />
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`v${i}`} x1={-40 + i * 20} y1="70" x2={-30 + i * 15} y2="112" opacity="0.7" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <path key={`h${i}`} d={`M-45 ${74 + i * 8} Q 0 ${90 + i * 8}, 45 ${74 + i * 8}`} opacity="0.6" />
        ))}
      </g>
      {/* harpoon (left diagonal) */}
      <g transform="translate(100 180) rotate(-35)">
        <rect x="-4" y="-80" width="8" height="160" fill="#c48a3a" stroke="#704c00" strokeWidth="0.8" />
        <path d="M-4 -80 L4 -80 L14 -100 L-14 -100 Z" fill="#ffc940" stroke="#704c00" strokeWidth="1.4" />
        <path d="M-14 -100 L0 -120 L14 -100 Z" fill="#ffc940" stroke="#704c00" strokeWidth="1.4" />
        <path d="M-10 -95 L-24 -85 L-6 -90 Z" fill="#ffc940" stroke="#704c00" strokeWidth="1.2" />
        <path d="M10 -95 L24 -85 L6 -90 Z" fill="#ffc940" stroke="#704c00" strokeWidth="1.2" />
      </g>
      {/* tropical fish center */}
      <g transform="translate(160 240)">
        <path d="M-50 0 L-70 -20 L-64 0 L-70 20 Z" fill="#ef2a4c" />
        <ellipse cx="0" cy="0" rx="50" ry="30" fill="#3b82f6" stroke="#0a140f" strokeWidth="1.4" />
        <path d="M-30 -8 L20 -8 L20 -20 L26 -8 M-30 8 L20 8 L20 20 L26 8" stroke="#ffc940" strokeWidth="2" fill="none" />
        <path d="M-20 -18 L 20 -18" stroke="#ffe48a" strokeWidth="4" />
        <path d="M-20 18 L 20 18" stroke="#ffe48a" strokeWidth="4" />
        <circle cx="30" cy="-6" r="4" fill="#fff" />
        <circle cx="31" cy="-6" r="2" fill="#0a140f" />
      </g>
      {/* bubbles */}
      <circle cx="50" cy="50" r="4" fill="#fff" opacity="0.4" />
      <circle cx="280" cy="60" r="5" fill="#fff" opacity="0.35" />
      <circle cx="40" cy="330" r="3" fill="#fff" opacity="0.4" />
    </svg>
  );
}

// 29. DEEP SEA — anglerfish with glowing lure in abyss
function DeepSeaScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ds-bg" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%"   stopColor="#0a1428" />
          <stop offset="100%" stopColor="#020306" />
        </radialGradient>
        <radialGradient id="ds-lure" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#fff7d6" />
          <stop offset="50%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#ffc940" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="368" fill="url(#ds-bg)" />
      {/* faint bubbles */}
      {[[40,30,3],[290,80,4],[80,320,3],[260,340,4]].map(([x,y,r],i)=>(
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill="#fff" opacity="0.18" />
      ))}
      {/* lure glow */}
      <circle cx="190" cy="120" r="70" fill="url(#ds-lure)" />
      {/* fish body */}
      <g transform="translate(150 210)">
        {/* body */}
        <path d="M-90 0 L-100 -14 L-96 0 L-100 16 Z" fill="#3a2a1a" />
        <ellipse cx="0" cy="0" rx="90" ry="60" fill="#1a1220" stroke="#3a2a1a" strokeWidth="1.8" />
        {/* menacing mouth */}
        <path d="M60 -10 L90 -18 L92 -6 L84 0 L92 6 L90 18 L60 10 Z" fill="#0a140f" stroke="#ffc940" strokeWidth="1" />
        {/* teeth */}
        {[[62,-4],[70,-4],[78,-4],[86,-2]].map(([x,y],i)=>(
          <path key={`ut${i}`} d={`M${x} ${y} L${(x as number)+2} ${(y as number)+6} L${(x as number)+4} ${y} Z`} fill="#fff" />
        ))}
        {[[62,4],[70,4],[78,4],[86,2]].map(([x,y],i)=>(
          <path key={`lt${i}`} d={`M${x} ${y} L${(x as number)+2} ${(y as number)-6} L${(x as number)+4} ${y} Z`} fill="#fff" />
        ))}
        {/* eye */}
        <circle cx="30" cy="-14" r="8" fill="#ef2a4c" />
        <circle cx="30" cy="-14" r="4" fill="#0a140f" />
        <circle cx="31" cy="-15" r="1.5" fill="#fff" />
        {/* dorsal spikes */}
        <path d="M-40 -60 L-30 -80 L-20 -60 M-10 -66 L0 -84 L10 -66 M20 -60 L28 -76 L36 -60" fill="none" stroke="#3a2a1a" strokeWidth="2" />
        {/* lure stalk */}
        <path d="M-20 -60 Q -10 -100, 40 -90" fill="none" stroke="#3a2a1a" strokeWidth="3" />
      </g>
      {/* lure orb */}
      <circle cx="190" cy="120" r="12" fill="#ffe48a" />
      <circle cx="190" cy="120" r="6"  fill="#fff" />
    </svg>
  );
}

// 30. BOMB FISHING — bomb underwater with fish around
function BombFishingScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bf-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a3a55" />
          <stop offset="100%" stopColor="#02080f" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#bf-bg)" />
      {/* bubbles */}
      {[[60,40,4],[240,60,5],[280,150,4],[40,200,3],[290,250,4],[100,340,3]].map(([x,y,r],i)=>(
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill="#fff" opacity="0.3" />
      ))}
      {/* small fish around */}
      <g transform="translate(60 100)" fill="#ef7020" stroke="#0a140f" strokeWidth="0.8">
        <ellipse cx="0" cy="0" rx="18" ry="10" />
        <path d="M-18 0 L-28 -8 L-24 0 L-28 8 Z" />
        <circle cx="10" cy="-2" r="1.5" fill="#fff" stroke="none" />
      </g>
      <g transform="translate(280 190) scale(-1 1)" fill="#3b82f6" stroke="#0a140f" strokeWidth="0.8">
        <ellipse cx="0" cy="0" rx="16" ry="9" />
        <path d="M-16 0 L-24 -7 L-20 0 L-24 7 Z" />
        <circle cx="9" cy="-2" r="1.5" fill="#fff" stroke="none" />
      </g>
      <g transform="translate(80 300)" fill="#ffc940" stroke="#0a140f" strokeWidth="0.8">
        <ellipse cx="0" cy="0" rx="14" ry="8" />
        <path d="M-14 0 L-22 -6 L-18 0 L-22 6 Z" />
        <circle cx="7" cy="-2" r="1.4" fill="#fff" stroke="none" />
      </g>
      {/* bomb */}
      <g transform="translate(180 210)">
        {/* fuse */}
        <path d="M-6 -50 L-18 -70 L-6 -80" fill="none" stroke="#c48a3a" strokeWidth="2.2" strokeLinecap="round" />
        {/* spark */}
        <circle cx="-6" cy="-80" r="4" fill="#ffc940" />
        <circle cx="-6" cy="-80" r="8" fill="#ffc940" opacity="0.5" />
        <path d="M-14 -84 L-10 -80 M-6 -90 L-6 -84 M2 -84 L-2 -80 M-14 -76 L-10 -80" stroke="#ffc940" strokeWidth="1.4" strokeLinecap="round" />
        {/* body */}
        <circle r="46" fill="#12201a" stroke="#ffc940" strokeWidth="1.6" />
        <circle r="38" fill="#0a140f" />
        <circle cx="-14" cy="-14" r="8" fill="#3a3a55" opacity="0.5" />
        {/* neck */}
        <rect x="-8" y="-52" width="16" height="8" rx="2" fill="#3a2a10" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAGON SCENES
// ─────────────────────────────────────────────────────────────────────────────

// 31. DRAGON KING — gold Chinese dragon coiled, red mane
function DragonKingScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dk-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%"   stopColor="#4a1010" />
          <stop offset="100%" stopColor="#0a140f" />
        </radialGradient>
        <linearGradient id="dk-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="50%"  stopColor="#ffc940" />
          <stop offset="100%" stopColor="#704c00" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#dk-bg)" />
      {/* coiled body */}
      <path d="M40 260 Q 20 200, 80 170 Q 140 150, 160 200 Q 180 250, 240 240 Q 280 230, 280 180 Q 275 130, 230 130"
            fill="none" stroke="url(#dk-body)" strokeWidth="22" strokeLinecap="round" />
      <path d="M40 260 Q 20 200, 80 170 Q 140 150, 160 200 Q 180 250, 240 240 Q 280 230, 280 180 Q 275 130, 230 130"
            fill="none" stroke="#8a5a20" strokeWidth="24" strokeLinecap="round" opacity="0.3" />
      {/* scale texture strips */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={50 + i * 22} y1={230 - Math.sin(i * 0.7) * 40}
                        x2={62 + i * 22} y2={244 - Math.sin(i * 0.7) * 40}
                        stroke="#8a5a20" strokeWidth="1" opacity="0.6" />
      ))}
      {/* head */}
      <g transform="translate(230 130)">
        <path d="M-30 -14 Q -34 -34, -4 -38 Q 22 -34, 32 -18 Q 40 -2, 32 12 Q 22 22, -4 20 Q -30 18, -30 -14 Z"
              fill="url(#dk-body)" stroke="#704c00" strokeWidth="1.8" />
        {/* mane (red) */}
        <path d="M-30 -34 Q -46 -50, -20 -46 Q -30 -30, -30 -34 Z" fill="#ef2a4c" />
        <path d="M-8 -40 Q 0 -60, 14 -40" fill="#ef2a4c" />
        <path d="M14 -34 Q 26 -50, 30 -34" fill="#ef2a4c" />
        {/* eye */}
        <circle cx="4" cy="-14" r="5" fill="#ef2a4c" />
        <circle cx="4" cy="-14" r="2.4" fill="#0a140f" />
        <circle cx="5" cy="-15" r="1" fill="#fff" />
        {/* whiskers */}
        <path d="M-18 12 Q -34 22, -50 30" stroke="#ffc940" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M-14 16 Q -30 30, -40 44" stroke="#ffc940" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        {/* horns */}
        <path d="M-14 -30 L -18 -50 L -8 -34" fill="#ffe48a" stroke="#704c00" strokeWidth="1" />
        <path d="M16 -30 L 18 -50 L 10 -34" fill="#ffe48a" stroke="#704c00" strokeWidth="1" />
      </g>
      {/* pearl */}
      <circle cx="80" cy="290" r="18" fill="#fff" opacity="0.9" />
      <circle cx="76" cy="284" r="6" fill="#fff" />
      <circle cx="80" cy="290" r="24" fill="#ef2a4c" opacity="0.28" />
    </svg>
  );
}

// 32. DRAGON TIGER — split gold dragon vs gold tiger with yin-yang
function DragonTigerScene() {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dt-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0a4020" />
          <stop offset="50%"  stopColor="#040608" />
          <stop offset="100%" stopColor="#4a1010" />
        </linearGradient>
        <linearGradient id="dt-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe48a" />
          <stop offset="100%" stopColor="#704c00" />
        </linearGradient>
      </defs>
      <rect width="320" height="368" fill="url(#dt-bg)" />
      {/* dividing line */}
      <line x1="160" y1="20" x2="160" y2="348" stroke="#ffc940" strokeWidth="0.6" opacity="0.4" strokeDasharray="4 4" />
      {/* dragon (left half) */}
      <g transform="translate(85 184)">
        {/* head */}
        <path d="M-30 -20 Q -40 -46, -10 -50 Q 20 -46, 34 -26 Q 44 -6, 34 14 Q 24 30, -6 28 Q -32 24, -30 -20 Z"
              fill="url(#dt-gold)" stroke="#704c00" strokeWidth="1.8" />
        <path d="M-30 -46 Q -44 -60, -20 -56" fill="#ef2a4c" />
        <path d="M-6 -50 Q 4 -66, 18 -50" fill="#ef2a4c" />
        <circle cx="6" cy="-20" r="5" fill="#ef2a4c" />
        <circle cx="6" cy="-20" r="2.4" fill="#0a140f" />
        <path d="M-14 -38 L -20 -56 L -6 -42" fill="#ffe48a" stroke="#704c00" strokeWidth="1" />
        <path d="M14 -38 L 18 -56 L 6 -42" fill="#ffe48a" stroke="#704c00" strokeWidth="1" />
        <path d="M-18 18 Q -34 30, -46 44" stroke="#ffc940" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
      {/* tiger (right half) */}
      <g transform="translate(235 184)">
        {/* head */}
        <ellipse cx="0" cy="0" rx="46" ry="42" fill="url(#dt-gold)" stroke="#704c00" strokeWidth="1.8" />
        {/* ears */}
        <path d="M-30 -34 L-40 -50 L-16 -42 Z" fill="url(#dt-gold)" stroke="#704c00" strokeWidth="1.2" />
        <path d="M30 -34 L40 -50 L16 -42 Z" fill="url(#dt-gold)" stroke="#704c00" strokeWidth="1.2" />
        {/* stripes */}
        <path d="M-28 -20 L-14 -14 M-30 -6 L-14 -4 M-28 8 L-14 4 M28 -20 L14 -14 M30 -6 L14 -4 M28 8 L14 4" stroke="#0a140f" strokeWidth="2" strokeLinecap="round" />
        {/* eyes */}
        <circle cx="-12" cy="-6" r="4" fill="#0a140f" />
        <circle cx="-11" cy="-7" r="1.2" fill="#fff" />
        <circle cx="12" cy="-6" r="4" fill="#0a140f" />
        <circle cx="13" cy="-7" r="1.2" fill="#fff" />
        {/* nose */}
        <path d="M-4 8 L 4 8 L 0 14 Z" fill="#ef2a4c" />
        {/* mouth */}
        <path d="M0 14 L0 22 M-10 24 Q 0 30, 10 24" stroke="#0a140f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* fangs */}
        <path d="M-6 22 L-4 28 L-2 22 M2 22 L4 28 L6 22" fill="#fff" stroke="#0a140f" strokeWidth="0.6" />
      </g>
      {/* yin-yang gold coin */}
      <g transform="translate(160 300)">
        <circle r="26" fill="url(#dt-gold)" stroke="#704c00" strokeWidth="1.6" />
        <path d="M0 -20 A 20 20 0 1 1 0 20 A 10 10 0 1 0 0 0 A 10 10 0 1 1 0 -20 Z" fill="#0a140f" />
        <circle cx="0" cy="-10" r="2.5" fill="#ffc940" />
        <circle cx="0" cy="10"  r="2.5" fill="#0a140f" />
      </g>
    </svg>
  );
}

// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
const SCENE_REGISTRY: Record<string, () => JSX.Element> = {
  // Hero playables
  crash: CrashScene,
  'cash-crash': PlaneScene,
  mines: MinesScene,
  plinko: PlinkoScene,
  pachinko: PlinkoScene,
  'drop-em': PlinkoScene,

  // Cards / tables
  blackjack: BlackjackScene,
  'live-blackjack': BlackjackScene,
  baccarat: BlackjackScene,
  'live-baccarat': BlackjackScene,
  'casino-holdem': BlackjackScene,
  'three-card': BlackjackScene,
  caribbean: BlackjackScene,
  'andar-bahar': BlackjackScene,
  poker: BlackjackScene,
  'teen-patti': BlackjackScene,
  rummy: BlackjackScene,
  hearts: BlackjackScene,
  solitaire: BlackjackScene,

  // Wheels
  roulette: RouletteScene,
  'live-roulette': RouletteScene,
  wheel: GameShowScene,
  'wheel-wealth': GameShowScene,
  'crazy-time': GameShowScene,
  'monopoly-live': GameShowScene,

  // Dice
  'sic-bo': DiceScene,
  'lightning-dice': DiceScene,
  'hilo-switch': MultiplierCardScene,

  // Crash family
  aviator: PlaneScene,
  spaceman: PlaneScene,
  jetx: PlaneScene,

  // Mines family — multiplier flavor
  hilo: MultiplierCardScene,
  keno: MultiplierCardScene,
  limbo: MultiplierCardScene,

  // Slot specifics
  'sweet-bonanza': CandyScene,
  'fruit-party': CandyScene,
  'gates-olympus': OlympusScene,
  'wolf-gold': WolfScene,
  'mustang-gold': WolfScene,
  'buffalo-king': WolfScene,
  'starburst': StarburstScene,
  'book-dead': BookScene,
  'doom-dead': SkullScene,
  'razor-shark': SkullScene,
  'wanted-dead-wild': SkullScene,
  'big-bass': FishScene,
  'money-train': TrainScene,
  // generic slot fallback for remaining slot ids
  'bonanza': SlotGoldRed,
  'reactoonz': SlotAquaPurple,
  'wild-west': SlotGoldRed,

  // Specialty
  bingo: GameShowScene,
  scratchcards: MultiplierCardScene,

  // Sports (Phase 1)
  football:      FootballScene,
  'cricket-x':   CricketXScene,
  'ipl-cricket': IplTrophyScene,
  basketball:    BasketballScene,
  tennis:        TennisScene,
  'e-sports':    EsportsScene,
  kabaddi:       KabaddiScene,

  // Fishing (Phase 2)
  'happy-fishing': HappyFishScene,
  'ocean-king':    OceanKingScene,
  'fish-hunter':   FishHunterScene,
  'deep-sea':      DeepSeaScene,
  'bomb-fishing':  BombFishingScene,

  // Dragons
  'dragon-king':   DragonKingScene,
  'dragon-tiger':  DragonTigerScene,

  // Extended crash family (reuse PlaneScene)
  'aviator-2':     PlaneScene,
  'aviatrix':      PlaneScene,
  'canado':        PlaneScene,
  'zeppelin':      PlaneScene,

  // Prediction / Indian / newer cards
  'wingo':         MultiplierCardScene,
  'uno':           BlackjackScene,
  'ludo':          BlackjackScene,
  'jhandi-munda':  DiceScene,
  'call-break':    BlackjackScene,

  // New slot ids
  'wild-ape':      SkullScene,
  'starlight':     StarburstScene,
};

export function hasGameScene(id: string): boolean {
  return id in SCENE_REGISTRY;
}

export default function GameScene({ id }: { id: string }) {
  const Comp = SCENE_REGISTRY[id];
  if (!Comp) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <Comp />
    </div>
  );
}
