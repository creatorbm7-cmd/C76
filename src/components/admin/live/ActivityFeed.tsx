import React from "react";
import type { LiveBet, LiveTx } from "@/hooks/useAdminLive";
import { ArrowDownCircle, Dice5, Trophy } from "lucide-react";

interface FeedItem { id: string; ts: string; kind: "bet" | "tx" | "win"; label: string; sub: string; tone: string }

function ActivityFeed({ bets, txs }: { bets: LiveBet[]; txs: LiveTx[] }) {
  const items: FeedItem[] = [
    ...bets.slice(0, 15).map<FeedItem>(b => ({
      id: "b-" + b.id, ts: b.created_at,
      kind: b.is_win ? "win" : "bet",
      label: `${b.is_win ? "Win" : "Bet"} · ${b.game_type}`,
      sub: `$${Number(b.bet_amount).toFixed(2)} → $${Number(b.payout).toFixed(2)}`,
      tone: b.is_win ? "text-emerald-300" : "text-white/60",
    })),
    ...txs.slice(0, 10).map<FeedItem>(t => ({
      id: "t-" + t.id, ts: t.created_at, kind: "tx", label: t.type,
      sub: `${t.amount > 0 ? "+" : ""}$${Number(t.amount).toFixed(2)}${t.balance_after !== null ? ` · bal $${Number(t.balance_after).toFixed(2)}` : ""}`,
      tone: t.amount > 0 ? "text-emerald-300" : "text-amber-300",
    })),
  ].sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 25);

  const Icon = (k: FeedItem["kind"]) => k === "win" ? Trophy : k === "tx" ? ArrowDownCircle : Dice5;

  return (
    <div className="adm-glass rounded-2xl overflow-hidden h-full">
      <header className="px-4 py-3 border-b border-white/5"><h3 className="text-sm font-semibold text-white/90">Platform Activity</h3></header>
      <div className="max-h-[420px] overflow-y-auto">
        {items.map((it) => {
          const I = Icon(it.kind);
          return (
            <div key={it.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.03]">
              <I className={`h-4 w-4 mt-0.5 ${it.tone}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 truncate">{it.label}</p>
                <p className="text-[10px] text-white/40 font-mono">{it.sub}</p>
              </div>
              <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">{new Date(it.ts).toLocaleTimeString()}</span>
            </div>
          );
        })}
        {items.length === 0 && <div className="px-4 py-10 text-center text-xs text-white/30">No activity yet</div>}
      </div>
    </div>
  );
}

export default React.memo(ActivityFeed);
