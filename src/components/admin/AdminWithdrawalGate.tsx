// Withdrawal L4 Gate — READ-ONLY per-request gate evaluation.
//
// For each recent withdrawal it shows the L4 gate result (from the real-money flow
// design) and an overall verdict — PASS / HOLD / BLOCK — with the exact reason on
// every gate. It approves nothing and sends nothing: a full PASS still does not pay
// out, because real payout stays OFF until real_money_enabled AND auto_payout_enabled
// are both on. This view classifies; the operator decides.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, ShieldCheck, ShieldAlert, ShieldX, Lock,
  CheckCircle2, AlertTriangle, XCircle, MapPin, Scale, Fingerprint, Clock, Coins, Wallet,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

type GateResult = "pass" | "hold" | "block";
interface Gate { key: string; label: string; result: GateResult; detail: string; }
interface Row {
  rail: string; id: string; user_short: string; amount: number; net_amount: number; fee: number;
  currency: string; chain: string; destination: string | null; db_status: string | null;
  is_terminal: boolean; created_at: string; verdict: "PASS" | "HOLD" | "BLOCK";
  payout_enabled: boolean; effective_action: string; gates: Gate[];
}
interface Overview {
  generated_at: string; contract: string; payout_enabled: boolean; review_threshold: number;
  cooling_days: number; counts: { total: number; block: number; hold: number; pass: number }; rows: Row[];
}

const dt = (s: string | null) => (s ? String(s).slice(0, 16).replace("T", " ") : "—");
const GATE_ICON: Record<string, any> = {
  provenance: MapPin, amount: Coins, balance: Wallet, wagering: Scale,
  kyc: Fingerprint, risk_aml: ShieldAlert, cooling_period: Clock,
};
const RESULT_STYLE: Record<GateResult, { fg: string; bg: string; ring: string; Icon: any }> = {
  pass:  { fg: "#15803d", bg: "rgba(22,163,74,0.10)",  ring: "rgba(22,163,74,0.35)",  Icon: CheckCircle2 },
  hold:  { fg: "#b45309", bg: "rgba(245,158,11,0.12)", ring: "rgba(245,158,11,0.4)",  Icon: AlertTriangle },
  block: { fg: "#be123c", bg: "rgba(244,63,94,0.10)",  ring: "rgba(244,63,94,0.35)",  Icon: XCircle },
};
const VERDICT_STYLE: Record<Row["verdict"], { fg: string; bg: string; Icon: any }> = {
  PASS:  { fg: "#15803d", bg: "rgba(22,163,74,0.12)",  Icon: ShieldCheck },
  HOLD:  { fg: "#b45309", bg: "rgba(245,158,11,0.14)", Icon: ShieldAlert },
  BLOCK: { fg: "#be123c", bg: "rgba(244,63,94,0.12)",  Icon: ShieldX },
};

function GateChip({ g }: { g: Gate }) {
  const st = RESULT_STYLE[g.result];
  const GI = GATE_ICON[g.key] ?? Scale;
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: st.bg, border: `1px solid ${st.ring}` }}>
      <GI className="h-3.5 w-3.5 flex-shrink-0" style={{ color: st.fg }} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-slate-700 leading-tight">{g.label}</div>
        <div className="text-[10px] text-slate-500 truncate" title={g.detail}>{g.detail}</div>
      </div>
      <st.Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: st.fg }} />
    </div>
  );
}

