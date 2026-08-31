// v2catalog — real 2J catalog for the V2 lobby (read-only).
//
// Wraps the existing igaming catalog (fetchLiveCatalog) and derives the
// presentation-only extras the cards need (category display names, synthetic
// HOT/NEW/JACKPOT badges, art resolution). NO launch/wallet/payment here — the
// launcher reuses launchProviderGame verbatim. Same read-only source V1 uses.

import { useEffect, useState } from "react";
import { fetchLiveCatalog, fetchActiveAllowlist, aggregatorThumb, type CatalogGame } from "@/lib/igaming";

export type { CatalogGame };
export type V2Badge = "HOT" | "NEW" | "JACKPOT";

// Raw catalog category → display label + icon (mirrors the real category strings).
const CAT_LABEL: Record<string, { label: string; icon: string }> = {
  slots: { label: "Slots", icon: "🎰" },
  live: { label: "Live Casino", icon: "🃏" },
  card: { label: "Table", icon: "🎲" },
  crash: { label: "Crash", icon: "🚀" },
  fishing: { label: "Fishing", icon: "🎣" },
  lottery: { label: "Lottery", icon: "🎟️" },
  mini: { label: "Arcade", icon: "🕹️" },
  sports: { label: "Sports", icon: "⚽" },
};

const JACKPOT_RE = /jackpot|mega|grand|fortune|treasure|gold|riches|luxur/i;
export const isJackpot = (g: CatalogGame) => g.category === "slots" && JACKPOT_RE.test(g.name);

// Art: admin-bound game.<uid> → bundled icon → CDN thumbnail (onError, in the card).
export const gameArt = (assets: Record<string, string>, uid: string) =>
  assets[`game.${uid}`] || `/icons/2j/${uid}.png`;

export function useV2Catalog() {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "seed" | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([fetchLiveCatalog(), fetchActiveAllowlist()])
      .then(([{ games, source }, allow]) => {
        if (!alive) return;
        // Operator activated-games allowlist: show ONLY those ids, IN ORDER.
        // An id present in the catalog uses its real record; an id that isn't
        // (seed is a different/older snapshot) is synthesized so it still shows
        // — art resolves from the aggregator CDN by id (aggregatorThumb).
        let shown = games;
        if (allow && allow.length) {
          const byUid = new Map(games.map((g) => [g.uid, g]));
          shown = allow.map((e): CatalogGame =>
            byUid.get(e.uid) ?? {
              uid: e.uid,
              name: e.name ?? `Game ${e.uid}`,
              provider: "2J",
              category: e.category ?? "slots",
              thumbnail: aggregatorThumb(e.uid),
            });
        }
        setGames(shown); setSource(source); setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { games, loading, source };
}

// Distinct real categories present, in a sensible order, with labels.
export function catalogCategories(games: CatalogGame[]): { key: string; label: string; icon: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const g of games) counts.set(g.category, (counts.get(g.category) ?? 0) + 1);
  const order = ["slots", "live", "card", "crash", "fishing", "lottery", "mini", "sports"];
  return [...counts.keys()]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map((key) => ({ key, label: CAT_LABEL[key]?.label ?? key, icon: CAT_LABEL[key]?.icon ?? "🎮", count: counts.get(key)! }));
}

// Synthetic badges (presentation only — the data has none).
// NEW = the last N games in the catalog order; HOT = a rotating slice; JACKPOT = name-regex.
export function makeBadger(games: CatalogGame[]): (g: CatalogGame, i: number) => V2Badge | undefined {
  const n = games.length;
  const newSet = new Set(games.slice(Math.max(0, n - 10)).map((g) => g.uid));
  const hotSet = new Set(games.filter((_, i) => i % 11 === 3).slice(0, 14).map((g) => g.uid));
  return (g) => (isJackpot(g) ? "JACKPOT" : newSet.has(g.uid) ? "NEW" : hotSet.has(g.uid) ? "HOT" : undefined);
}

// Presentational RTP (no RTP in the data) — stable per uid, like the V1 lobby.
export function rtpOf(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return (95.5 + (h % 250) / 100).toFixed(2);
}

// Filtered view for a tab: "featured" | "hot" | "new" | "jackpot" | "<category>" | "all".
export function filterCatalog(games: CatalogGame[], tab: string, badger: (g: CatalogGame, i: number) => V2Badge | undefined): CatalogGame[] {
  if (tab === "all") return games;
  if (tab === "featured") return games.filter((g, i) => badger(g, i) !== undefined).slice(0, 24);
  if (tab === "hot") return games.filter((g, i) => badger(g, i) === "HOT");
  if (tab === "new") return games.filter((g, i) => badger(g, i) === "NEW");
  if (tab === "jackpot") return games.filter((g) => isJackpot(g));
  return games.filter((g) => g.category === tab);
}
