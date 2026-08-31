// Real-Money Activation — the ONLY control that flips real_money_enabled.
//
// Flow: Request Activation → Review (attest each go-live gate) → Manual Approve
// → Confirm (type the exact phrase) → real_money_enabled = ON.
//
// SAFETY: default is OFF. Turning ON calls admin_set_real_money_enabled(true,
// 'ENABLE REAL MONEY'), which additionally enforces admin role + the phrase +
// a reserve-invariant safety net server-side, and audit-logs every flip. The
// gate checklist here is an operator ATTESTATION, not an automated verifier —
// the external gates (license · PSP · treasury) are the operator's responsibility
// per the Supervised Go-Live Runbook. A kill switch (→ OFF) is always available.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { num as fmt } from "@/lib/format";
import { Lock, ShieldCheck, AlertTriangle, Power, Loader2, ChevronRight, RotateCcw } from "lucide-react";

const CONFIRM_PHRASE = "ENABLE REAL MONEY";

const GATES: { id: string; label: string }[] = [
  { id: "license",   label: "Gaming license approved for the target jurisdiction" },
  { id: "psp",       label: "Written PSP approval for real-money gaming activity" },
  { id: "treasury",  label: "Treasury funded — reserve invariant GREEN (live on-chain verified)" },
  { id: "security",  label: "Security gates applied: RLS, secrets, key-rotation readiness" },
  { id: "gate",      label: "Master gate wired into all money paths + contract test green (this deploy)" },
  { id: "policy",    label: "Auto-approve / KYC / withdrawal policy set to the approved posture" },
  { id: "recon",     label: "Reconciliation baseline: 0 unexplained critical exceptions" },
  { id: "test",      label: "Supervised bounded test passed and reconciled (PSP ↔ ledger ↔ custody)" },
];

type Step = "locked" | "request" | "review" | "confirm";

export default function AdminRealMoneyActivation({
  rmOn, liabilities, onChanged,
}: { rmOn: boolean; liabilities: number; onChanged: () => void }) {
  const [step, setStep] = useState<Step>("locked");
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  const allTicked = GATES.every((g) => ticks[g.id]);
  const phraseOk = phrase === CONFIRM_PHRASE;

  const reset = () => { setStep("locked"); setTicks({}); setPhrase(""); };

  const setFlag = async (on: boolean) => {
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_set_real_money_enabled", {
        p_on: on, p_confirm: on ? CONFIRM_PHRASE : null,
      });
      if (error) { toast.error(error.message); return; }
      const r = data as { ok?: boolean; real_money_enabled?: boolean };
      if (r?.ok) {
        toast.success(on ? "Real money ENABLED" : "Real money disabled (kill switch)");
        reset();
        onChanged();
      } else {
        toast.message("No change");
      }
    } finally { setBusy(false); }
  };

  // ── ON state: kill switch only ────────────────────────────────────────────
  if (rmOn) {
    return (
      <div className="rounded-2xl p-4" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.4)" }}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4" style={{ color: "#15803d" }} />
          <h3 className="text-sm font-black" style={{ color: "#15803d" }}>Real money is ENABLED</h3>
          <span className="ml-auto text-[10px] text-slate-400">audit-logged</span>
        </div>
        <p className="text-[12px] text-slate-600 mb-3">
          The master gate is ON. If anything looks wrong — invariant breach, reconciliation gap,
          anomaly — hit the kill switch immediately; it blocks every money path at the next check.
        </p>
        <button onClick={() => setFlag(false)} disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
          style={{ background: "#be123c" }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          Kill switch — disable real money
        </button>
      </div>
    );
  }

  // ── OFF state: gated activation flow ──────────────────────────────────────
  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid rgba(190,18,60,0.35)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Lock className="h-4 w-4" style={{ color: "#be123c" }} />
        <h3 className="text-sm font-black text-slate-800">Real money is OFF</h3>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(190,18,60,0.1)", color: "#be123c", border: "1px solid rgba(190,18,60,0.3)" }}>
          real_money_enabled = false
        </span>
      </div>

      {step === "locked" && (
        <>
          <p className="text-[12px] text-slate-600 mb-3">
            Activation is a governed, dual-control action. It does not bypass the external gates —
            it records your attestation that every gate is met, then flips the master switch under a
            typed confirmation. The server also enforces a reserve-invariant safety net.
          </p>
          <button onClick={() => setStep("request")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ background: "#0f172a" }}>
            Request activation <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {step === "request" && (
        <>
          <p className="text-[12px] text-slate-600 mb-2">
            <b>Step 1 — Review.</b> Attest each go-live gate. These are your confirmations, not automated
            checks — do not tick a gate that is not truly met.
          </p>
          <div className="space-y-1.5 mb-3">
            {GATES.map((g) => (
              <label key={g.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="checkbox" className="mt-0.5 accent-rose-600 h-4 w-4"
                  checked={!!ticks[g.id]}
                  onChange={(e) => setTicks((t) => ({ ...t, [g.id]: e.target.checked }))} />
                <span className="text-[12.5px] text-slate-700">{g.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep("review")} disabled={!allTicked}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#0f172a" }}>
              Proceed to approve <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={reset} className="text-[12px] text-slate-400 inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Cancel</button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)" }}>
            <div className="flex items-center gap-2 text-[12.5px] font-bold" style={{ color: "#b45309" }}>
              <AlertTriangle className="h-4 w-4" /> Manual approval
            </div>
            <p className="text-[12px] text-slate-600 mt-1">
              All {GATES.length} gates attested. Current user liabilities: <b className="rmo-mono">${fmt(liabilities)}</b>.
              The server will refuse enablement unless liquid custody ≥ liabilities + C74 swap pool.
              Proceeding takes you to the typed confirmation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep("confirm")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white"
              style={{ background: "#0f172a" }}>
              Manual approve <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={reset} className="text-[12px] text-slate-400 inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Cancel</button>
          </div>
        </>
      )}

      {step === "confirm" && (
        <>
          <p className="text-[12px] text-slate-600 mb-2">
            <b>Final confirmation.</b> Type <code className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-bold">{CONFIRM_PHRASE}</code> to
            enable real money. This is audit-logged and takes effect immediately.
          </p>
          <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM_PHRASE}
            className="w-full mb-3 px-3 py-2.5 rounded-xl text-[13px] font-mono outline-none"
            style={{ border: "1px solid rgba(15,23,42,0.15)" }} />
          <div className="flex items-center gap-2">
            <button onClick={() => setFlag(true)} disabled={!phraseOk || busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#be123c" }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Confirm — enable real money
            </button>
            <button onClick={reset} className="text-[12px] text-slate-400 inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
