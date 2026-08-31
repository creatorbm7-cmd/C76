// C74 Contribution — read-only analytics for the "Real-Earning Flywheel".
//
// Shows how each user's REAL activity (play/wager, loyalty energy, reputation,
// referrals, VIP) rolls up into a transparent Contribution Score and a reward
// tier/multiplier. This is measurement only: it never mints or promises C74. Any
// actual reward stays gated by emission caps + the reserve invariant — the score
// is explicitly NOT guaranteed money. Data via admin_c74_contribution_overview.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Sparkles, Users, Gauge, TrendingUp, Trophy, Info,
  Calculator, ShieldCheck, ShieldAlert, Play,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Row {
  user_id: string; score: number; tier: string; multiplier: number;
  reputation: number; wager: number; referrals: number; energy: number;
}
interface TierRow { tier: string; ord: number; multiplier: number; user_count: number; score_sum: number; }
interface Agg { users_total: number; users_eligible: number; score_sum: number; score_avg: number; score_max: number; }
interface Overview {
  generated_at: string; formula: string; contract: string;
  aggregate: Agg; tiers: TierRow[]; top: Row[];
}
interface SimRow {
  user_id: string; score: number; multiplier: number; raw_eligible: number;
  after_daily: number; after_lifetime: number; simulated_emission: number;
  day_emitted: number; life_emitted: number;
}
interface Sim {
  generated_at: string; contract: string;
  assumptions: { daily_reward_pool_sim: number; note: string };
  config: { earn_enabled: boolean; per_user_daily_cap: number; per_user_lifetime_cap: number;
    global_daily_cap: number; global_daily_used: number; global_daily_remaining: number };
  reserve: { invariant_ok: boolean; reserve_usdt: number; redeemable_liability_usdt: number; peg_rate: number; headroom_c74: number };
  result: { eligible_users: number; total_raw_after_caps: number; gate_ceiling_c74: number;
    simulated_total_emission: number; binding_gate: string; emits_anything: boolean };
  top: SimRow[];
}

const GATE_LABEL: Record<string, string> = {
  earn_disabled: "Emission disabled (c74_earn_enabled = false)",
  reserve_invariant_broken: "Reserve invariant broken",
  reserve_headroom: "Bound by reserve headroom",
  global_daily_cap: "Bound by global daily cap",
  within_limits: "Within all limits",
};

const short = (s: string | null, head = 6, tail = 4) =>
  !s ? "—" : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

const TIER_COLOR: Record<string, { bg: string; fg: string; ring: string }> = {
  Diamond:  { bg: "rgba(14,165,233,0.12)",  fg: "#0369a1", ring: "rgba(14,165,233,0.4)" },
  Platinum: { bg: "rgba(139,92,246,0.12)",  fg: "#6d28d9", ring: "rgba(139,92,246,0.4)" },
  Gold:     { bg: "rgba(217,154,31,0.14)",  fg: "#a16207", ring: "rgba(217,154,31,0.45)" },
  Silver:   { bg: "rgba(100,116,139,0.12)", fg: "#475569", ring: "rgba(100,116,139,0.4)" },
  Bronze:   { bg: "rgba(180,120,80,0.12)",  fg: "#8a5a2b", ring: "rgba(180,120,80,0.4)" },
};

