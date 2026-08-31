// C7TierIcon — the premium 3D glyph for a C74 tier / mining rank.
//
// One consistent mapping for BOTH tier systems (c74TierIcon's 8-level ladder and
// the mining rank ladder). Pass the tier or rank NAME (e.g. "Gold", "Diamond
// Miner", "Platinum") and it renders the matching C7Icon glyph with a metal tint
// — no more bare emoji (🥇/💠/💎). Display-only.
import { CSSProperties } from "react";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";

type TierDef = { name: C7IconName; filter?: string };

// Metal tints over the gold C7Icon base (medals) / emerald gem base (gems).
const BRONZE = "sepia(.6) saturate(1.6) hue-rotate(-18deg) brightness(.82)";
const SILVER = "saturate(.12) brightness(1.3)";
const PLATINUM = "saturate(.22) brightness(1.36)";
const DIAMOND = "hue-rotate(150deg) saturate(.85) brightness(1.22)"; // emerald gem → icy blue

// Keyword → glyph. Order matters (most specific first).
const TIERS: [RegExp, TierDef][] = [
  [/spark/i,    { name: "star" }],
  [/bronze/i,   { name: "medal", filter: BRONZE }],
  [/silver/i,   { name: "medal", filter: SILVER }],
  [/gold/i,     { name: "medal" }],
  [/platinum/i, { name: "gem",   filter: PLATINUM }],
  [/diamond/i,  { name: "gem",   filter: DIAMOND }],
  [/elite/i,    { name: "crown" }],
  [/creator/i,  { name: "rocket" }],
];

export function tierDef(tier: string | null | undefined): TierDef {
  const t = tier ?? "";
  for (const [re, def] of TIERS) if (re.test(t)) return def;
  return { name: "star" }; // sensible default (was ✨)
}

export default function C7TierIcon({ tier, size = 16, className, style }:
  { tier: string | null | undefined; size?: number; className?: string; style?: CSSProperties }) {
  const def = tierDef(tier);
  return (
    <span className={className} style={{ display: "inline-flex", filter: def.filter, verticalAlign: "middle", ...style }}>
      <C7Icon name={def.name} size={size} />
    </span>
  );
}
