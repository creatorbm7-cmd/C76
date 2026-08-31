// C74 Rewards — analytics dashboard (admin).
//
// Read-only view of the C74 internal rewards ledger: circulating supply,
// lifetime minted/burned, holder count, the platform's outstanding
// fee-coverage liability at the current peg, a per-source earn breakdown and
// the top holders. Backed by the get_c74_admin_stats() RPC (admin-gated). C74
// is surfaced from the existing "energy" engine — no economic values change.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Coins, Flame, Users, Scale, Sparkles } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface BySource { source: string; entries: number; total: number; }
interface Holder { user_id: string; balance: number; tier: string; }
interface C74Config {
  wager_earn_per_usdt: number; deposit_earn_per_usdt: number;
  usdt_per_c74: number; c74_per_usdt: number; fee_cover_cap: number; gas_enabled: boolean;
}
interface C74Stats {
  circulating_supply: number; total_minted: number; total_burned: number; holders: number;
  liability_usdt: number; by_source: BySource[]; top_holders: Holder[]; config: C74Config;
}

const SOURCE_LABEL: Record<string, string> = {
  wager: "Wager Rewards", deposit: "Deposit Rewards", withdraw_gas: "Withdrawal Fee Cover",
  backfill: "Adjustments", admin_adjust: "Admin Adjustments", referral: "Referral Rewards",
  daily: "Daily Bonus", vip: "VIP Rewards", mission: "Missions",
};
const srcLabel = (k: string) => SOURCE_LABEL[k] ?? k.replace(/_/g, " ");

export default function AdminC74() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<C74Stats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_c74_admin_stats");
    if (error) toast.error(error.message);
    else setStats(data as C74Stats);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cfg = stats?.config;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.c74-card{background:#ffffff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.c74-mono{font-variant-numeric:tabular-nums;letter-spacing:-.02em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Rewards · C74 Ecosystem"
          title="C74 REWARDS"
          tone="amber"
          icon={<Sparkles className="h-5 w-5" />}
          badges={[
            { label: `${fmt(stats?.circulating_supply ?? 0)} C74 CIRCULATING`, tone: "amber", dot: true },
            { label: `${fmt(stats?.holders ?? 0)} HOLDERS`, tone: "cyan" },
            { label: cfg?.gas_enabled ? "FEE COVER: ON" : "FEE COVER: OFF", tone: cfg?.gas_enabled ? "emerald" : "rose" },
          ]}
          subtitle={<>Internal rewards ledger · earned by play &amp; deposits · spent to cover withdrawal network fees · <span className="font-bold" style={{ color: "#b45309" }}>${fmt(stats?.liability_usdt ?? 0)}</span> outstanding fee-coverage liability at the current peg.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh C74 stats">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Coins className="h-4 w-4" />} label="Circulating supply" value={Math.round(stats?.circulating_supply ?? 0)} sub="C74 held by players" tone="amber" delay={0} />
          <V8StatCard icon={<Sparkles className="h-4 w-4" />} label="Total minted" value={Math.round(stats?.total_minted ?? 0)} sub="C74 earned all-time" tone="emerald" delay={80} />
          <V8StatCard icon={<Flame className="h-4 w-4" />} label="Total burned" value={Math.round(stats?.total_burned ?? 0)} sub="C74 spent all-time" tone="rose" delay={160} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="Liability" value={Math.round(stats?.liability_usdt ?? 0)} sub="$ fee coverage owed" tone="cyan" delay={240} prefix="$" />
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !stats ? (
          <div className="p-10 text-center text-slate-400 text-xs">No C74 data available</div>
        ) : (
          <>
            {/* Config snapshot */}
            {cfg && (
              <div className="c74-card p-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Live configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <ConfigCell label="Wager earn" value={`${fmt(cfg.wager_earn_per_usdt)} C74/$`} />
                  <ConfigCell label="Deposit earn" value={`${fmt(cfg.deposit_earn_per_usdt)} C74/$`} />
                  <ConfigCell label="Peg" value={`${fmt(cfg.c74_per_usdt)} C74 = $1`} />
                  <ConfigCell label="Fee cover cap" value={`${Math.round((cfg.fee_cover_cap ?? 0) * 100)}%`} />
                  <ConfigCell label="Gasless withdrawals" value={cfg.gas_enabled ? "Enabled" : "Disabled"} tone={cfg.gas_enabled ? "#059669" : "#e11d48"} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By source */}
              <div className="c74-card overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ledger by source</h3>
                </div>
                {(stats.by_source ?? []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No ledger entries yet</div>
                ) : (
                  <div>
                    {stats.by_source.map((s, i) => (
                      <div key={s.source} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i ? "1px solid rgba(15,23,42,0.04)" : undefined }}>
                        <div>
                          <div className="text-[12px] font-bold text-slate-700">{srcLabel(s.source)}</div>
                          <div className="text-[10px] text-slate-400">{fmt(s.entries)} entries</div>
                        </div>
                        <div className="text-sm font-black c74-mono" style={{ color: s.total >= 0 ? "#059669" : "#e11d48" }}>
                          {s.total >= 0 ? "+" : "−"}{fmt(Math.abs(s.total))} C74
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top holders */}
              <div className="c74-card overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Top holders</h3>
                </div>
                {(stats.top_holders ?? []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No holders yet</div>
                ) : (
                  <div>
                    {stats.top_holders.map((h, i) => (
                      <div key={h.user_id} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i ? "1px solid rgba(15,23,42,0.04)" : undefined }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] font-black text-slate-400 w-4">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-600 truncate">{h.tier}</div>
                            <div className="text-[9px] text-slate-400 font-mono truncate">{h.user_id.slice(0, 8)}…</div>
                          </div>
                        </div>
                        <div className="text-sm font-black c74-mono text-slate-900">{fmt(h.balance)} C74</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfigCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)" }}>
      <div className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-bold">{label}</div>
      <div className="text-sm font-black c74-mono mt-1" style={{ color: tone ?? "#0f172a" }}>{value}</div>
    </div>
  );
}
