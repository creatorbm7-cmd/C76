// c7Assets — canonical premium-asset slot registry for the V3 user ecosystem.
//
// Each slot is a stable `asset_key`. An operator generates a transparent PNG
// (2K, deep-emerald + polished metallic-gold, glossy 3D — see docs/C7-ASSET-
// SLOTS.md) and binds it to the key in Admin → AI Studio. The <C7Asset> component
// then renders the bound PNG in place of the built-in SVG/PNG fallback — LIVE,
// with no code change. Until bound, the premium fallback shows.
//
// This registry drives (a) the Admin Studio slot dropdown, (b) the route/asset
// mapping doc, and (c) type-safety for <C7Asset slot=…>. It changes NO backend,
// balance, RPC or game logic — display binding only.

export type C7AssetSlot = {
  key: string;        // asset_key bound in Admin Studio
  label: string;      // human label (Admin dropdown)
  px: number;         // recommended square export size (transparent PNG)
  where: string;      // page / component + role
};

// ── Hero pieces (render-quality centrepieces) ──────────────────────────────
export const HERO_SLOTS: C7AssetSlot[] = [
  { key: "hero.chest",      label: "Hero · Treasure chest",   px: 2048, where: "Home Welcome-Bonus card · Rewards hub hero" },
  { key: "c74.medallion",   label: "Hero · C74 laurel coin",  px: 2048, where: "Home C74 Token card · Token Center emblem" },
  { key: "jackpot.frame",   label: "Hero · Jackpot marquee",  px: 2048, where: "Reels jackpot win frame · promo hero (optional)" },
];

// ── Reel symbols — ONE flattened PNG each (icon + number + C74/JACKPOT baked
//    together so the whole tile spins as a single object). Value-keyed. ──────
export const REEL_VALUES = [50, 100, 150, 200, 300, 500, 1000, 3000] as const;
export const REEL_SLOTS: C7AssetSlot[] = REEL_VALUES.map((v) => ({
  key: `reel.${v}`,
  label: `Reel symbol · ${v === 3000 ? "3000 JACKPOT" : v + " C74"}`,
  px: 1024,
  where: "C74Reel tile (unified icon+number+label PNG)",
}));

// ── Navigation art ─────────────────────────────────────────────────────────
export const NAV_SLOTS: C7AssetSlot[] = [
  { key: "nav.bar",         label: "Bottom nav · Full bar",   px: 1536, where: "C7BottomNav full-bar image (Home·Games·C74·Wallet·Profile, ~1536×430, transparent)" },
  { key: "tile.gems",       label: "Home tile · Gems",        px: 512,  where: "V3ShortcutStrip full tile (label baked, portrait, transparent)" },
  { key: "tile.slots",      label: "Home tile · Slots",       px: 512,  where: "V3ShortcutStrip full tile (label baked, portrait, transparent)" },
  { key: "tile.reels",      label: "Home tile · C74 Reels",   px: 640,  where: "V3ShortcutStrip full tile — featured centre (taller, label baked)" },
  { key: "tile.missions",   label: "Home tile · Missions",    px: 512,  where: "V3ShortcutStrip full tile (label baked, portrait, transparent)" },
  { key: "tile.bank",       label: "Home tile · Bank",        px: 512,  where: "V3ShortcutStrip full tile (label baked, portrait, transparent)" },
  { key: "nav.strip",       label: "Home · Shortcut strip",   px: 1536, where: "(legacy) single-image strip fallback" },
  { key: "tab.home",        label: "Tab · Home",              px: 512,  where: "C7BottomNav" },
  { key: "tab.games",       label: "Tab · Games",             px: 512,  where: "C7BottomNav" },
  { key: "tab.rewards",     label: "Tab · Rewards",           px: 512,  where: "C7BottomNav" },
  { key: "tab.wallet",      label: "Tab · Wallet",            px: 512,  where: "C7BottomNav" },
  { key: "tab.profile",     label: "Tab · Profile",           px: 512,  where: "C7BottomNav" },
];

// ── Feature icons (real V3 surfaces) ───────────────────────────────────────
export const FEATURE_SLOTS: C7AssetSlot[] = [
  { key: "icon.mining",     label: "Icon · Mining",           px: 512, where: "Home C74 card · Play Mining" },
  { key: "icon.convert",    label: "Icon · Convert",          px: 512, where: "Home C74 card · Convert row" },
  { key: "icon.gems",       label: "Icon · Gems",             px: 512, where: "Nav strip · Games" },
  { key: "icon.slots",      label: "Icon · Slots",            px: 512, where: "Nav strip · Slots" },
  { key: "icon.reels",      label: "Icon · C74 Reels",        px: 512, where: "Nav strip · Rewards hub · Reels page" },
  { key: "icon.missions",   label: "Icon · Missions",         px: 512, where: "Nav strip · Rewards hub · Missions" },
  { key: "icon.bank",       label: "Icon · Bank Game",        px: 512, where: "Nav strip · Rewards hub · Gullak" },
  { key: "icon.rewards",    label: "Icon · Rewards",          px: 512, where: "Rewards hub header" },
  { key: "icon.wallet",     label: "Icon · Wallet",           px: 512, where: "Wallet hero / header" },
  { key: "icon.profile",    label: "Icon · Profile",          px: 512, where: "Profile header / avatar frame" },
  { key: "icon.vip",        label: "Icon · VIP",              px: 512, where: "VIP page · Rewards VIP row" },
  { key: "icon.promotions", label: "Icon · Promotions",       px: 512, where: "Promotions page · Rewards row" },
  { key: "icon.events",     label: "Icon · Events",           px: 512, where: "Events page · Rewards row" },
  { key: "icon.leaderboard",label: "Icon · Leaderboard",      px: 512, where: "Leaderboard page · Rewards row" },
  { key: "icon.token",      label: "Icon · Token Center",     px: 512, where: "Token Center header" },
  { key: "icon.reputation", label: "Icon · Reputation",       px: 512, where: "C74 Reputation · Token Center eco" },
  { key: "icon.refer",      label: "Icon · Refer & Earn",     px: 512, where: "Agent page · Rewards row · Profile grid (Invite)" },
  // Profile grid + highlights (IgProfile) — transparent per-icon PNGs, no baked label.
  { key: "icon.c74",        label: "Icon · C74 coin",         px: 512, where: "Profile highlights (C74)" },
  { key: "icon.analytics",  label: "Icon · Analytics",        px: 512, where: "Profile highlights (Stats) · Profile grid (Analytics)" },
  { key: "icon.deposit",    label: "Icon · Deposit",          px: 512, where: "Profile grid (Deposit)" },
  { key: "icon.withdraw",   label: "Icon · Withdraw",         px: 512, where: "Profile grid (Withdraw)" },
  { key: "icon.history",    label: "Icon · History",          px: 512, where: "Profile grid (History)" },
  { key: "icon.telegram",   label: "Icon · Telegram",         px: 512, where: "Profile grid (Telegram)" },
  { key: "icon.support",    label: "Icon · Support",          px: 512, where: "Profile grid (Support)" },
  { key: "icon.settings",   label: "Icon · Settings",         px: 512, where: "Profile grid (Settings)" },
];

export const C7_ASSET_SLOTS: C7AssetSlot[] = [
  ...HERO_SLOTS, ...REEL_SLOTS, ...NAV_SLOTS, ...FEATURE_SLOTS,
];

export const isReelSlot = (v: number | string) => `reel.${v}`;
