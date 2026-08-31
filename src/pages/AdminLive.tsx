import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAdminLive } from "@/hooks/useAdminLive";
import KpiStrip from "@/components/admin/live/KpiStrip";
import LiveBetsFeed from "@/components/admin/live/LiveBetsFeed";
import CrashMonitor from "@/components/admin/live/CrashMonitor";
import WagerVolumeChart from "@/components/admin/live/WagerVolumeChart";
import WithdrawalsQueue from "@/components/admin/live/WithdrawalsQueue";
import RiskAlerts from "@/components/admin/live/RiskAlerts";
import ActivityFeed from "@/components/admin/live/ActivityFeed";
import WalletMovement from "@/components/admin/live/WalletMovement";
import ConnectionPill from "@/components/admin/live/ConnectionPill";

export default function AdminLive() {
  const { bets, txs, crashes, withdrawals, hotWallets, kpi, series, connection, refresh } = useAdminLive();

  return (
    <div className="admin-live-shell min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.04] adm-grid" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-white/40 hover:text-white/80 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Operator Console</p>
              <h1 className="adm-heading text-xl font-bold leading-none">Live Control Center</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionPill status={connection} />
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/10 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-5 py-5 space-y-5">
        <KpiStrip kpi={kpi} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <WagerVolumeChart data={series} />
            <CrashMonitor crashes={crashes} />
            <LiveBetsFeed bets={bets} />
          </div>
          <div className="space-y-4">
            <RiskAlerts hotWallets={hotWallets} />
            <WithdrawalsQueue items={withdrawals} />
            <WalletMovement txs={txs} />
            <ActivityFeed bets={bets} txs={txs} />
          </div>
        </div>
        <footer className="text-center py-6 text-[10px] uppercase tracking-[0.3em] text-white/20">
          C7 Winners · Operator Console v1 · Realtime stream secured by RLS
        </footer>
      </main>
    </div>
  );
}
