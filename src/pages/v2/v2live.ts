// v2live — simulated "live" dashboard data + Recently-Played store (Phase P3).
//
// STRICT scope: presentation-only. None of this touches real wagers, balances,
// RNG, wallet or backend. "Live Winners" and "VIP Activity" are cosmetic tickers
// that update on a timer; "Recently Played" is a localStorage list of game uids
// recorded when the user opens a game. Everything honors prefers-reduced-motion
// (no timers → a static snapshot) and is cheap (state only, no layout thrash).

import { useEffect, useRef, useState } from "react";

const RECENT_KEY = "v2-recent-games";
const RECENT_MAX = 12;

/* ------------------------------------------------------------------ */
/* Recently Played                                                     */
/* ------------------------------------------------------------------ */

export function recordPlay(uid: string | number) {
  if (typeof window === "undefined") return;
  const id = String(uid);
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [id, ...cur.filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("v2:recent", { detail: next }));
  } catch { /* ignore quota/parse */ }
}

export function useRecentUids(): string[] {
  const [uids, setUids] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    const onChange = (e: Event) => setUids((e as CustomEvent).detail || []);
    window.addEventListener("v2:recent", onChange as EventListener);
    return () => window.removeEventListener("v2:recent", onChange as EventListener);
  }, []);
  return uids;
}

/* ------------------------------------------------------------------ */
/* Live Winners (cosmetic ticker feed)                                */
/* ------------------------------------------------------------------ */

export type Winner = { id: number; ic: string; name: string; game: string; amount: number };

const NAMES = ["N***M", "A***L", "S***V", "R***A", "K***T", "J***O", "M***I", "D***P", "L***Y", "V***K", "P***H", "T***Z"];
const GAMES = [
  { ic: "🐟", g: "Bass Hunter" }, { ic: "7️⃣", g: "777 Fruit" }, { ic: "🃏", g: "All-In Poker" },
  { ic: "🏛️", g: "Mayan Temple" }, { ic: "💎", g: "Gem Rush" }, { ic: "🎰", g: "Mega Reels" },
  { ic: "🐉", g: "Dragon Gold" }, { ic: "⚡", g: "Thunder Spin" }, { ic: "👑", g: "Royal Fortune" },
  { ic: "🍀", g: "Lucky Clover" }, { ic: "🔥", g: "Blaze Bonus" }, { ic: "🚀", g: "Rocket Crash" },
];

let SEED = 1;
function rnd() { // deterministic-per-tick pseudo-random (no Date/Math.random at module init)
  SEED = (SEED * 1103515245 + 12345) & 0x7fffffff;
  return SEED / 0x7fffffff;
}

function makeWinner(id: number): Winner {
  const g = GAMES[Math.floor(rnd() * GAMES.length)];
  const name = NAMES[Math.floor(rnd() * NAMES.length)];
  const amount = Math.round((40 + rnd() * 3200) * 100) / 100;
  return { id, ic: g.ic, name, game: g.g, amount };
}

export function useLiveWinners(count = 4): Winner[] {
  const [list, setList] = useState<Winner[]>(() => Array.from({ length: count }, (_, i) => makeWinner(i + 1)));
  const idRef = useRef(count + 1);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // vary the seed per session without Date: use performance.now once
    SEED = (SEED + Math.floor((performance.now?.() || 1) % 9973)) & 0x7fffffff;
    const iv = setInterval(() => {
      setList((cur) => [makeWinner(idRef.current++), ...cur].slice(0, count));
    }, 2600);
    return () => clearInterval(iv);
  }, [count]);
  return list;
}

/* ------------------------------------------------------------------ */
/* VIP Activity (cosmetic ticker feed)                                */
/* ------------------------------------------------------------------ */

export type VipEvent = { id: number; ic: string; text: string };

const VIP_POOL: Array<{ ic: string; text: (n: string) => string }> = [
  { ic: "👑", text: (n) => `${n} reached VIP Gold` },
  { ic: "💸", text: (n) => `${n} claimed 10% cashback` },
  { ic: "🎁", text: (n) => `${n} unlocked a VIP reward` },
  { ic: "⚡", text: (n) => `${n} earned live rakeback` },
  { ic: "🏆", text: (n) => `${n} climbed the leaderboard` },
  { ic: "💎", text: (n) => `${n} upgraded to Platinum` },
];

function makeVip(id: number): VipEvent {
  const p = VIP_POOL[Math.floor(rnd() * VIP_POOL.length)];
  const name = NAMES[Math.floor(rnd() * NAMES.length)];
  return { id, ic: p.ic, text: p.text(name) };
}

export function useVipActivity(count = 3): VipEvent[] {
  const [list, setList] = useState<VipEvent[]>(() => Array.from({ length: count }, (_, i) => makeVip(i + 100)));
  const idRef = useRef(1000);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const iv = setInterval(() => {
      setList((cur) => [makeVip(idRef.current++), ...cur].slice(0, count));
    }, 3400);
    return () => clearInterval(iv);
  }, [count]);
  return list;
}
