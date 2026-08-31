import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, RefreshCw, Gamepad2, Layers, Coins, ArrowUpRight, Scale } from "lucide-react";
import AdminRtpMonitor from "./AdminRtpMonitor";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

const ALL_GAMES = ["All", "crash", "mines", "plinko", "dice", "coinflip", "limbo", "wheel", "keno", "hilo"];
const STATUS_OPTIONS = ["All", "Won", "Lost"];

export default function AdminGameRounds() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [gameFilter, setGameFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("game_sessions").select("*").order("created_at", { ascending: false }).limit(500);
    setRounds(data || []);
    const userIds = [...new Set((data || []).map(d => d.user_id))];
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach(p => { map[p.id] = p.email || "Unknown"; });
      setProfiles(map);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-game-rounds-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "casino_bets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  let filtered = rounds;
  if (gameFilter !== "All") filtered = filtered.filter(r => r.game_type === gameFilter);
  if (statusFilter === "Won") filtered = filtered.filter(r => Number(r.payout || 0) > Number(r.bet_amount));
  if (statusFilter === "Lost") filtered = filtered.filter(r => Number(r.payout || 0) <= Number(r.bet_amount));
  if (search) filtered = filtered.filter(r => (profiles[r.user_id] || "").toLowerCase().includes(search.toLowerCase()));
  if (dateFrom) filtered = filtered.filter(r => (r.created_at || "") >= dateFrom);
  if (dateTo) filtered = filtered.filter(r => (r.created_at || "") <= dateTo + "T23:59:59");

  const exportCSV = () => {
    const headers = "Round ID,User,Game,Bet,Multiplier,Payout,Status,Date\n";
    const rows = filtered.map(r =>
      `${r.id},${profiles[r.user_id] || r.user_id},${r.game_type},${r.bet_amount},${r.multiplier || 0},${r.payout || 0},${Number(r.payout || 0) > Number(r.bet_amount) ? "Won" : "Lost"},${r.created_at}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "game_rounds.csv"; a.click();
  };

  const selectStyle = { background: "#ffffff", border: "1px solid rgba(15,23,42,0.06)", color: "#0f172a" };

  // KPI stats derived from loaded rounds (no new queries).
  const stats = useMemo(() => {
    const totalRounds = rounds.length;
    const wagered = rounds.reduce((s, r) => s + Number(r.bet_amount || 0), 0);
    const payout = rounds.reduce((s, r) => s + Number(r.payout || 0), 0);
    const houseProfit = wagered - payout;
    const wins = rounds.filter(r => Number(r.payout || 0) > Number(r.bet_amount || 0)).length;
    return { totalRounds, wagered: Math.round(wagered), payout: Math.round(payout), houseProfit: Math.round(houseProfit), wins };
  }, [rounds]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Overview · Game Monitoring"
          title="GAME MONITORING"
          tone="amber"
          icon={<Gamepad2 className="h-5 w-5" />}
          badges={[
            { label: `${stats.totalRounds.toLocaleString("en-IN")} ROUNDS`, tone: "amber", dot: true },
            { label: `${stats.wins.toLocaleString("en-IN")} PLAYER WINS`, tone: "cyan" },
            { label: `HOUSE ${stats.houseProfit >= 0 ? "+" : ""}₹${stats.houseProfit.toLocaleString("en-IN")}`, tone: stats.houseProfit >= 0 ? "emerald" : "rose" },
          ]}
          subtitle={<>Live game session ledger · <span className="font-bold" style={{ color: "#b45309" }}>₹{stats.wagered.toLocaleString("en-IN")}</span> wagered · <span className="font-bold" style={{ color: "#be123c" }}>₹{stats.payout.toLocaleString("en-IN")}</span> paid out across the loaded window.</>}
          actions={
            <>
              <V8HeroBtn variant="primary" onClick={exportCSV} title="Export filtered rounds">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </V8HeroBtn>
              <V8HeroBtn variant="ghost" onClick={load} title="Refresh rounds">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </V8HeroBtn>
            </>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Layers className="h-4 w-4" />} label="Rounds (loaded)" value={stats.totalRounds} sub={`${stats.wins.toLocaleString("en-IN")} player wins`} tone="amber" delay={0} />
          <V8StatCard icon={<Coins className="h-4 w-4" />} label="Total Wagered" value={stats.wagered} prefix="₹" sub="across loaded sessions" tone="cyan" delay={80} />
          <V8StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Total Payout" value={stats.payout} prefix="₹" sub="paid to players" tone="rose" delay={160} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="House Profit" value={stats.houseProfit} prefix="₹" sub={stats.houseProfit >= 0 ? "net edge" : "net loss"} tone={stats.houseProfit >= 0 ? "emerald" : "rose"} delay={240} />
        </div>

      {/* Certified RTP monitoring — aggregate, all-players-pooled */}
      <AdminRtpMonitor />
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            style={{ background: "#f1f5f9", border: "1px solid rgba(15,23,42,0.06)" }} />
        </div>
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs" style={selectStyle}>
          {ALL_GAMES.map(g => <option key={g} value={g}>{g === "All" ? "All Games" : g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs" style={selectStyle}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs" style={selectStyle} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs" style={selectStyle} />
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold casino-gold-gradient text-black">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#f1f5f9", borderColor: "hsl(45,100%,60%,0.1)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200">
                <th className="text-left p-3">Round ID</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Game Type</th>
                <th className="text-right p-3">Bet</th>
                <th className="text-right p-3">Multiplier</th>
                <th className="text-right p-3">Payout</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r: any, i: number) => {
                const won = Number(r.payout || 0) > Number(r.bet_amount);
                return (
                  <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/60"}`}>
                    <td className="p-3 text-slate-400 font-mono">{r.id.slice(0, 8)}...</td>
                    <td className="p-3 text-slate-500">{profiles[r.user_id] || r.user_id.slice(0, 8)}</td>
                    <td className="p-3 text-slate-800 capitalize">{r.game_type}</td>
                    <td className="p-3 text-right text-slate-800">{Number(r.bet_amount).toFixed(2)}</td>
                    <td className="p-3 text-right casino-gold-text">{r.multiplier ? `${Number(r.multiplier).toFixed(2)}x` : "—"}</td>
                    <td className="p-3 text-right text-slate-800">{Number(r.payout || 0).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        won ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                      }`}>{won ? "Won" : "Lost"}</span>
                    </td>
                    <td className="p-3 text-right text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No rounds found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-200 text-[10px] text-slate-400">
          Showing {Math.min(filtered.length, 100)} of {filtered.length} rounds
        </div>
      </div>
      </div>
    </div>
  );
}