export default function AdminC74Contribution() {
  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<Overview | null>(null);
  const [sim, setSim] = useState<Sim | null>(null);
  const [pool, setPool] = useState("10000");
  const [simBusy, setSimBusy] = useState(false);

  const runSim = useCallback(async (poolVal: number) => {
    setSimBusy(true);
    const { data, error } = await (supabase.rpc as any)("admin_c74_reward_simulation", { p_limit: 50, p_daily_pool: poolVal });
    if (error) toast.error(error.message);
    else setSim(data as Sim);
    setSimBusy(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_c74_contribution_overview", { p_limit: 50 });
    if (error) toast.error(error.message);
    else setOv(data as Overview);
    setLoading(false);
    runSim(10000);
  }, [runSim]);
  useEffect(() => { load(); }, [load]);

  const a = ov?.aggregate;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.cc-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}
        .cc-mono{font-variant-numeric:tabular-nums;letter-spacing:-.01em}
        .cc-in{background:#fff;border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:7px 10px;font-size:13px;color:#0f172a;font-variant-numeric:tabular-nums}
        .cc-in:focus{outline:none;border-color:rgba(37,99,235,0.5);box-shadow:0 0 0 3px rgba(37,99,235,0.12)}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="C74 Ecosystem · Real-Earning Flywheel"
          title="C74 CONTRIBUTION"
          tone="amber"
          icon={<Sparkles className="h-5 w-5" />}
          badges={[
            { label: `${a?.users_eligible ?? 0} ELIGIBLE`, tone: "emerald", dot: true },
            { label: `AVG ${fmt(a?.score_avg ?? 0)}`, tone: "cyan" },
            { label: `MAX ${fmt(a?.score_max ?? 0)}`, tone: "amber" },
          ]}
          subtitle={<>Real activity → Contribution Score → reward tier. <b>Measurement only</b> — this never mints or promises C74. Actual rewards stay gated by emission caps and the reserve invariant.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* Not-guaranteed contract */}
        <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-center gap-2 flex-wrap"
             style={{ background: "rgba(217,154,31,0.07)", border: "1px solid rgba(217,154,31,0.28)", color: "#92600b" }}>
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span><b>Score ≠ guaranteed C74.</b> {ov?.contract ?? "Rewards remain gated by emission caps and the reserve invariant; deposits are an activity signal, never a reward backing."}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Users className="h-4 w-4" />} label="Eligible users" value={a?.users_eligible ?? 0} sub={`of ${fmt(a?.users_total ?? 0)} total`} tone="emerald" delay={0} />
          <V8StatCard icon={<Gauge className="h-4 w-4" />} label="Avg score" value={a?.score_avg ?? 0} sub="per eligible user" tone="cyan" delay={80} />
          <V8StatCard icon={<TrendingUp className="h-4 w-4" />} label="Max score" value={a?.score_max ?? 0} sub="top contributor" tone="amber" delay={160} />
          <V8StatCard icon={<Trophy className="h-4 w-4" />} label="Total score" value={a?.score_sum ?? 0} sub="reward-share basis" tone="rose" delay={240} />
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !ov ? (
          <div className="p-10 text-center text-slate-400 text-xs">No data</div>
        ) : (
          <>
            {/* Tier distribution */}
            <div className="cc-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4" style={{ color: "#a16207" }} />
                <h3 className="text-sm font-black text-slate-800">Reward tiers</h3>
                <span className="ml-auto text-[10px] text-slate-400">multiplier applies within caps — not a payout</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                {ov.tiers.slice().sort((x, y) => y.ord - x.ord).map((t) => {
                  const c = TIER_COLOR[t.tier] ?? TIER_COLOR.Bronze;
                  return (
                    <div key={t.tier} className="rounded-xl p-3" style={{ background: c.bg, border: `1px solid ${c.ring}` }}>
                      <div className="text-[11px] font-black" style={{ color: c.fg }}>{t.tier}</div>
                      <div className="cc-mono text-lg font-black text-slate-800">{t.multiplier.toFixed(2)}×</div>
                      <div className="text-[10.5px] text-slate-500">{fmt(t.user_count)} users</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top contributors */}
            <div className="cc-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 pb-2">
                <Sparkles className="h-4 w-4" style={{ color: "#a16207" }} />
                <h3 className="text-sm font-black text-slate-800">Top contributors</h3>
                <span className="ml-auto text-[11px] text-slate-400">{ov.top.length} shown · {ov.formula}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold">User</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Tier</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Score</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">×</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Rep</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Wager</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Refs</th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Energy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.top.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">No eligible contributors yet.</td></tr>
                    ) : ov.top.map((r, i) => {
                      const c = TIER_COLOR[r.tier] ?? TIER_COLOR.Bronze;
                      return (
                        <tr key={r.user_id} className="av8-row border-b border-slate-50">
                          <td className="px-4 py-2.5 text-xs text-slate-500"><span className="cc-mono text-slate-400">#{i + 1}</span> <span className="cc-mono">{short(r.user_id)}</span></td>
                          <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg, border: `1px solid ${c.ring}` }}>{r.tier}</span></td>
                          <td className="px-3 py-2.5 text-right cc-mono font-bold text-slate-800">{fmt(r.score)}</td>
                          <td className="px-3 py-2.5 text-right cc-mono text-slate-500">{r.multiplier.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right cc-mono text-slate-500">{fmt(r.reputation)}</td>
                          <td className="px-3 py-2.5 text-right cc-mono text-slate-500">${fmt(r.wager)}</td>
                          <td className="px-3 py-2.5 text-right cc-mono text-slate-500">{fmt(r.referrals)}</td>
                          <td className="px-4 py-2.5 text-right cc-mono text-slate-500">{fmt(r.energy)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Read-only reward simulation */}
            <div className="cc-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                <h3 className="text-sm font-black text-slate-800">Reward simulation</h3>
                <span className="ml-auto text-[10px] text-slate-400">Score → Eligible → Daily → Lifetime → Reserve → Emission</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Sim daily pool (C74)</label>
                <input className="cc-in" style={{ width: 130 }} inputMode="decimal" value={pool} onChange={(e) => setPool(e.target.value)} />
                <button onClick={() => runSim(Math.max(0, parseFloat(pool) || 0))} disabled={simBusy}
                  className="av8-action-btn px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                  {simBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Simulate
                </button>
                <span className="text-[10.5px] text-slate-400">hypothetical budget — not a stored cap</span>
              </div>

              {!sim ? (
                <div className="p-6 text-center text-slate-400 text-xs">{simBusy ? "Simulating…" : "Run a simulation"}</div>
              ) : (
                <>
                  {/* Result banner */}
                  <div className="rounded-lg px-3 py-2.5 text-[12px] flex items-center gap-2 flex-wrap mb-3"
                       style={sim.result.emits_anything
                         ? { background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.3)", color: "#15803d" }
                         : { background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.28)", color: "#be123c" }}>
                    {sim.result.emits_anything ? <ShieldCheck className="h-4 w-4 flex-shrink-0" /> : <ShieldAlert className="h-4 w-4 flex-shrink-0" />}
                    <span>
                      Simulated emission today: <b>{fmt(sim.result.simulated_total_emission)} C74</b> across {sim.result.eligible_users} users.
                      {" "}Gate: <b>{GATE_LABEL[sim.result.binding_gate] ?? sim.result.binding_gate}</b>.
                      {!sim.result.emits_anything && " Nothing would be emitted."}
                    </span>
                  </div>

                  {/* Gate chips */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] mb-3">
                    <div className="rounded-lg p-2.5 bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">Earn enabled</div>
                      <div className="cc-mono font-black" style={{ color: sim.config.earn_enabled ? "#15803d" : "#be123c" }}>{sim.config.earn_enabled ? "ON" : "OFF"}</div>
                    </div>
                    <div className="rounded-lg p-2.5 bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">Per-user caps</div>
                      <div className="cc-mono font-black text-slate-700">{fmt(sim.config.per_user_daily_cap)}/day · {fmt(sim.config.per_user_lifetime_cap)} life</div>
                    </div>
                    <div className="rounded-lg p-2.5 bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">Global daily left</div>
                      <div className="cc-mono font-black text-slate-700">{fmt(sim.config.global_daily_remaining)}</div>
                    </div>
                    <div className="rounded-lg p-2.5 bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">Reserve headroom</div>
                      <div className="cc-mono font-black" style={{ color: sim.reserve.invariant_ok ? "#15803d" : "#be123c" }}>{fmt(sim.reserve.headroom_c74)} C74</div>
                    </div>
                  </div>

                  {/* Pipeline table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100">
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">User</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Score</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">×</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Eligible</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">≤Daily</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">≤Lifetime</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Sim emit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sim.top.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">No eligible users.</td></tr>
                        ) : sim.top.slice(0, 20).map((r) => (
                          <tr key={r.user_id} className="av8-row border-b border-slate-50">
                            <td className="px-3 py-2 cc-mono text-xs text-slate-500">{short(r.user_id)}</td>
                            <td className="px-3 py-2 text-right cc-mono text-slate-700">{fmt(r.score)}</td>
                            <td className="px-3 py-2 text-right cc-mono text-slate-400">{r.multiplier.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right cc-mono text-slate-500">{fmt(r.raw_eligible)}</td>
                            <td className="px-3 py-2 text-right cc-mono text-slate-500">{fmt(r.after_daily)}</td>
                            <td className="px-3 py-2 text-right cc-mono text-slate-500">{fmt(r.after_lifetime)}</td>
                            <td className="px-3 py-2 text-right cc-mono font-bold" style={{ color: r.simulated_emission > 0 ? "#15803d" : "#94a3b8" }}>{fmt(r.simulated_emission)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-3">{sim.contract}</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
