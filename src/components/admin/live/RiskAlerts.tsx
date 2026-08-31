import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { HotWalletAlert } from "@/hooks/useAdminLive";

export default function RiskAlerts({ hotWallets }: { hotWallets: HotWalletAlert[] }) {
  const lows = hotWallets.filter(h => h.is_low);
  return (
    <div className="adm-glass rounded-2xl p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90">Risk & Hot-Wallet</h3>
        {lows.length > 0
          ? <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
          : <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />}
      </header>
      <div className="space-y-2">
        {hotWallets.map(h => (
          <div key={h.chain} className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ${
            h.is_low ? "bg-amber-400/5 ring-amber-400/30" : "bg-white/[0.03] ring-white/5"
          }`}>
            <span className="text-[11px] uppercase tracking-wider text-white/70">{h.chain}</span>
            <span className={`font-mono text-xs tabular-nums ${h.is_low ? "text-amber-300" : "text-emerald-300/80"}`}>
              {Number(h.balance).toFixed(4)} / min {Number(h.min_balance_alert).toFixed(2)}
            </span>
          </div>
        ))}
        {hotWallets.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">No hot wallets configured</p>
        )}
      </div>
    </div>
  );
}
