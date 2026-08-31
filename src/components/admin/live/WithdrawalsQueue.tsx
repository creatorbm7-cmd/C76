import type { PendingWithdrawal } from "@/hooks/useAdminLive";
import { Wallet } from "lucide-react";

const ageMin = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

export default function WithdrawalsQueue({ items }: { items: PendingWithdrawal[] }) {
  return (
    <div className="adm-glass rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-amber-300" />
          <h3 className="text-sm font-semibold text-white/90">Withdrawals Queue</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-amber-300">{items.length} pending</span>
      </header>
      <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
        {items.map(w => {
          const age = ageMin(w.created_at);
          const stale = age > 30;
          return (
            <div key={w.id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 text-xs">
              <span className="col-span-2 font-mono text-white/50">{w.user_id.slice(0, 4)}…{w.user_id.slice(-4)}</span>
              <span className="col-span-1 text-[10px] uppercase text-white/60">{w.chain}</span>
              <span className="col-span-3 font-mono text-white/40 truncate" title={w.to_address}>{w.to_address.slice(0, 8)}…{w.to_address.slice(-6)}</span>
              <span className="col-span-3 font-mono text-right text-white/90 tabular-nums">${Number(w.amount).toFixed(2)}</span>
              <span className={`col-span-3 text-right font-mono ${stale ? "text-amber-300" : "text-white/30"}`}>
                {age}m ago
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="px-4 py-10 text-center text-xs text-white/30">Queue clear ✓</div>
        )}
      </div>
    </div>
  );
}
