import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  email_verified: boolean;
  profile_set: boolean;
  first_deposit: boolean;
  first_bet: boolean;
  completion: number;
}

type FilterId = "all" | "complete" | "incomplete" | "no_deposit" | "no_bet";

export default function AdminOnboardingTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [profilesRes, walletsRes, betsRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, created_at, email_verified").order("created_at", { ascending: false }).limit(500),
        supabase.from("casino_wallets").select("user_id, total_deposited"),
        supabase.from("casino_bets").select("user_id"),
      ]);
      const wallets = new Map((walletsRes.data || []).map((w: any) => [w.user_id, Number(w.total_deposited) || 0]));
      const betters = new Set((betsRes.data || []).map((b: any) => b.user_id));
      const built: Row[] = (profilesRes.data || []).map((p: any) => {
        const email_verified = !!p.email_verified;
        const profile_set = !!p.full_name;
        const first_deposit = (wallets.get(p.id) || 0) > 0;
        const first_bet = betters.has(p.id);
        const done = [email_verified, profile_set, first_deposit, first_bet].filter(Boolean).length;
        return {
          id: p.id, email: p.email, full_name: p.full_name, created_at: p.created_at,
          email_verified, profile_set, first_deposit, first_bet,
          completion: Math.round((done / 4) * 100),
        };
      });
      setRows(built);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const fullyOnboarded = rows.filter(r => r.completion === 100).length;
    const verified = rows.filter(r => r.email_verified).length;
    const deposited = rows.filter(r => r.first_deposit).length;
    const wagered = rows.filter(r => r.first_bet).length;
    return { total, fullyOnboarded, verified, deposited, wagered };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !(r.email?.toLowerCase().includes(q) || r.full_name?.toLowerCase().includes(q))) return false;
      if (filter === "complete" && r.completion !== 100) return false;
      if (filter === "incomplete" && r.completion === 100) return false;
      if (filter === "no_deposit" && r.first_deposit) return false;
      if (filter === "no_bet" && r.first_bet) return false;
      return true;
    });
  }, [rows, search, filter]);

  const exportCsv = () => {
    const header = "email,full_name,signed_up,email_verified,profile_set,first_deposit,first_bet,completion_pct\n";
    const body = filtered.map(r =>
      [r.email, r.full_name, r.created_at, r.email_verified, r.profile_set, r.first_deposit, r.first_bet, r.completion]
        .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `onboarding-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS: { id: FilterId; label: string }[] = [
    { id: "all", label: `All (${rows.length})` },
    { id: "complete", label: `Complete (${stats.fullyOnboarded})` },
    { id: "incomplete", label: "Incomplete" },
    { id: "no_deposit", label: "No deposit" },
    { id: "no_bet", label: "No bet" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">User Onboarding</h2>
          <p className="text-xs text-white/50">Track each user's progress through the funnel</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </header>

      {/* Funnel cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Users", value: stats.total, pct: 100 },
          { label: "Email Verified", value: stats.verified, pct: stats.total ? Math.round(stats.verified / stats.total * 100) : 0 },
          { label: "Profile Set", value: rows.filter(r => r.profile_set).length, pct: stats.total ? Math.round(rows.filter(r => r.profile_set).length / stats.total * 100) : 0 },
          { label: "First Deposit", value: stats.deposited, pct: stats.total ? Math.round(stats.deposited / stats.total * 100) : 0 },
          { label: "First Bet", value: stats.wagered, pct: stats.total ? Math.round(stats.wagered / stats.total * 100) : 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/40">{s.label}</div>
            <div className="text-xl font-bold text-white mt-1">{s.value}</div>
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${s.pct}%` }} />
            </div>
            <div className="text-[10px] text-white/40 mt-1">{s.pct}%</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="pl-9 bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.id
                  ? "bg-amber-400/15 border-amber-400/40 text-amber-300"
                  : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80"
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/40">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-center px-3 py-3 font-semibold">Email Verified</th>
                <th className="text-center px-3 py-3 font-semibold">Profile</th>
                <th className="text-center px-3 py-3 font-semibold">First Deposit</th>
                <th className="text-center px-3 py-3 font-semibold">First Bet</th>
                <th className="text-right px-4 py-3 font-semibold">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr><td colSpan={6} className="text-center py-12 text-xs text-white/40">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-xs text-white/40">No users match these filters</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="text-white text-sm truncate">{r.full_name || "—"}</div>
                    <div className="text-[11px] text-white/40 truncate">{r.email}</div>
                  </td>
                  <Cell ok={r.email_verified} />
                  <Cell ok={r.profile_set} />
                  <Cell ok={r.first_deposit} />
                  <Cell ok={r.first_bet} />
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${r.completion === 100 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${r.completion}%` }} />
                      </div>
                      <span className={`text-xs font-mono w-10 text-right ${r.completion === 100 ? "text-emerald-300" : "text-white/60"}`}>{r.completion}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Cell({ ok }: { ok: boolean }) {
  return (
    <td className="text-center px-3 py-3">
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" />
        : <Circle className="h-4 w-4 text-white/20 inline" />}
    </td>
  );
}
