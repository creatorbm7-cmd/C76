// V2GameArt — deterministic procedural 2D art for a catalog game (HDR pass).
//
// Pure inline SVG, no assets/network. A rich, "3D HDR"-styled tile built from a
// per-uid palette: layered dual-hue emerald gradient, a bright specular core
// glow, a gold house-accent bloom, a glossy top light-bar, a faded monogram, a
// diagonal light streak, a small category chip, the REAL game name set in a
// gold gradient (wrapped to fit), a floor reflection, an edge vignette for
// depth, sparkles, and a gilt hairline. Stable per uid (FNV-1a hash — no
// randomness). Rendered as the base layer behind the card image, so it is the
// rich, on-brand fallback whenever a game has no bound art / working thumbnail.
// Shows the game's own name/category only — never a fabricated brand or logo.

import type { CatalogGame } from "./v2catalog";

// Category → clean text label (no emoji — the tile must not read as a generic
// slot-machine/🎰 placeholder). Case-insensitive lookup so "Slots"/"slots" match.
const CAT_LABEL: Record<string, string> = {
  slots: "SLOTS", live: "LIVE", card: "TABLE", crash: "CRASH",
  fishing: "FISHING", lottery: "LOTTERY", mini: "ARCADE", sports: "SPORTS",
};

// FNV-1a — stable string hash (no Math.random; art must be deterministic).
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Greedily wrap a name into up to `maxLines` lines of at most `perLine` chars,
// breaking on spaces (and hard-splitting any single word longer than a line).
// Returns the (possibly ellipsised) lines so long titles never overflow.
function wrapName(name: string, perLine: number, maxLines: number): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w0 of words) {
    let w = w0;
    while (w.length > perLine) {              // hard-split an over-long word
      if (cur) { lines.push(cur); cur = ""; }
      if (lines.length >= maxLines) break;
      lines.push(w.slice(0, perLine));
      w = w.slice(perLine);
    }
    if (lines.length >= maxLines) break;
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= perLine) { cur = next; }
    else { if (cur) lines.push(cur); cur = w; }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines || (cur && clipped.length === maxLines && clipped[maxLines - 1] !== cur)) {
    const last = clipped[clipped.length - 1] ?? "";
    clipped[clipped.length - 1] = (last.length > perLine - 1 ? last.slice(0, perLine - 1) : last) + "…";
  }
  return clipped.length ? clipped : ["?"];
}

