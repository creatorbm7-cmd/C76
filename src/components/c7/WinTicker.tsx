/**
 * WinTicker — premium "Top Win" notification toast for the lobby.
 *
 * Slides in from the right with a winner's avatar + game icon, masked handle,
 * payout and win multiplier, then auto-dismisses after 5s and cycles to the
 * next win. Real data from casino_bets (is_win, payout, multiplier) with a
 * seeded fallback. Neon-blue glow border, gold/purple accents, 60fps
 * (transform/opacity only), iPhone-safe.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Win { id: string; name: string; initial: string; game: string; icon: string; amount: number; mult: number; }

const GICON: Record<string, string> = {
  crash: "✈️", aviator: "✈️", "aviator-2": "🛩️", jetx: "🚀", spaceman: "🧑‍🚀",
  mines: "💣", plinko: "🎯", dice: "🎲", wheel: "🎡", wingo: "🎡", "win-go": "🎡",
  limbo: "📈", keno: "🔢", hilo: "🃏", coinflip: "🪙", slots: "🎰", roulette: "🔴",
  blackjack: "🃏", baccarat: "🀄", "crazy-time": "🎪", monopoly: "🎩",
  "teen-patti": "🂡", rummy: "🃏", football: "⚽", cricket: "🏏", basketball: "🏀",
};
const norm = (g: string) => (g || "").toLowerCase().replace(/_/g, "-");
const gIcon = (g: string) => GICON[norm(g)] || "🎮";
const gLabel = (g: string) => {
  const k = norm(g);
  if (!k) return "Casino";
  return k.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
};
function handleFrom(uid: string): string {
  const s = (uid || "").replace(/[^a-z0-9]/gi, "");
  const a = (s.slice(0, 2) || "PL").toUpperCase();
  const b = (s.slice(-2) || "07").toUpperCase();
  return `${a}•••${b}`;
}

const FALLBACK: Win[] = [
  { id: "f1", name: "RO•••24", initial: "R", game: "Aviator", icon: "✈️", amount: 1240, mult: 124 },
  { id: "f2", name: "PR•••88", initial: "P", game: "Crash", icon: "✈️", amount: 860, mult: 18 },
  { id: "f3", name: "AR•••12", initial: "A", game: "Crazy Time", icon: "🎪", amount: 3120, mult: 234 },
  { id: "f4", name: "NE•••57", initial: "N", game: "Mines", icon: "💣", amount: 580, mult: 9 },
  { id: "f5", name: "VI•••33", initial: "V", game: "Monopoly Live", icon: "🎩", amount: 2050, mult: 41 },
];

const CSS = `
.wt-wrap { position: fixed; top: calc(58px + env(safe-area-inset-top,0px)); right: 0; z-index: 60; pointer-events: none; }
.wt-toast { display: flex; align-items: center; gap: 10px; padding: 9px 14px 9px 9px; margin-right: 10px; border-radius: 16px; max-width: 78vw;
  background: linear-gradient(135deg, rgba(20,16,40,0.92), rgba(8,6,16,0.95));
  border: 1px solid rgba(64,196,255,0.8);
  box-shadow: 0 0 0 1px rgba(64,196,255,0.25), 0 0 18px rgba(64,196,255,0.55), 0 10px 26px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  transform: translateX(120%); opacity: 0; transition: transform 0.5s cubic-bezier(.22,1,.36,1), opacity 0.5s ease; will-change: transform, opacity; }
.wt-toast.wt-in { transform: translateX(0); opacity: 1; }
.wt-ava { position: relative; width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center;
  font-size: 16px; font-weight: 900; color: #fff;
  background: radial-gradient(120% 100% at 50% 6%, rgba(255,255,255,0.45), transparent 55%), linear-gradient(180deg, #7b3df5, #c0267a);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 3px 8px rgba(0,0,0,0.5); }
.wt-game { position: absolute; bottom: -5px; right: -5px; font-size: 14px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6)); }
.wt-mid { min-width: 0; }
.wt-name { font-size: 11px; font-weight: 800; color: #cfe9ff; letter-spacing: 0.2px; white-space: nowrap; }
.wt-won { color: rgba(255,255,255,0.5); font-weight: 700; }
.wt-amt { font-size: 15px; font-weight: 900; color: var(--c7-gold); font-variant-numeric: tabular-nums; line-height: 1.1; text-shadow: 0 0 10px rgba(var(--c7-gold-rgb),0.5); }
.wt-cur { font-size: 9px; color: rgba(255,255,255,0.55); font-weight: 800; }
.wt-mult { flex-shrink: 0; margin-left: 2px; padding: 5px 9px; border-radius: 10px; font-size: 13px; font-weight: 900; color: #06121f;
  background: radial-gradient(120% 100% at 50% 8%, #fff, transparent 55%), linear-gradient(180deg, #6fe0ff, #2aa8ff);
  box-shadow: 0 0 12px rgba(64,196,255,0.7), inset 0 1px 0 rgba(255,255,255,0.7); font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) { .wt-toast { transition: opacity 0.3s ease; transform: none; } }
`;

export default function WinTicker() {
  const [wins, setWins] = useState<Win[]>([]);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("casino_bets")
          .select("id,user_id,game_type,payout,multiplier")
          .eq("is_win", true).gt("payout", 0)
          .order("created_at", { ascending: false }).limit(14);
        if (!mounted) return;
        const list: Win[] = (data ?? [])
          .map((b: { id: string | number; user_id?: string; game_type?: string; payout?: number; multiplier?: number }) => {
            const h = handleFrom(String(b.user_id ?? ""));
            return { id: String(b.id), name: h, initial: h.charAt(0), game: gLabel(String(b.game_type ?? "")), icon: gIcon(String(b.game_type ?? "")), amount: Number(b.payout ?? 0), mult: Number(b.multiplier ?? 0) };
          })
          .filter((w) => w.amount > 0);
        setWins(list.length >= 3 ? list : FALLBACK);
      } catch {
        if (mounted) setWins(FALLBACK);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (wins.length === 0) return;
    setShow(true);
    const t1 = window.setTimeout(() => setShow(false), 5000);          // auto-dismiss after 5s
    const t2 = window.setTimeout(() => setIdx((i) => (i + 1) % wins.length), 6300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [idx, wins]);

  if (wins.length === 0) return null;
  const w = wins[idx];
  const multLabel = w.mult >= 1.05 ? `×${w.mult < 10 ? w.mult.toFixed(1) : Math.round(w.mult)}` : "WIN";

  return (
    <div className="wt-wrap">
      <style>{CSS}</style>
      <div className={`wt-toast${show ? " wt-in" : ""}`}>
        <div className="wt-ava">{w.initial}<span className="wt-game">{w.icon}</span></div>
        <div className="wt-mid">
          <div className="wt-name">{w.name} <span className="wt-won">won on {w.game}</span></div>
          <div className="wt-amt">+{w.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="wt-cur">USDT</span></div>
        </div>
        <div className="wt-mult">{multLabel}</div>
      </div>
    </div>
  );
}
