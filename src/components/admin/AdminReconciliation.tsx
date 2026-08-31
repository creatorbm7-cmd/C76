// Reconciliation — READ-ONLY three-way tie-out console.
//
// Ties out the same money across three independent records:
//   PSP settlement (fiat_topups) ↔ internal ledger (casino_transactions deposits)
//   ↔ bank/on-chain movement (crypto/blockchain/incoming deposits + manual requests).
//
// This tab NEVER moves money and never books/corrects a credit. It only classifies:
// per-leg totals, whether the three-way totals agree, and an exception worklist
// (duplicate/idempotency, PSP settled-but-uncredited, orphan ledger deposit).
// Remediation of any exception is a separate, dual-control, human action — done in
// the relevant Deposits/Withdrawals console, not here. Empty legs report zero; a
// missing gateway feed is shown as "not ingested yet", never a fabricated line.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Scale, GitCompareArrows, Landmark, Wallet, Coins,
  Link, ShieldAlert, CheckCircle2, AlertTriangle, Lock, History, Save,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Leg { source: string; note?: string | null; }
interface PspLeg extends Leg { settled_count: number; settled_total: number; pending_total: number; rows_total: number; }
interface LedgerLeg extends Leg { credit_count: number; credit_total: number; }
interface OnchainLeg extends Leg { credited_total: number; credited_count: number; }
interface ManualLeg extends Leg { approved_total: number; approved_count: number; failed_count: number; }
interface ThreeWay {
  psp_settled_total: number; onchain_credited_total: number; manual_approved_total: number;
  inbound_sources_total: number; ledger_deposit_total: number; difference: number; agree: boolean;
}
interface Exceptions {
  duplicate_ledger_idempotency: Array<{ idempotency_key: string; count: number }>;
  duplicate_psp_payment_id: Array<{ provider_payment_id: string; count: number }>;
  duplicate_onchain_txhash: Array<{ tx_hash: string; count: number }>;
  psp_settled_uncredited: Array<{ id: string; amount: number; provider_payment_id: string | null; status: string | null }>;
  orphan_ledger_deposit: Array<{ tx_id: string; amount: number; reference_id: string | null; created_at: string }>;
}
interface Overview {
  generated_at: string; contract: string;
  legs: { psp: PspLeg; ledger: LedgerLeg; onchain: OnchainLeg; manual: ManualLeg };
  three_way: ThreeWay; exceptions: Exceptions; exception_count: number; reconciled_clean: boolean;
}
interface HistoryRun {
  id: string; run_at: string; status: string; difference: number; agree: boolean;
  exception_count: number; inbound_sources_total: number; ledger_deposit_total: number;
  recorded_by_short: string | null; exceptions: Array<{ class: string; count: number }>;
}

const short = (s: string | null, head = 8, tail = 6) =>
  !s ? "—" : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
const day = (s: string | null) => (s ? String(s).slice(0, 10) : "—");

// One exception class → a small worklist card. Empty = a reassuring "none" state.
function ExceptionCard({
  title, hint, rows, render,
}: { title: string; hint: string; rows: any[]; render: (r: any, i: number) => React.ReactNode }) {
  const n = rows?.length ?? 0;
  return (
    <div className="rc-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {n > 0 ? <AlertTriangle className="h-4 w-4" style={{ color: "#be123c" }} />
               : <CheckCircle2 className="h-4 w-4" style={{ color: "#15803d" }} />}
        <h3 className="text-[13px] font-black text-slate-800">{title}</h3>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={n > 0 ? { background: "rgba(244,63,94,0.12)", color: "#be123c", border: "1px solid rgba(244,63,94,0.4)" }
                       : { background: "rgba(22,163,74,0.12)", color: "#15803d", border: "1px solid rgba(22,163,74,0.4)" }}>
          {n > 0 ? `${n} TO REVIEW` : "CLEAN"}
        </span>
      </div>
      <p className="text-[10.5px] text-slate-400 mb-2">{hint}</p>
      {n === 0 ? (
        <div className="text-[12px] text-slate-400 py-2">No exceptions in this class.</div>
      ) : (
        <div className="space-y-1">{rows.map(render)}</div>
      )}
    </div>
  );
}

