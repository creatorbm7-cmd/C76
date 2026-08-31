import { useState, useEffect, useCallback } from "react";
import { useCountUp } from "./adminV8Kit";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminCasino } from "@/lib/adminApi";
import { toast } from "sonner";
import {
  Users, Dices, TrendingUp, DollarSign, Activity, Clock, UserPlus, Check,
  Banknote, ShieldCheck, ArrowUpFromLine, Wallet, HeartPulse,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

/**
 * AdminOverview — C7 Admin Console · Dashboard.
 *
 * Professional dark crypto back-office dashboard: KPI row, ops queues, revenue
 * + game-mix charts, live bet feed. Rendered as a self-contained DARK panel via
 * scoped `.dx-*` classes + inline colors (which the admin-light theme does not
 * invert), so this page keeps the premium dark look regardless of the light
 * console chrome.
 *
 * PRESENTATION ONLY — every data hook, RPC/Supabase call, realtime channel and
 * the quick-approve mutation below is preserved verbatim from the prior version.
 */

const GAMES = ["crash", "mines", "plinko", "dice", "coinflip", "limbo", "wheel", "keno", "hilo", "blackjack", "roulette"];

const tooltipStyle = {
  background: "rgba(16,20,28,0.97)", border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10, color: "#e6edf6", fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

// useCountUp is imported from ./adminV8Kit (shared count-up hook).

interface Stats {
  totalUsers: number; betsToday: number; volumeToday: number; profitToday: number;
  pendingDeposits: number; pendingKyc: number; pendingWithdrawals: number; coinLiability: number;
  ggrAllTime: number;
  // Demo/test economy — segregated, never counted as real money.
  demoGgr: number; quarantinedLiability: number; demoBets: number;
}

export default function AdminOverview({ onNav }: { onNav?: (tab: string) => void }) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, betsToday: 0, volumeToday: 0, profitToday: 0,
    pendingDeposits: 0, pendingKyc: 0, pendingWithdrawals: 0, coinLiability: 0,
    ggrAllTime: 0,
    demoGgr: 0, quarantinedLiability: 0, demoBets: 0,
  });
  const [gameMix, setGameMix] = useState<any[]>([]);
  const [dailyVolume, setDailyVolume] = useState<any[]>([]);
  const [recentRounds, setRecentRounds] = useState<any[]>([]);
  const [pendingWds, setPendingWds] = useState<any[]>([]);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [busyApprove, setBusyApprove] = useState<string | null>(null);
  const [energyStats, setEnergyStats] = useState<{ total_issued: number; total_burned: number; players_with_energy: number; discount_cost_usd: number } | null>(null);

  const load = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [betsRes, profilesRes, walletsRes, depCntRes, kycCntRes, wdRes, signupsRes, sessRes] = await Promise.all([
      supabase.from("casino_bets").select("user_id, game_type, bet_amount, payout, created_at, origin"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("casino_wallets").select("balance, quarantine"),
      supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("kyc_submissions").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("crypto_withdrawals").select("id, user_id, amount, chain, to_address, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(6),
      supabase.from("profiles").select("id, email, display_name, created_at, kyc_status").order("created_at", { ascending: false }).limit(6),
      supabase.from("game_sessions").select("id, user_id, game_type, bet_amount, multiplier, payout, status, created_at").order("created_at", { ascending: false }).limit(12),
    ]);

    const bets = betsRes.data || [];
    // Real economy only: GGR/volume count genuine play (origin='verified_real').
    // Seeded/demo/test bets are reported separately, never mixed into real money.
    const isReal = (b: { origin?: string | null }) => b.origin === "verified_real";
    const realBets = bets.filter(isReal);
    const demoBetsArr = bets.filter(b => !isReal(b));
    const todayBets = bets.filter(b => (b.created_at || "") >= todayStart);
    const realTodayBets = todayBets.filter(isReal);
    const ggr = (arr: typeof bets) => arr.reduce((s, b) => s + Number(b.bet_amount || 0) - Number(b.payout || 0), 0);
    // Cash liability = balances the platform genuinely owes. Quarantined wallets
    // (unbacked/test balances — e.g. research injections) are segregated out.
    const wallets = walletsRes.data || [];
    const coinLiability = wallets.filter(w => !w.quarantine).reduce((s, w) => s + Number(w.balance || 0), 0);
    const quarantinedLiability = wallets.filter(w => w.quarantine).reduce((s, w) => s + Number(w.balance || 0), 0);

    setStats({
      totalUsers: profilesRes.count ?? 0,
      betsToday: todayBets.length,
      volumeToday: realTodayBets.reduce((s, b) => s + Number(b.bet_amount || 0), 0),
      profitToday: ggr(realTodayBets),
      pendingDeposits: depCntRes.count ?? 0,
      pendingKyc: kycCntRes.count ?? 0,
      pendingWithdrawals: (wdRes.data || []).length,
      coinLiability,
      ggrAllTime: ggr(realBets),
      demoGgr: ggr(demoBetsArr),
      quarantinedLiability,
      demoBets: demoBetsArr.length,
    });

    // C7 Energy aggregates (admin-gated RPC; failure is non-fatal)
    try {
      const { data: es } = await supabase.rpc("admin_energy_stats");
      const esRow = Array.isArray(es) ? es[0] : es;
      if (esRow) setEnergyStats(esRow);
    } catch { /* energy strip stays hidden */ }

    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const weekBets = bets.filter(b => (b.created_at || "") >= weekStart);
    setGameMix(GAMES.map(g => {
      const gb = weekBets.filter(b => b.game_type === g);
      return { game: g, bets: gb.length };
    }).filter(g => g.bets > 0).sort((a, b) => b.bets - a.bets));

    const dailyMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) dailyMap[new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)] = 0;
    bets.forEach(b => { const d = (b.created_at || "").slice(0, 10); if (dailyMap[d] !== undefined) dailyMap[d] += Number(b.bet_amount || 0); });
    setDailyVolume(Object.entries(dailyMap).map(([date, vol]) => ({ date: date.slice(5), volume: +Number(vol).toFixed(2) })));

    const sessions = sessRes.data || [];
    if (sessions.length) {
      const ids = [...new Set(sessions.map(s => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.id] = p.email || "Unknown"; });
      setRecentRounds(sessions.map(s => ({ ...s, email: map[s.user_id] || s.user_id.slice(0, 8) })));
    } else setRecentRounds([]);

    setPendingWds(wdRes.data || []);
    setRecentSignups(signupsRes.data || []);
  }, []);

  const quickApprove = useCallback(async (id: string, amount: number) => {
    if (!confirm(`Approve withdrawal of ${amount}?`)) return;
    setBusyApprove(id);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({ action: "approve_withdrawal", withdrawal_id: id });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Approve failed");
      toast.success("Withdrawal approved"); load();
    } catch (e: any) { toast.error(e.message); }
    setBusyApprove(null);
  }, [load]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 12000);
    const ch = supabase.channel("admin-dash-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_bets" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_submissions" }, () => load())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, [load]);

  const fmt = (n: number, d = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  const totalPending = stats.pendingDeposits + stats.pendingKyc + stats.pendingWithdrawals;

  return (
    <div className="dx-root">
      <style>{DX_CSS}</style>

      {/* ── Title bar (gold) ── */}
      <div className="dx-titlebar">
        <span className="dx-tb-ico">▣</span>
        <span>Dashboard</span>
        <span className="dx-tb-live"><span className="dx-dot" /> LIVE · real-time</span>
      </div>

      {/* ── KPI row 1 ── */}
      <div className="dx-grid4">
        <DxStat tone="sky"     icon={<Users className="h-4 w-4" />}       label="Total Players"        value={stats.totalUsers} delay={0} />
        <DxStat tone="violet"  icon={<Dices className="h-4 w-4" />}       label="Bets Today"           value={stats.betsToday} delay={60} />
        <DxStat tone="emerald" icon={<TrendingUp className="h-4 w-4" />}  label="Volume Today"         value={stats.volumeToday} suffix=" USDT" delay={120} />
        <DxStat tone="rose"    icon={<ArrowUpFromLine className="h-4 w-4" />} label="Pending Withdrawals" value={stats.pendingWithdrawals} delay={180} />
      </div>

      {/* ── KPI row 2 ── */}
      <div className="dx-grid4">
        <DxStat tone="gold"    icon={<DollarSign className="h-4 w-4" />}  label="GGR · Today"          value={stats.profitToday} suffix=" USDT" signed delay={0} />
        <DxStat tone="gold"    icon={<Wallet className="h-4 w-4" />}      label="Cash Liability · USDT" value={stats.coinLiability} suffix=" USDT" delay={60} />
        <div className="dx-card dx-in" style={{ animationDelay: "120ms" }}>
          <div className="dx-card-top"><span className="dx-card-lbl">Platform Health</span>
            <span className="dx-ico-tile" style={{ background: "rgba(34,224,122,0.14)", color: "#22e07a" }}><HeartPulse className="h-4 w-4" /></span></div>
          <div className="dx-health"><span className="dx-dot" style={{ background: "#22e07a", boxShadow: "0 0 8px #22e07a" }} />
            {totalPending === 0 ? "Healthy" : `${totalPending} pending`}</div>
          <div className="dx-card-sub">{totalPending === 0 ? "All queues clear" : "Operational · queues active"}</div>
        </div>
        <div className="dx-card dx-in" style={{ animationDelay: "180ms" }}>
          <div className="dx-card-top"><span className="dx-card-lbl">Auto-Refresh</span>
            <span className="dx-ico-tile" style={{ background: "rgba(79,155,255,0.14)", color: "#4f9bff" }}><Clock className="h-4 w-4" /></span></div>
          <div className="dx-card-val" style={{ color: "#4f9bff" }}>12s</div>
          <div className="dx-card-sub">Live data · realtime channel</div>
        </div>
      </div>

      {/* ── Gross Gaming Revenue hero — all-time GGR (Σ bet − payout). GROSS gaming
             revenue, NOT platform cash balance and NOT net profit: bonuses, C74
             fee-cover, gateway & on-chain payout costs are not deducted here. ── */}
      <div className="pb-energy">
        <div className="pb-energy-head">
          <span className="pb-energy-bolt" aria-hidden="true">⚡</span>
          <span className="pb-energy-label">GAMING REVENUE (GGR) · REAL</span>
          <span className="pb-energy-live"><span className="pb-energy-dot" aria-hidden="true" /> LIVE</span>
        </div>
        <div className="pb-energy-val">
          {stats.ggrAllTime < 0 ? "−" : ""}{fmt(Math.abs(stats.ggrAllTime), 2)} <span>USDT · all-time GGR</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,233,168,0.7)", marginTop: 2 }}>
          Real verified play only — seeded/demo &amp; quarantined balances excluded (shown below).
          Gross, before bonuses, C74 fee-cover &amp; payout costs. Not platform cash balance.
        </div>
        <div className="pb-energy-wave" aria-hidden="true">
          {Array.from({ length: 32 }).map((_, i) => (
            <i key={i} style={{ animationDelay: `${(i % 16) * 0.08}s` }} />
          ))}
        </div>
        <div className="pb-energy-sub">
          <div>
            <b style={{ color: stats.profitToday >= 0 ? "#6bf5a3" : "#ff8a99" }}>
              {stats.profitToday >= 0 ? "+" : "−"}{fmt(Math.abs(stats.profitToday))}
            </b>
            <span>GGR · today</span>
          </div>
          <div><b>{fmt(stats.coinLiability)}</b><span>Cash liability · USDT</span></div>
          <div><b>{fmt(stats.volumeToday)}</b><span>Volume · today</span></div>
        </div>
        {energyStats && (
          <div className="pb-energy-strip">
            <span className="pb-es-bolt" aria-hidden="true">⚡</span>
            <span><b>{fmt(energyStats.total_issued)}</b> issued</span>
            <span className="pb-es-dot">·</span>
            <span><b>{fmt(energyStats.total_burned)}</b> burned</span>
            <span className="pb-es-dot">·</span>
            <span><b>{fmt(energyStats.players_with_energy)}</b> charged players</span>
            <span className="pb-es-dot">·</span>
            <span>discount cost <b style={{ color: "#ffb44d" }}>${fmt(energyStats.discount_cost_usd)}</b></span>
          </div>
        )}
      </div>

      {/* ── Demo / Test — SEGREGATED, excluded from every real-money KPI. Seeded
             demo play + quarantined unbacked balances. Audit visibility only. ── */}
      {(stats.demoBets > 0 || stats.quarantinedLiability > 0) && (
        <div className="dx-card" style={{ borderStyle: "dashed", borderColor: "rgba(148,163,184,0.4)" }}>
          <div className="dx-card-lbl" style={{ marginBottom: 8 }}>Demo / Test · excluded from real economy</div>
          <div className="dx-grid3">
            <div><div className="dx-mini-val" style={{ color: "#94a3b8" }}>{stats.demoGgr < 0 ? "−" : ""}{fmt(Math.abs(stats.demoGgr), 2)}</div><div className="dx-mini-lbl">Demo GGR · USDT (seeded)</div></div>
            <div><div className="dx-mini-val" style={{ color: "#94a3b8" }}>{fmt(stats.quarantinedLiability, 2)}</div><div className="dx-mini-lbl">Quarantined balance · USDT</div></div>
            <div><div className="dx-mini-val" style={{ color: "#94a3b8" }}>{fmt(stats.demoBets)}</div><div className="dx-mini-lbl">Demo / test bets</div></div>
          </div>
          <div className="dx-card-sub" style={{ marginTop: 8 }}>Not real money · segregated for audit · records preserved.</div>
        </div>
      )}

      {/* ── Operational queues (money) ── */}
      <div className="dx-grid3">
        <DxQueue icon={<Banknote className="h-4 w-4" />}       label="Pending Deposits"    count={stats.pendingDeposits} onClick={() => onNav?.("manual_deposits")} />
        <DxQueue icon={<ShieldCheck className="h-4 w-4" />}    label="KYC to Review"       count={stats.pendingKyc} onClick={() => onNav?.("kyc")} />
        <DxQueue icon={<ArrowUpFromLine className="h-4 w-4" />} label="Pending Withdrawals" count={stats.pendingWithdrawals} onClick={() => onNav?.("withdrawals")} />
      </div>

      {/* ── Charts ── */}
      <div className="dx-charts">
        <div className="dx-card dx-in dx-chart-main">
          <div className="dx-card-lbl" style={{ marginBottom: 10 }}>Wager Volume · 30 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyVolume} margin={{ top: 5, right: 8, bottom: 5, left: -18 }}>
              <defs>
                <linearGradient id="ac-vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5c451" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f5c451" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(230,237,246,0.35)" fontSize={9} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="rgba(230,237,246,0.35)" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="volume" stroke="#f5c451" strokeWidth={2} fill="url(#ac-vol)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="dx-card dx-in">
          <div className="dx-card-lbl" style={{ marginBottom: 10 }}>Game Mix · 7 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gameMix} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="game" stroke="rgba(230,237,246,0.5)" fontSize={9} tickLine={false} axisLine={false} width={56} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="bets" radius={[0, 5, 5, 0]}>
                {gameMix.map((_, i) => <Cell key={i} fill={i === 0 ? "#f5c451" : "#4f9bff"} fillOpacity={i === 0 ? 1 : 0.6} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom: live feed + action queues ── */}
      <div className="dx-charts">
        <div className="dx-card dx-in dx-chart-main" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dx-feed-head">
            <Activity className="h-3.5 w-3.5" style={{ color: "#22e07a" }} />
            <h3 className="dx-feed-title">Live Bets</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dx-table">
              <thead><tr>
                <th style={{ textAlign: "left" }}>Player</th><th style={{ textAlign: "left" }}>Game</th>
                <th style={{ textAlign: "right" }}>Bet</th><th style={{ textAlign: "right" }}>Multi</th>
                <th style={{ textAlign: "right" }}>Payout</th><th style={{ textAlign: "center" }}>Result</th>
              </tr></thead>
              <tbody>
                {recentRounds.map((r: any) => {
                  const isWin = r.status === "completed" && Number(r.payout || 0) > Number(r.bet_amount);
                  return (
                    <tr key={r.id} className="dx-trow">
                      <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><DxAvatar email={r.email} /><span style={{ color: "rgba(230,237,246,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{r.email}</span></div></td>
                      <td style={{ color: "#e6edf6", textTransform: "capitalize" }}>{r.game_type}</td>
                      <td style={{ textAlign: "right", color: "#e6edf6" }} className="dx-mono">{fmt(Number(r.bet_amount), 2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#f5c451" }} className="dx-mono">{r.multiplier ? `${Number(r.multiplier).toFixed(2)}x` : "—"}</td>
                      <td style={{ textAlign: "right", color: "#e6edf6" }} className="dx-mono">{fmt(Number(r.payout || 0), 2)}</td>
                      <td style={{ textAlign: "center" }}><span className="dx-pill" style={{ background: isWin ? "rgba(34,224,122,0.15)" : "rgba(255,92,108,0.15)", color: isWin ? "#6bf5a3" : "#ff8a99" }}>{r.status === "active" ? "LIVE" : isWin ? "WIN" : "LOSS"}</span></td>
                    </tr>
                  );
                })}
                {recentRounds.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(230,237,246,0.2)" }}>Waiting for activity…</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="dx-card dx-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Clock size={14} style={{ color: "#f5c451" }} /><h3 className="dx-feed-title">Withdrawals</h3></div>
              {pendingWds.length > 0 && <span className="dx-count-badge">{pendingWds.length}</span>}
            </div>
            {pendingWds.length === 0 ? <div style={{ padding: "20px 0", textAlign: "center", fontSize: 10, color: "rgba(230,237,246,0.3)" }}>Queue clear ✓</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingWds.map(w => (
                  <div key={w.id} className="dx-mini-row">
                    <div style={{ minWidth: 0, flex: 1 }}><div className="dx-mono" style={{ fontSize: 12, fontWeight: 800, color: "#e6edf6" }}>{fmt(Number(w.amount), 2)} <span style={{ fontSize: 9, color: "rgba(230,237,246,0.4)" }}>{w.chain}</span></div><div style={{ fontSize: 9, color: "rgba(230,237,246,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.to_address?.slice(0, 8)}…{w.to_address?.slice(-6)}</div></div>
                    <button onClick={() => quickApprove(w.id, Number(w.amount))} disabled={busyApprove === w.id} className="dx-approve">{busyApprove === w.id ? "…" : <Check size={11} />}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dx-card dx-in">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><UserPlus size={14} style={{ color: "#4f9bff" }} /><h3 className="dx-feed-title">New Players</h3></div>
            {recentSignups.length === 0 ? <div style={{ padding: "20px 0", textAlign: "center", fontSize: 10, color: "rgba(230,237,246,0.3)" }}>No new signups</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentSignups.map(u => (
                  <div key={u.id} className="dx-mini-row">
                    <DxAvatar email={u.email || ""} />
                    <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#e6edf6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.display_name || u.email?.split("@")[0] || "—"}</div>
                      <div style={{ fontSize: 9, color: "rgba(230,237,246,0.4)" }}>KYC <span style={{ color: u.kyc_status === "verified" || u.kyc_status === "approved" ? "#6bf5a3" : "#f5c451" }}>{u.kyc_status || "none"}</span> · {new Date(u.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dark KPI stat card ── */
function DxStat({ icon, label, value, suffix = "", tone = "sky", delay = 0, signed = false }:
  { icon: React.ReactNode; label: string; value: number; suffix?: string; tone?: DxTone; delay?: number; signed?: boolean }) {
  const v = useCountUp(value, 800);
  const c = DX_TONE[tone];
  const shown = signed ? `${value >= 0 ? "+" : "−"}${Math.abs(Math.round(v)).toLocaleString()}` : Math.round(v).toLocaleString();
  return (
    <div className="dx-card dx-in" style={{ animationDelay: `${delay}ms`, borderColor: c.ring }}>
      <div className="dx-card-top">
        <span className="dx-card-lbl">{label}</span>
        <span className="dx-ico-tile" style={{ background: c.tile, color: c.fg }}>{icon}</span>
      </div>
      <div className="dx-card-val dx-mono" style={{ color: c.fg }}>{shown}{suffix}</div>
    </div>
  );
}

/* ── Dark ops-queue card (clickable) ── */
function DxQueue({ icon, label, count, onClick }: { icon: React.ReactNode; label: string; count: number; onClick?: () => void }) {
  const active = count > 0;
  return (
    <button type="button" onClick={onClick} className="dx-card dx-in dx-queue" style={{ borderColor: active ? "rgba(255,92,108,0.4)" : undefined }}>
      <span className="dx-ico-tile" style={{ background: active ? "rgba(255,92,108,0.16)" : "rgba(255,255,255,0.05)", color: active ? "#ff8a99" : "rgba(230,237,246,0.5)" }}>{icon}</span>
      <div style={{ minWidth: 0, textAlign: "left" }}>
        <div className="dx-card-val dx-mono" style={{ fontSize: 20, color: "#e6edf6" }}>{count}</div>
        <div className="dx-card-sub" style={{ marginTop: 0 }}>{label}</div>
      </div>
      {active && <span className="dx-dot" style={{ marginLeft: "auto", background: "#ff5c6c", boxShadow: "0 0 8px #ff5c6c" }} />}
    </button>
  );
}

function DxAvatar({ email }: { email: string }) {
  const letter = (email || "?").charAt(0).toUpperCase();
  return (
    <div className="dx-avatar">{letter}</div>
  );
}

type DxTone = "sky" | "violet" | "emerald" | "rose" | "gold";
const DX_TONE: Record<DxTone, { fg: string; ring: string; tile: string }> = {
  sky:     { fg: "#4f9bff", ring: "rgba(79,155,255,0.28)",  tile: "rgba(79,155,255,0.14)" },
  violet:  { fg: "#a78bfa", ring: "rgba(167,139,250,0.28)", tile: "rgba(167,139,250,0.14)" },
  emerald: { fg: "#22e07a", ring: "rgba(34,224,122,0.28)",  tile: "rgba(34,224,122,0.14)" },
  rose:    { fg: "#ff5c6c", ring: "rgba(255,92,108,0.28)",  tile: "rgba(255,92,108,0.14)" },
  gold:    { fg: "#f5c451", ring: "rgba(245,196,81,0.30)",  tile: "rgba(245,196,81,0.14)" },
};

// Scoped dark styling — `.dx-*` custom classes + inline colors are NOT inverted
// by admin-light.css (which only overrides text-white / bg-white utilities), so
// this dashboard keeps its premium dark look inside the light console.
const DX_CSS = `
.dx-root { display: flex; flex-direction: column; gap: 16px;
  background: radial-gradient(120% 80% at 100% 0%, rgba(245,196,81,0.05), transparent 55%), radial-gradient(90% 90% at 0% 100%, rgba(79,155,255,0.05), transparent 55%), #0a0e15;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 16px; margin: -4px; }
@keyframes dx-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dx-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.dx-in { animation: dx-in .45s cubic-bezier(.22,.61,.36,1) backwards; }
.dx-mono { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dx-dot { width: 6px; height: 6px; border-radius: 50%; background: #22e07a; box-shadow: 0 0 8px #22e07a; display: inline-block; animation: dx-pulse 1.5s ease-in-out infinite; }

.dx-titlebar { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 14px; font-size: 15px; font-weight: 900; color: #23180a;
  background: linear-gradient(180deg, #ffe08a, #f5c451 55%, #e0a92e); box-shadow: 0 8px 24px -10px rgba(245,196,81,0.5), inset 0 1px 0 rgba(255,255,255,0.5); }
.dx-tb-ico { font-size: 15px; opacity: 0.85; }
.dx-tb-live { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 900; letter-spacing: 1px; color: rgba(35,24,10,0.7); }
.dx-tb-live .dx-dot { background: #0b7a3f; box-shadow: 0 0 8px #0b7a3f; }

.dx-grid4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.dx-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (min-width: 1024px) { .dx-grid4 { grid-template-columns: repeat(4, 1fr); } }

.dx-card { background: linear-gradient(180deg, #141a24, #0f141c); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; position: relative; overflow: hidden; }
.dx-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.dx-card-lbl { font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.4px; color: rgba(230,237,246,0.5); }
.dx-ico-tile { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto; }
.dx-card-val { font-size: 26px; font-weight: 900; line-height: 1.05; }
.dx-card-sub { font-size: 10px; color: rgba(230,237,246,0.4); margin-top: 4px; }
.dx-health { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 900; color: #22e07a; }

.dx-mini-val { font-size: 18px; font-weight: 900; font-variant-numeric: tabular-nums; }
.dx-mini-lbl { font-size: 9.5px; color: rgba(230,237,246,0.45); font-weight: 700; margin-top: 2px; }

.dx-queue { display: flex; align-items: center; gap: 12px; cursor: pointer; width: 100%; transition: transform .14s, border-color .14s; }
.dx-queue:hover { transform: translateY(-1px); }

.dx-charts { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 1024px) { .dx-charts { grid-template-columns: 2fr 1fr; } .dx-chart-main { grid-column: span 1; } }

.dx-feed-head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.dx-feed-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.6px; color: rgba(230,237,246,0.55); margin: 0; }
.dx-table { width: 100%; font-size: 12px; min-width: 560px; border-collapse: collapse; }
.dx-table th { padding: 12px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: rgba(230,237,246,0.3); }
.dx-table td { padding: 12px; }
.dx-trow { border-top: 1px solid rgba(255,255,255,0.045); transition: background .15s; }
.dx-trow:hover { background: rgba(255,255,255,0.025); }
.dx-pill { font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 999px; }
.dx-mini-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; background: rgba(255,255,255,0.035); }
.dx-count-badge { font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 999px; background: rgba(245,196,81,0.2); color: #f5c451; }
.dx-approve { font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 999px; background: rgba(34,224,122,0.2); color: #6bf5a3; border: none; cursor: pointer; transition: background .15s; }
.dx-approve:hover { background: rgba(34,224,122,0.32); }
.dx-approve:disabled { opacity: 0.5; }
.dx-avatar { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; color: #fff; font-size: 9px; flex: 0 0 auto; background: linear-gradient(135deg, #4f9bff, #1e4fa0); }

/* Platform Balance — C7 energy hero (dark, unchanged inline styling) */
.pb-energy { position: relative; overflow: hidden; border-radius: 18px; padding: 16px 18px; color: #fff;
  background: radial-gradient(120% 120% at 100% 0%, rgba(245,180,35,0.16), transparent 55%), radial-gradient(100% 100% at 0% 100%, rgba(34,224,122,0.18), transparent 55%), linear-gradient(150deg, #0c1f14, #06120c);
  border: 1px solid rgba(245,180,35,0.4);
  animation: dx-in .45s cubic-bezier(.22,.61,.36,1) backwards, pb-glow 2.6s ease-in-out infinite; will-change: box-shadow; }
@keyframes pb-glow {
  0%,100% { box-shadow: 0 12px 30px -10px rgba(0,0,0,0.6), 0 0 20px -10px rgba(46,230,130,0.35), inset 0 1px 0 rgba(255,236,180,0.2); }
  50%     { box-shadow: 0 12px 30px -10px rgba(0,0,0,0.6), 0 0 32px -4px rgba(46,230,130,0.7), inset 0 1px 0 rgba(255,236,180,0.2); } }
.pb-energy-head { display: flex; align-items: center; gap: 8px; }
.pb-energy-bolt { font-size: 15px; filter: drop-shadow(0 0 6px rgba(255,214,120,0.9)); animation: pb-flick 1.4s steps(1) infinite; }
@keyframes pb-flick { 0%,46%,54%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.pb-energy-label { font-size: 10px; font-weight: 900; letter-spacing: 1.8px; color: #b9f6d0; }
.pb-energy-live { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 900; letter-spacing: 1px; color: #ff9aa6; }
.pb-energy-dot { width: 6px; height: 6px; border-radius: 50%; background: #ff4d4d; box-shadow: 0 0 8px #ff4d4d; animation: pb-flick 1.2s steps(1) infinite; }
.pb-energy-val { margin-top: 8px; font-size: 34px; font-weight: 900; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.05;
  background: linear-gradient(135deg, #ffe9a8, #f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 12px rgba(245,180,35,0.4)); }
.pb-energy-val span { font-size: 13px; -webkit-text-fill-color: rgba(255,233,168,0.7); }
.pb-energy-wave { display: flex; align-items: center; gap: 2.5px; height: 26px; margin: 10px 0 12px; }
.pb-energy-wave i { flex: 1; border-radius: 2px; height: 100%; transform: scaleY(0.3); transform-origin: center;
  background: linear-gradient(180deg, #eaffe9, #34e58a); box-shadow: 0 0 5px rgba(46,230,130,0.6);
  animation: pb-bar 0.9s ease-in-out infinite alternate; will-change: transform; }
.pb-energy-wave i:nth-child(3n) { background: linear-gradient(180deg, #fff6d8, #f5b423); box-shadow: 0 0 5px rgba(255,190,60,0.6); }
@keyframes pb-bar { 0% { transform: scaleY(0.25); opacity: 0.6; } 100% { transform: scaleY(1); opacity: 1; } }
.pb-energy-sub { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.pb-energy-sub > div { padding: 8px 6px; border-radius: 11px; background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.2)); border: 1px solid rgba(245,180,35,0.16); text-align: center; }
.pb-energy-sub b { display: block; font-size: 15px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums; }
.pb-energy-sub span { display: block; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.pb-energy-strip { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 12px; padding-top: 11px; border-top: 1px solid rgba(245,180,35,0.14); font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.6); }
.pb-energy-strip b { color: #ffe9a8; font-variant-numeric: tabular-nums; }
.pb-es-bolt { filter: drop-shadow(0 0 5px rgba(255,214,120,0.8)); }
.pb-es-dot { color: rgba(255,255,255,0.25); }
@media (prefers-reduced-motion: reduce) { .dx-in, .dx-dot, .pb-energy, .pb-energy-bolt, .pb-energy-dot, .pb-energy-wave i { animation: none !important; } .pb-energy-wave i { transform: scaleY(0.6); } }
`;
