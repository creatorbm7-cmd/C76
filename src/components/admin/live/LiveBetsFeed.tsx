import type { LiveBet } from "@/hooks/useAdminLive";

const hash = (id: string) => id.slice(0, 4) + "…" + id.slice(-4);

export default function LiveBetsFeed({ bets }: { bets: LiveBet[] }) {
  return (
    <div className="adm-glass rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold tracking-wide text-white/90">Live Bets Stream</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">Realtime</span>
      </header>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
        {bets.map((b) => (
          <div key={b.id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 text-xs">
            <span className="col-span-3 font-mono text-white/50">{hash(b.user_id)}</span>
            <span className="col-span-2 uppercase text-[10px] tracking-wider text-white/70">{b.game_type}</span>
            <span className="col-span-2 font-mono text-white/80 tabular-nums text-right">${Number(b.bet_amount).toFixed(2)}</span>
            <span className={`col-span-2 font-mono tabular-nums text-right ${b.is_win ? "text-emerald-300" : "text-red-300/80"}`}>
              {b.is_win ? "+" : "−"}${Math.abs(Number(b.payout) - Number(b.bet_amount)).toFixed(2)}
            </span>
            <span className="col-span-3 text-right text-white/30 text-[10px]">
              {b.multiplier ? `${Number(b.multiplier).toFixed(2)}×` : ""} · {new Date(b.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {bets.length === 0 && <div className="px-4 py-10 text-center text-xs text-white/30">Waiting for bets…</div>}
      </div>
    </div>
  );
}