export default function AdminWithdrawalGate() {
  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_withdrawal_gate_eval", { p_limit: 50 });
    if (error) toast.error(error.message);
    else setOv(data as Overview);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const c = ov?.counts;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.wg-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}
        .wg-mono{font-variant-numeric:tabular-nums;letter-spacing:-.01em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Finance · Withdrawal Gate"
          title="WITHDRAWAL GATE · L4"
          tone="cyan"
          icon={<ShieldCheck className="h-5 w-5" />}
          badges={[
            { label: ov?.payout_enabled ? "PAYOUT ENABLED" : "PAYOUT OFF", tone: ov?.payout_enabled ? "emerald" : "rose", dot: true },
            { label: `${c?.block ?? 0} BLOCK`, tone: (c?.block ?? 0) > 0 ? "rose" : "emerald" },
            { label: `${c?.hold ?? 0} HOLD`, tone: (c?.hold ?? 0) > 0 ? "amber" : "emerald" },
            { label: `${c?.pass ?? 0} PASS`, tone: "cyan" },
          ]}
          subtitle={<>Evaluates the <b>L4 withdrawal gate</b> on each request from real signals and returns a verdict with the exact reason on every gate. It <b>classifies only</b> — approves nothing, sends nothing. A full <b>PASS still does not pay out</b>: real payout stays OFF until <code>real_money_enabled</code> and <code>auto_payout_enabled</code> are both on.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !ov ? (
          <div className="p-10 text-center text-slate-400 text-xs">No data</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <V8StatCard icon={<ShieldX className="h-4 w-4" />} label="Block" value={c?.block ?? 0} sub="hard gate fails" tone={(c?.block ?? 0) > 0 ? "rose" : "emerald"} delay={0} />
              <V8StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Hold" value={c?.hold ?? 0} sub="manual review" tone={(c?.hold ?? 0) > 0 ? "amber" : "emerald"} delay={80} />
              <V8StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Pass" value={c?.pass ?? 0} sub="gates clear" tone="cyan" delay={160} />
              <V8StatCard icon={<Scale className="h-4 w-4" />} label="Review threshold" value={ov.review_threshold} sub={`cooling ${ov.cooling_days}d`} tone="emerald" prefix="$" delay={240} />
            </div>

            {/* Payout-off banner */}
            <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-start gap-2"
                 style={{ background: ov.payout_enabled ? "rgba(22,163,74,0.06)" : "rgba(37,99,235,0.06)", border: `1px solid ${ov.payout_enabled ? "rgba(22,163,74,0.24)" : "rgba(37,99,235,0.24)"}`, color: ov.payout_enabled ? "#15803d" : "#1e40af" }}>
              <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{ov.contract}</span>
            </div>

            {ov.rows.length === 0 ? (
              <div className="wg-card p-10 text-center text-slate-400 text-xs">No withdrawals to evaluate.</div>
            ) : (
              <div className="space-y-3">
                {ov.rows.map((r) => {
                  const vs = VERDICT_STYLE[r.verdict];
                  return (
                    <div key={`${r.rail}-${r.id}`} className="wg-card p-4">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-black px-2.5 py-1 rounded-lg" style={{ background: vs.bg, color: vs.fg }}>
                          <vs.Icon className="h-4 w-4" /> {r.verdict}
                        </span>
                        <span className="wg-mono font-black text-slate-800 text-[15px]">${fmt(r.amount)}</span>
                        <span className="text-[11px] text-slate-400">{r.currency} · {r.rail === "crypto_withdrawals" ? "crypto" : "request"} · {r.chain}</span>
                        <span className="wg-mono text-[11px] text-slate-400">user {r.user_short}</span>
                        <span className="ml-auto text-[11px] text-slate-400">db: <b className="text-slate-600">{r.db_status ?? "—"}</b> · {dt(r.created_at)}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {r.gates.map((g) => <GateChip key={g.key} g={g} />)}
                      </div>
                      <div className="mt-2.5 text-[11px] flex items-center gap-1.5" style={{ color: r.verdict === "BLOCK" ? "#be123c" : r.verdict === "HOLD" ? "#b45309" : "#1e40af" }}>
                        <Lock className="h-3 w-3" /> Effective action: <b>{r.effective_action}</b>
                        {!r.payout_enabled && r.verdict === "PASS" && <span className="text-slate-400">— gates clear but no money moves (payout disabled)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10.5px] text-slate-400">Generated {new Date(ov.generated_at).toLocaleString()} · evaluation is read-only and advisory; it never approves or sends a payout.</p>
          </>
        )}
      </div>
    </div>
  );
}
