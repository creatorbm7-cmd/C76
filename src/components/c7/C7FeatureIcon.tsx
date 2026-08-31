// C7FeatureIcon — one shared premium feature-icon renderer for the /ig app.
//
// Render precedence (display-only):
//   1. operator-bound PNG for `slot` (Admin → AI Studio / get_app_assets), via C7Asset
//   2. the existing premium emblem PNG at public/images/v3/emblems/<base>.png
//   3. the built-in C7Icon SVG glyph (`ic`)
//
// It reuses the emblem art already shipped in the repo — it creates NO new/duplicate
// files. Slots with no emblem file (icon.bank, icon.kyc, …) simply fall through to
// their SVG glyph. No routes, data, hooks or logic — presentation only.
import { useState } from "react";
import C7Icon, { type C7IconName } from "./C7Icon";
import C7Asset from "./C7Asset";

// slot → existing emblem PNG base name (public/images/v3/emblems/<base>.png).
const EMBLEM: Record<string, string> = {
  "icon.vip": "vip", "icon.rewards": "rewards", "icon.missions": "missions", "icon.c74": "c74",
  "icon.analytics": "analytics", "icon.wallet": "wallet", "icon.deposit": "deposit",
  "icon.withdraw": "withdraw", "icon.history": "history", "icon.telegram": "telegram",
  "icon.refer": "invite", "icon.support": "support", "icon.settings": "settings",
};

export function hasEmblem(slot: string): boolean {
  return slot in EMBLEM;
}

export default function C7FeatureIcon({ slot, ic, size, svgSize, className }:
  { slot: string; ic: C7IconName; size: number; svgSize?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const emb = EMBLEM[slot];
  const fallback = emb && !failed ? (
    <img src={`/images/v3/emblems/${emb}.png`} alt="" aria-hidden width={size} height={size}
      className={className} style={{ objectFit: "contain" }} loading="lazy" decoding="async"
      draggable={false} onError={() => setFailed(true)} />
  ) : (
    <C7Icon name={ic} size={svgSize ?? Math.round(size * 0.66)} />
  );
  return <C7Asset slot={slot} size={size} className={className} fallback={fallback} />;
}