export default function AdminReconciliation() {
  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<Overview | null>(null);
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [recording, setRecording] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_reconciliation_overview");
    if (error) toast.error(error.message);
    else setOv(data as Overview);
    const { data: h } = await (supabase.rpc as any)("admin_reconciliation_history", { p_limit: 50 });
    setHistory((h as HistoryRun[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Admin-triggered: appends ONE immutable snapshot (totals + exception classes/counts).
  // Writes only the reconciliation audit tables — no money/ledger/wallet touch.
  const record = async () => {
    setRecording(true);
    const { data, error } = await (supabase.rpc as any)("admin_reconciliation_record_run");
    setRecording(false);
    if (error) { toast.error(error.message); return; }
    const st = (data as any)?.status;
    toast.success(`Run recorded — ${st === "clean" ? "reconciled clean" : `${(data as any)?.exception_count} exception(s)`} (immutable audit entry)`);
    load();
  };

  const tw = ov?.three_way;
  const ex = ov?.exceptions;
  const clean = ov?.reconciled_clean ?? false;
  const excCount = ov?.exception_count ?? 0;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.rc-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}
        .rc-mono{font-variant-numeric:tabular-nums;letter-spacing:-.01em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Finance · Reconciliation"
          title="RECONCILIATION"
          tone="cyan"
          icon={<GitCompareArrows className="h-5 w-5" />}
          badges={[
            { label: clean ? "RECONCILED CLEAN" : `${excCount} EXCEPTION${excCount === 1 ? "" : "S"}`, tone: clean ? "emerald" : "rose", dot: true },
            { label: tw?.agree ? "TOTALS AGREE" : `Δ $${fmt(tw?.difference ?? 0)}`, tone: tw?.agree ? "cyan" : "amber" },
          ]}
          subtitle={<>Ties out the same money across <b>three independent records</b> — PSP settlement, internal ledger, and bank/on-chain movement. This console <b>reads only</b>: it classifies matches and exceptions but never books, corrects, or moves a credit. Every exception is worked by a human under dual control in the relevant Deposits console.</>}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={record} disabled={recording || loading} title="Append an immutable reconciliation snapshot to the audit trail"
                className="av8-action-btn px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                {recording ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Record run
              </button>
              <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </V8HeroBtn>
            </div>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !ov || !tw || !ex ? (
          <div className="p-10 text-center text-slate-400 text-xs">No data</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <V8StatCard icon={<Landmark className="h-4 w-4" />} label="PSP settled" value={ov.legs.psp.settled_total} sub={ov.legs.psp.rows_total === 0 ? "none ingested yet" : `${ov.legs.psp.settled_count} lines`} tone="cyan" prefix="$" delay={0} />
              <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Ledger deposits" value={ov.legs.ledger.credit_total} sub={`${ov.legs.ledger.credit_count} credits`} tone="cyan" prefix="$" delay={80} />
              <V8StatCard icon={<Coins className="h-4 w-4" />} label="On-chain / manual" value={ov.legs.onchain.credited_total + ov.legs.manual.approved_total} sub={`${ov.legs.onchain.credited_count + ov.legs.manual.approved_count} movements`} tone="emerald" prefix="$" delay={160} />
              <V8StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Exceptions" value={excCount} sub={clean ? "reconciled clean" : "need review"} tone={excCount ? "rose" : "emerald"} delay={240} />
            </div>

            {/* Three-way tie-out */}
            <div className="rc-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                <h3 className="text-sm font-black text-slate-800">Three-way tie-out</h3>
                <span className="ml-auto text-[10px] text-slate-400">every credited inbound source should equal the ledger deposit credits</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "PSP settlement (fiat_topups)", value: tw.psp_settled_total, sign: "+" as const },
                  { label: "On-chain movement (crypto / blockchain / incoming)", value: tw.onchain_credited_total, sign: "+" as const },
                  { label: "Manual deposits approved (deposit_requests)", value: tw.manual_approved_total, sign: "+" as const },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-sm py-1.5 border-b border-slate-50">
                    <span className="rc-mono font-bold w-5 text-center" style={{ color: "#15803d" }}>{r.sign}</span>
                    <div className="flex-1 text-slate-700 font-semibold text-[13px]">{r.label}</div>
                    <span className="rc-mono font-bold text-slate-800">${fmt(r.value)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 py-1.5 border-b border-slate-100">
                  <span className="w-5" />
                  <div className="flex-1 text-slate-900 font-black text-[13px]">Inbound sources total</div>
                  <span className="rc-mono font-black text-slate-900">${fmt(tw.inbound_sources_total)}</span>
                </div>
                <div className="flex items-center gap-2 py-1.5">
                  <span className="rc-mono font-bold w-5 text-center" style={{ color: "#1d4ed8" }}>=?</span>
                  <div className="flex-1 text-slate-700 font-semibold text-[13px]">Internal ledger deposit credits</div>
                  <span className="rc-mono font-bold text-slate-800">${fmt(tw.ledger_deposit_total)}</span>
                </div>
                <div className="flex items-center gap-2 pt-2.5 mt-1 border-t-2 border-slate-100">
                  <span className="w-5" />
                  <div className="flex-1">
                    <div className="text-slate-900 font-black text-[13px]">Difference (sources − ledger)</div>
                    <div className="text-[10.5px] text-slate-400">{tw.agree ? "within 1¢ tolerance — reconciled" : "does not tie out — investigate before treating credits as final"}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-black px-2.5 py-1 rounded-lg"
                    style={tw.agree ? { background: "rgba(22,163,74,0.12)", color: "#15803d" } : { background: "rgba(245,158,11,0.14)", color: "#b45309" }}>
                    {tw.agree ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    ${fmt(tw.difference)}
                  </span>
                </div>
              </div>
              {ov.legs.psp.rows_total === 0 && (
                <p className="text-[10.5px] text-slate-400 mt-3 flex items-center gap-1.5">
                  <Link className="h-3 w-3" /> PSP settlement leg reports <b>zero</b> — {ov.legs.psp.note ?? "no gateway settlements ingested yet"}. It fills automatically once a licensed gateway posts settlements (real-money launch gate).
                </p>
              )}
            </div>

            {/* Exception worklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ExceptionCard title="Duplicate ledger idempotency key" hint="R5 · same idempotency key booked more than once — a possible double credit."
                rows={ex.duplicate_ledger_idempotency}
                render={(r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] py-1 border-b border-slate-50 last:border-0">
                    <span className="rc-mono text-slate-600 flex-1 truncate" title={r.idempotency_key}>{short(r.idempotency_key)}</span>
                    <span className="rc-mono font-bold text-rose-600">×{r.count}</span>
                  </div>
                )} />
              <ExceptionCard title="Duplicate PSP payment id" hint="R5 · same provider_payment_id on multiple settlement lines."
                rows={ex.duplicate_psp_payment_id}
                render={(r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] py-1 border-b border-slate-50 last:border-0">
                    <span className="rc-mono text-slate-600 flex-1 truncate" title={r.provider_payment_id}>{short(r.provider_payment_id)}</span>
                    <span className="rc-mono font-bold text-rose-600">×{r.count}</span>
                  </div>
                )} />
              <ExceptionCard title="Duplicate on-chain tx hash" hint="R5 · same tx_hash seen on more than one movement row."
                rows={ex.duplicate_onchain_txhash}
                render={(r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] py-1 border-b border-slate-50 last:border-0">
                    <span className="rc-mono text-slate-600 flex-1 truncate" title={r.tx_hash}>{short(r.tx_hash)}</span>
                    <span className="rc-mono font-bold text-rose-600">×{r.count}</span>
                  </div>
                )} />
              <ExceptionCard title="PSP settled but not credited" hint="R4 · gateway settled the line but no wallet credit is booked — money arrived, not booked."
                rows={ex.psp_settled_uncredited}
                render={(r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] py-1 border-b border-slate-50 last:border-0">
                    <span className="rc-mono text-slate-600 flex-1 truncate" title={r.provider_payment_id ?? ""}>{short(r.provider_payment_id)}</span>
                    <span className="text-slate-400">{r.status ?? "—"}</span>
                    <span className="rc-mono font-bold text-slate-800">${fmt(r.amount)}</span>
                  </div>
                )} />
              <div className="md:col-span-2">
                <ExceptionCard title="Orphan ledger deposit" hint="R3 · a deposit credit whose reference ties to no known inbound source — quarantine candidate, must not be treated as real until traced."
                  rows={ex.orphan_ledger_deposit}
                  render={(r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] py-1 border-b border-slate-50 last:border-0">
                      <span className="rc-mono text-slate-500">{short(r.tx_id)}</span>
                      <span className="text-slate-400">ref {r.reference_id ? short(r.reference_id) : "∅"}</span>
                      <span className="text-slate-300 ml-auto">{day(r.created_at)}</span>
                      <span className="rc-mono font-bold text-slate-800">${fmt(r.amount)}</span>
                    </div>
                  )} />
              </div>
            </div>

            {/* Audit history (append-only) */}
            <div className="rc-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 pb-2">
                <History className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                <h3 className="text-sm font-black text-slate-800">Reconciliation history</h3>
                <span className="ml-auto text-[10px] text-slate-400">append-only · immutable · {history.length} run{history.length === 1 ? "" : "s"}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold">When</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Status</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Δ</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Exceptions</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Classes</th>
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold">By</th>
                  </tr></thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">No runs recorded yet — click <b>Record run</b> to append the first immutable snapshot.</td></tr>
                    ) : history.map((h) => (
                      <tr key={h.id} className="av8-row border-b border-slate-50">
                        <td className="px-4 py-2.5 text-[12px] text-slate-500">{new Date(h.run_at).toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={h.status === "clean" ? { background: "rgba(22,163,74,0.12)", color: "#15803d", border: "1px solid rgba(22,163,74,0.4)" }
                                                         : { background: "rgba(245,158,11,0.12)", color: "#b45309", border: "1px solid rgba(245,158,11,0.4)" }}>
                            {h.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right rc-mono font-bold" style={{ color: h.agree ? "#15803d" : "#b45309" }}>${fmt(h.difference)}</td>
                        <td className="px-3 py-2.5 text-right rc-mono font-bold text-slate-700">{h.exception_count}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">
                          {h.exceptions.length === 0 ? <span className="text-slate-300">—</span>
                            : h.exceptions.map((e) => `${e.class.replace(/_/g, " ")} ×${e.count}`).join(", ")}
                        </td>
                        <td className="px-4 py-2.5 rc-mono text-[11px] text-slate-400">{h.recorded_by_short ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Read-only contract */}
            <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-start gap-2"
                 style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.24)", color: "#1e40af" }}>
              <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{ov.contract} <span className="text-slate-400">· generated {new Date(ov.generated_at).toLocaleString()}</span></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
