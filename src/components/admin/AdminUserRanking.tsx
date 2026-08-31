import { useEffect, useState } from "react";
import { num } from "@/lib/format";
import { Trophy, Loader2, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminUserRanking — "User Ranking" (Web Settings). Read-only leaderboard of
 * top players by the selected metric, from live casino_wallets + profiles.
 */
type Metric = "total_wagered" | "total_won" | "balance" | "total_deposited";
type Row = { user_id: string; balance: number; total_wagered: number; total_won: number; total_deposited: number; label: string };

const METRICS: { key: Metric; label: string }[] = [
  { key: "total_wagered", label: "Total Wagered" },
  { key: "total_won", label: "Total Won" },
  { key: "balance", label: "Balance" },
  { key: "total_deposited", label: "Total Deposited" },
];

const fmt = (n: number) => num(n, { max: 2 });

export default function AdminUserRanking() {
  const [metric, setMetric] = useState<Metric>("total_wagered");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: wallets } = await supabase
      .from("casino_wallets")
      .select("user_id, balance, total_wagered, total_won, total_deposited")
      .order(metric, { ascending: false })
      .limit(50);
    const list = (wallets || []) as Omit<Row, "label">[];
    const ids = list.map((w) => w.user_id);
    const nameById: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      for (const p of (profs || []) as { id: string; email?: string; full_name?: string }[]) {
        nameById[p.id] = p.full_name || p.email || `${p.id.slice(0, 8)}…`;
      }
    }
    setRows(list.map((w) => ({ ...w, label: nameById[w.user_id] || `${w.user_id.slice(0, 8)}…` })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [metric]);

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web Settings · User Ranking"
          title="USER RANKING"
          tone="amber"
          icon={<Trophy className="h-5 w-5" />}
          badges={[{ label: `BY ${metricLabel.toUpperCase()}`, tone: "amber", dot: true }]}
          subtitle={<>Live leaderboard of the top 50 players ranked by the selected metric, drawn from casino wallets and profiles.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh leaderboard">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Users className="h-4 w-4" />} label="Ranked Players" value={rows.length} sub="in current view" tone="amber" delay={0} />
        </div>

        {/* METRIC SELECTOR */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Rank by</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
            style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.12)" }}>
            {METRICS.map((m) => <option key={m.key} value={m.key} style={{ background: "#ffffff" }}>{m.label}</option>)}
          </select>
        </div>

      {loading ? (
        <div className="p-10 text-center text-slate-300"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="text-left px-4 py-3 font-bold">#</th>
                  <th className="text-left px-4 py-3 font-bold">Player</th>
                  <th className="text-right px-4 py-3 font-bold">Wagered</th>
                  <th className="text-right px-4 py-3 font-bold">Won</th>
                  <th className="text-right px-4 py-3 font-bold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_id} style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}>
                    <td className="px-4 py-3 font-black" style={{ color: i < 3 ? "var(--c7-gold)" : "rgba(15,23,42,0.4)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{r.label}</td>
                    <td className="px-4 py-3 text-right text-slate-500 font-mono">{fmt(r.total_wagered)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-mono">{fmt(r.total_won)}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-mono">{fmt(r.balance)}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No players yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