export default function V2GameArt({ game }: { game: CatalogGame }) {
  const h = hashStr(game.uid || game.name);
  // Emerald+gold house theme — no random per-game blue/purple/red hues. A subtle
  // per-uid variation stays inside the green family so every tile reads on-brand.
  const hue = 150 + (h % 16);          // emerald 150–165
  const hue2 = 158 + ((h >> 9) % 10);  // deeper emerald 158–167
  const catLabel = CAT_LABEL[(game.category || "").toLowerCase()] ?? (game.category || "GAME").toUpperCase();
  const provider = (game.provider || "").trim();
  const letter = (game.name || "?").trim().charAt(0).toUpperCase() || "?";
  const id = "vga" + h.toString(36);
  const sx1 = 18 + (h % 22), sy1 = 24 + ((h >> 4) % 18);
  const sx2 = 80 - ((h >> 7) % 22), sy2 = 112 + ((h >> 3) % 22);

  // Fit the real name: pick a line budget, then size the type to the line count
  // so short titles read big and long ones stay contained.
  const name = (game.name || "").trim();
  const lines = wrapName(name, 12, 3);
  const fontSize = lines.length >= 3 ? 13 : lines.length === 2 ? 16 : 19;
  const lineH = fontSize + 2;
  const blockH = lines.length * lineH;
  const startY = 86 - blockH / 2 + fontSize; // vertically centred name block
  const provY = Math.min(startY + (lines.length - 1) * lineH + 16, 126);
  // Category pill geometry — sized to the label text (no emoji inside).
  const pillW = Math.min(catLabel.length * 5.6 + 16, 110);

  return (
    <svg
      className="v2c-art2d"
      viewBox="0 0 120 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        {/* base body — 3 stops for depth */}
        <linearGradient id={id + "g"} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 72% 30%)`} />
          <stop offset="0.55" stopColor={`hsl(${hue} 66% 18%)`} />
          <stop offset="1" stopColor={`hsl(${hue2} 64% 9%)`} />
        </linearGradient>
        {/* bright specular core glow (HDR bloom) */}
        <radialGradient id={id + "core"} cx="50%" cy="26%" r="58%">
          <stop offset="0" stopColor={`hsla(${hue}, 95%, 66%, 0.8)`} />
          <stop offset="0.4" stopColor={`hsla(${hue}, 90%, 55%, 0.32)`} />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        {/* gold house-accent bloom — the "gold" in emerald+gold, uniform per tile */}
        <radialGradient id={id + "gold"} cx="34%" cy="18%" r="52%">
          <stop offset="0" stopColor="hsla(45, 92%, 62%, 0.26)" />
          <stop offset="0.55" stopColor="hsla(45, 88%, 55%, 0.07)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        {/* edge vignette for depth */}
        <radialGradient id={id + "vig"} cx="50%" cy="46%" r="72%">
          <stop offset="0.55" stopColor="transparent" />
          <stop offset="1" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
        {/* floor reflection */}
        <linearGradient id={id + "floor"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="transparent" />
          <stop offset="1" stopColor={`hsla(${hue2}, 80%, 50%, 0.35)`} />
        </linearGradient>
        {/* gilt gold gradient for the game name */}
        <linearGradient id={id + "name"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset="0.5" stopColor="#ffd876" />
          <stop offset="1" stopColor="#e0a63a" />
        </linearGradient>
      </defs>

      <rect width="120" height="160" fill={`url(#${id}g)`} />
      <rect width="120" height="160" fill={`url(#${id}core)`} />
      <rect width="120" height="160" fill={`url(#${id}gold)`} />
      <rect x="0" y="120" width="120" height="40" fill={`url(#${id}floor)`} />

      {/* big faded monogram — depth behind the name */}
      <text x="60" y="132" textAnchor="middle" fontSize="150" fontWeight="900"
        fill="rgba(255,255,255,0.06)" fontFamily="Inter, system-ui, sans-serif">{letter}</text>

      {/* diagonal light streak + glossy top light-bar */}
      <polygon points="-12,64 42,-12 70,-12 16,64" fill="rgba(255,255,255,0.06)" />
      <rect x="0" y="0" width="120" height="30" fill="rgba(255,255,255,0.05)" />

      {/* category pill — clean text label, no emoji (top-centre) */}
      <rect x={60 - pillW / 2} y="20" width={pillW} height="15" rx="7.5"
        fill="rgba(6,32,22,0.55)" stroke="rgba(255,216,118,0.45)" strokeWidth="0.6" />
      <text x="60" y="30.5" textAnchor="middle" fontSize="8" fontWeight="800"
        letterSpacing="1.4" fill="rgba(255,232,168,0.9)"
        fontFamily="Inter, system-ui, sans-serif">{catLabel}</text>

      {/* the REAL game name, gold gradient, wrapped + shadowed */}
      <text textAnchor="middle" fontWeight="900" fill={`url(#${id}name)`}
        fontFamily="Inter, system-ui, sans-serif" fontSize={fontSize}
        style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.6))" }}>
        {lines.map((ln, i) => (
          <tspan key={i} x="60" y={startY + i * lineH}>{ln}</tspan>
        ))}
      </text>

      {/* real provider name — small caps under the title (no fabricated brand) */}
      {provider && (
        <text x="60" y={provY} textAnchor="middle" fontSize="8.5" fontWeight="700"
          letterSpacing="0.6" fill="rgba(210,240,220,0.66)"
          fontFamily="Inter, system-ui, sans-serif"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>{provider}</text>
      )}

      {/* sparkles */}
      <circle cx={sx1} cy={sy1} r="1.8" fill="rgba(224,250,160,0.95)" />
      <circle cx={sx2} cy={sy2} r="1.3" fill="rgba(224,250,172,0.85)" />
      <circle cx={100 - (h % 12)} cy={30 + (h % 14)} r="1" fill="rgba(255,255,255,0.7)" />

      {/* edge vignette + gilt hairline */}
      <rect width="120" height="160" fill={`url(#${id}vig)`} />
      <rect x="0" y="0" width="120" height="2" fill="rgba(74,210,50,0.6)" />
    </svg>
  );
}
