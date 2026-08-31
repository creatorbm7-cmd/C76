// C74 Earnings — real-time admin earnings dashboard.
//
// Ties C74 (energy) earnings + the withdrawal-fee-cover impact + platform
// revenue into one transparent, audit-friendly view. C74→USD uses the live peg.
// Backed by get_c74_earnings_dashboard(period) + get_c74_earnings_series(days).

import { useState, useEffect, useCallback } from "react";
import { usd } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Coins, Scale, Flame, TrendingUp, Wallet, Gamepad2, ArrowDownToLine } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Dash {
  period: string;
  peg: { usdt_per_c74: number; c74_per_usdt: number };
  supply: { circulating: number; minted: number; burned: number; holders: number };
  earned_by_source: Record<string, number>;
  spent_by_sink: Record<string, number>;
  liability_usdt: number;
  fee_cover: { withdrawals: number; base_fees_usdt: number; platform_net_fees_usdt: number; c74_covered_usdt: number };
  revenue: { deposit_fees_usdt: number; withdrawal_fees_usdt: number; game_ggr_usdt: number; gross_usdt: number };
}
interface Day { day: string; minted: number; burned: number; ggr: number; wd_fees: number; }

const PERIODS = [{ v: "today", l: "Today" }, { v: "7d", l: "7 days" }, { v: "30d", l: "30 days" }, { v: "all", l: "All time" }];
const SOURCE_LABEL: Record<string, string> = {
  wager: "Wager", deposit: "Deposit", referral: "Referral", daily: "Daily", vip: "VIP", mission: "Missions",
  event: "Events", wheel_win: "Wheel win", backfill: "Adjust", withdraw_gas: "Fee cover", wheel_spin: "Wheel spin", gullak_deposit: "Gullak",
};
const lbl = (k: string) => SOURCE_LABEL[k] ?? k.replace(/_/g, " ");
const n0 = (n: number) => Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function AdminC74Earnings() {
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<Dash | null>(null);
  const [series, setSeries] = useState<Day[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [dash, ser] = await Promise.all([
      (supabase.rpc as any)("get_c74_earnings_dashboard", { p_period: period }),
      (supabase.rpc as any)("get_c74_earnings_series", { p_days: 14 }),
    ]);
    if (dash.error) toast.error(dash.error.message); else setD(dash.data as Dash);
    if (!ser.error && Array.isArray(ser.data)) setSeries(ser.data as Day[]);
    setLoading(false);
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const earned = Object.entries(d?.earned_by_source ?? {}).filter(([, v]) => Number(v) > 0).sort((a, b) => Number(b[1]) - Number(a[1]));
  const spent = Object.entries(d?.spent_by_sink ?? {}).filter(([, v]) => Number(v) > 0).sort((a, b) => Number(b[1]) - Number(a[1]));
  const maxGgr = Math.max(1, ...series.map((s) => Math.abs(Number(s.ggr))));

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.ce-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.ce-mono{font-variant-numeric:tabular-nums;letter-spacing:-.02em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Rewards · C74 Earnings"
          title="C74 EARNINGS"
          tone="amber"
          icon={<TrendingUp className="h-5 w-5" />}
          badges={[
            { label: `${n0(d?.supply.circulating ?? 0)} C74 CIRCULATING`, tone: "amber", dot: true },
            { label: `PEG ${n0(d?.peg.c74_per_usdt ?? 0)} = $1`, tone: "cyan" },
            { label: `GROSS ${usd(d?.revenue.gross_usdt ?? 0)}`, tone: (d?.revenue.gross_usdt ?? 0) >= 0 ? "emerald" : "rose" },
          ]}
          subtitle={<>Real-time C74 earnings, withdrawal-fee-cover impact and platform revenue — transparent &amp; audit-friendly. C74 valued at the live peg.</>}
          actions={<V8HeroBtn variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</V8HeroBtn>}
        />

        {/* Period tabs */}
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
              style={period === p.v ? { background: "linear-gradient(135deg,#f59e0b,#b45309)", color: "#fff" } : { background: "rgba(15,23,42,0.05)", color: "#475569" }}>
              {p.l}
            </button>
          ))}
        </div>

        {loading && !d ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : d ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <V8StatCard icon={<Coins className="h-4 w-4" />} label="Circulating C74" value={Math.round(d.supply.circulating)} sub={`${n0(d.supply.holders)} holders`} tone="amber" delay={0} />
              <V8StatCard icon={<Scale className="h-4 w-4" />} label="C74 liability" value={Math.round(d.liability_usdt)} sub="$ owed at peg" tone="cyan" delay={80} prefix="$" />
              <V8StatCard icon={<TrendingUp className="h-4 w-4" />} label="Gross revenue" value={Math.round(d.revenue.gross_usdt)} sub="$ this period" tone={d.revenue.gross_usdt >= 0 ? "emerald" : "rose"} delay={160} prefix="$" />
              <V8StatCard icon={<Flame className="h-4 w-4" />} label="C74 fee-cover" value={Math.round(d.fee_cover.c74_covered_usdt)} sub="$ absorbed" tone="rose" delay={240} prefix="$" />
            </div>

            {/* Revenue + fee cover */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="ce-card p-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Revenue breakdown</h3>
                <Row icon={<ArrowDownToLine className="h-4 w-4 text-emerald-600" />} label="Deposit fees" value={usd(d.revenue.deposit_fees_usdt)} />
                <Row icon={<Wallet className="h-4 w-4 text-emerald-600" />} label="Withdrawal fees (net of cover)" value={usd(d.revenue.withdrawal_fees_usdt)} />
                <Row icon={<Gamepad2 className="h-4 w-4 text-emerald-600" />} label="Game GGR" value={usd(d.revenue.game_ggr_usdt)} tone={d.revenue.game_ggr_usdt < 0 ? "#e11d48" : undefined} />
                <div className="flex items-center justify-between pt-3 mt-1 border-t" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
                  <span className="text-[12px] font-black text-slate-700">Gross</span>
                  <span className="text-base font-black ce-mono" style={{ color: d.revenue.gross_usdt >= 0 ? "#059669" : "#e11d48" }}>{usd(d.revenue.gross_usdt)}</span>
                </div>
              </div>

              <div className="ce-card p-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Withdrawal fee cover (C74 Power)</h3>
                <Row label="Withdrawals" value={n0(d.fee_cover.withdrawals)} />
                <Row label="Base fees (before cover)" value={usd(d.fee_cover.base_fees_usdt)} />
                <Row label="C74 covered (platform absorbed)" value={usd(d.fee_cover.c74_covered_usdt)} tone="#e11d48" />
                <div className="flex items-center justify-between pt-3 mt-1 border-t" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
                  <span className="text-[12px] font-black text-slate-700">Platform net fees</span>
                  <span className="text-base font-black ce-mono text-emerald-600">{usd(d.fee_cover.platform_net_fees_usdt)}</span>
                </div>
              </div>
            </div>

            {/* Earned / spent breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Breakdown title="C74 earned by source" rows={earned} tone="#059669" lbl={lbl} n0={n0} />
              <Breakdown title="C74 spent by sink" rows={spent} tone="#b45309" lbl={lbl} n0={n0} />
            </div>

            {/* Mini series — GGR per day (last 14d) */}
            {series.length > 0 && (
              <div className="ce-card p-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Game GGR · last 14 days ($)</h3>
                <div className="flex items-end gap-1 h-28">
                  {series.map((s) => {
                    const v = Number(s.ggr); const h = Math.max(3, (Math.abs(v) / maxGgr) * 100);
                    return (
                      <div key={s.day} className="flex-1 flex flex-col items-center justify-end" title={`${s.day}: ${usd(v)}`}>
                        <div style={{ height: `${h}%`, width: "100%", borderRadius: 3, background: v >= 0 ? "linear-gradient(180deg,#34d399,#059669)" : "linear-gradient(180deg,#fda4af,#e11d48)" }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 mt-1"><span>{series[0]?.day.slice(5)}</span><span>{series[series.length - 1]?.day.slice(5)}</span></div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center">C74 valued at the live peg ({n0(d.peg.c74_per_usdt)} C74 = $1). Gateway/on-chain costs not yet deducted — gross revenue shown.</p>
          </>
        ) : (
          <div className="ce-card p-10 text-center text-slate-400 text-sm">No data.</div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
      <span className="flex items-center gap-2 text-[12px] text-slate-600">{icon}{label}</span>
      <span className="text-sm font-black ce-mono" style={{ color: tone ?? "#0f172a" }}>{value}</span>
    </div>
  );
}

function Breakdown({ title, rows, tone, lbl, n0 }: { title: string; rows: [string, number][]; tone: string; lbl: (k: string) => string; n0: (n: number) => string }) {
  const total = rows.reduce((s, [, v]) => s + Number(v), 0);
  return (
    <div className="ce-card p-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">{title}</h3>
      {rows.length === 0 ? <div className="text-center text-slate-400 text-xs py-4">Nothing in this period</div> : rows.map(([k, v]) => (
        <div key={k} className="py-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-slate-600">{lbl(k)}</span>
            <span className="font-black ce-mono" style={{ color: tone }}>{n0(Number(v))} C74</span>
          </div>
          <div className="h-1.5 rounded-full mt-1" style={{ background: "rgba(15,23,42,0.06)" }}>
            <div style={{ width: `${Math.max(2, (Number(v) / Math.max(total, 1)) * 100)}%`, height: "100%", borderRadius: 999, background: tone }} />
          </div>
        </div>
      ))}
    </div>
  );
}
