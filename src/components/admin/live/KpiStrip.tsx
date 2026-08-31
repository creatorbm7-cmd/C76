import React from "react";
import { Users, Activity, TrendingUp, Wallet, Clock, Coins } from "lucide-react";
import type { KpiSnapshot } from "@/hooks/useAdminLive";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function KpiStrip({ kpi }: { kpi: KpiSnapshot }) {
  const items = [
    { label: "Online (5m)", value: kpi.online_users.toString(), icon: Users, accent: "text-emerald-300" },
    { label: "Active 24h", value: kpi.active_sessions.toString(), icon: Activity, accent: "text-cyan-300" },
    { label: "Wagered 24h", value: fmtUSD(kpi.wagered_24h), icon: Coins, accent: "text-amber-300" },
    { label: "GGR 24h", value: fmtUSD(kpi.ggr_24h), icon: TrendingUp, accent: kpi.ggr_24h >= 0 ? "text-emerald-300" : "text-red-300" },
    { label: "Bets 24h", value: kpi.bets_24h.toLocaleString(), icon: Clock, accent: "text-green-300" },
    { label: "Pending W/D", value: kpi.pending_withdrawals.toString(), icon: Wallet, accent: kpi.pending_withdrawals > 0 ? "text-amber-300" : "text-white/70" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <div key={it.label} className="adm-glass rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 relative">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">{it.label}</span>
            <it.icon className={`h-3.5 w-3.5 ${it.accent}`} />
          </div>
          <p className={`font-mono font-bold text-xl sm:text-2xl ${it.accent} relative tabular-nums`}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

export default React.memo(KpiStrip);
