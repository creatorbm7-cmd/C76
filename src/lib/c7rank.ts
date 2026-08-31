/**
 * C7 mining-rank presentation theme (Engagement System, Phase 5.2a).
 *
 * A single, pure source of truth for how each mining rank (Bronze → Diamond)
 * LOOKS and is NAMED — frame gradient, glow, badge chip colours, and an identity
 * title/flavour. Presentation only: it maps a rank index to styling tokens and
 * carries no economics, thresholds, or perks (rank still grants nothing
 * mechanical — see the engagement spec, Appendix B.2a). Shared by the profile
 * badge, the HUD, and the return/victory summary so a rank looks the same
 * everywhere. Icons mirror MINING_LEVELS.
 */
export interface RankTheme {
  idx: number;      // 0…3, clamped
  key: string;      // 'bronze' | 'silver' | 'gold' | 'diamond'
  icon: string;     // rank emoji (mirrors MINING_LEVELS)
  title: string;    // canonical rank name
  flavor: string;   // short identity title
  frame: string;    // CSS gradient for a frame / border-image
  glow: string;     // rgba glow colour
  chipBg: string;   // CSS gradient for a small badge chip
  chipText: string; // readable text colour on the chip
}

const RANKS: ReadonlyArray<Omit<RankTheme, "idx">> = [
  {
    key: "bronze", icon: "🥉", title: "Bronze Miner", flavor: "Prospector",
    frame: "linear-gradient(150deg,#7c421d,#e8b06a 42%,#f6e6b0 60%,#a86a2e)",
    glow: "rgba(214,138,46,0.5)",
    chipBg: "linear-gradient(180deg,#e8b06a,#a86a2e)", chipText: "#2a1c04",
  },
  {
    key: "silver", icon: "🥈", title: "Silver Miner", flavor: "Excavator",
    frame: "linear-gradient(150deg,#6b7a86,#e9f0f4 46%,#ffffff 60%,#9fb3c0)",
    glow: "rgba(200,220,235,0.5)",
    chipBg: "linear-gradient(180deg,#e9f0f4,#9fb3c0)", chipText: "#1c2830",
  },
  {
    key: "gold", icon: "🥇", title: "Gold Miner", flavor: "Vault Keeper",
    frame: "linear-gradient(150deg,#8a5e10,#f6c945 44%,#fff2c0 60%,#c68a2e)",
    glow: "rgba(246,201,69,0.55)",
    chipBg: "linear-gradient(180deg,#ffe9a8,#d68a1e)", chipText: "#2a1c04",
  },
  {
    key: "diamond", icon: "💎", title: "Diamond Miner", flavor: "Sovereign",
    frame: "linear-gradient(150deg,#0a5638,#35d9ca 40%,#bfffe9 58%,#f6c945)",
    glow: "rgba(120,240,220,0.55)",
    chipBg: "linear-gradient(180deg,#bfffe9,#35d9ca)", chipText: "#052018",
  },
];

/** Pure: rank index → presentation theme. Out-of-range indices clamp into 0…3. */
export function rankTheme(idx: number): RankTheme {
  const i = Number.isFinite(idx) ? Math.max(0, Math.min(RANKS.length - 1, Math.trunc(idx))) : 0;
  return { idx: i, ...RANKS[i] };
}
