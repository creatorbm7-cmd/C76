import React from "react";
import type { CrashRow } from "@/hooks/useAdminLive";

function CrashMonitor({ crashes }: { crashes: CrashRow[] }) {
  const last = crashes.slice(0, 20).reverse();
  const max = Math.max(2, ...last.map(c => Number(c.crash_point) || 0));
  const current = crashes.find(c => c.status !== "crashed");

  return (
    <div className="adm-glass rounded-2xl p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90">Crash Monitor</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Round #{crashes[0]?.round_number ?? "—"}</span>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${current ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
            {current ? current.status : "idle"}
          </span>
        </div>
      </header>
      <div className="flex items-end gap-1 h-24 mb-3">
        {last.map((c) => {
          const h = c.crash_point ? Math.min(100, (Number(c.crash_point) / max) * 100) : 5;
          const big = (c.crash_point ?? 0) >= 2;
          return <div key={c.id} style={{ height: `${h}%` }} className={`flex-1 rounded-t-sm ${big ? "bg-emerald-400/70" : "bg-red-400/50"}`} title={c.crash_point ? `${Number(c.crash_point).toFixed(2)}×` : "—"} />;
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {crashes.slice(0, 12).map(c => (
          <span key={c.id} className={`font-mono text-[11px] px-2 py-1 rounded ${(c.crash_point ?? 0) >= 2 ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-red-400/10 text-red-300 ring-1 ring-red-400/20"}`}>
            {c.crash_point ? `${Number(c.crash_point).toFixed(2)}×` : "—"}
          </span>
        ))}
      </div>
    </div>
  );
}

export default React.memo(CrashMonitor);
