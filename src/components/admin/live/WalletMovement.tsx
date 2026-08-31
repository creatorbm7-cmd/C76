import type { LiveTx } from "@/hooks/useAdminLive";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function WalletMovement({ txs }: { txs: LiveTx[] }) {
  return (
    <div className="adm-glass rounded-2xl overflow-hidden">
      <header className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/90">Wallet Movement</h3>
      </header>
      <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
        {txs.map(t => {
          const positive = Number(t.amount) > 0;
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              {positive ? <ArrowDownRight className="h-3.5 w-3.5 text-emerald-300" /> : <ArrowUpRight className="h-3.5 w-3.5 text-amber-300" />}
              <span className="font-mono text-white/50 w-20">{t.user_id.slice(0, 4)}…{t.user_id.slice(-4)}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/60 flex-1">{t.type}</span>
              <span className={`font-mono tabular-nums ${positive ? "text-emerald-300" : "text-amber-300"}`}>
                {positive ? "+" : ""}${Number(t.amount).toFixed(2)}
              </span>
            </div>
          );
        })}
        {txs.length === 0 && <div className="px-4 py-10 text-center text-xs text-white/30">No movement</div>}
      </div>
    </div>
  );
}
