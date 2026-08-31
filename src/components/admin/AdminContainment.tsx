import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Power, RefreshCw, Lock, Unlock, Wrench, Timer } from "lucide-react";

type Breaker = { scope: string; state: string; reason: string | null; tripped_at: string | null; auto_reset_at: string | null };
type Anomaly = { id: string; rule: string; severity: string; scope: string | null; evidence: any; action_taken: string | null; created_at: string };
type QWallet = { user_id: string; balance: number; quarantine_reason: string | null; quarantined_at: string };
type Hold = { id: string; user_id: string; amount: number; hold_type: string; status: string; release_after: string | null; attempts: number; last_error: string | null; created_at: string };

async function callContainment(op: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-containment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "x-admin-pin-session": sessionStorage.getItem("dtx_admin_auth") ?? "",
    },
    body: JSON.stringify({ op, ...body }),
  });
  return res.json();
}

export default function AdminContainment() {
  const [breakers, setBreakers] = useState<Breaker[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [quarantined, setQuarantined] = useState<QWallet[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [b, a, q, h] = await Promise.all([
      supabase.from("engine_circuit_breakers").select("*").order("scope"),
      supabase.from("anomaly_events").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("casino_wallets").select("user_id,balance,quarantine_reason,quarantined_at").eq("quarantine", true).order("quarantined_at", { ascending: false }).limit(50),
      supabase.from("payout_holds").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    ]);
    setBreakers((b.data ?? []) as Breaker[]);
    setAnomalies((a.data ?? []) as Anomaly[]);
    setQuarantined((q.data ?? []) as QWallet[]);
    setHolds((h.data ?? []) as Hold[]);
  };

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, []);

  const run = async (op: string, body: Record<string, unknown> = {}) => {
    setBusy(true); setMsg(null);
    const r = await callContainment(op, body);
    setMsg(r.ok ? `${op}: ok` : `${op} failed: ${r.error}`);
    setBusy(false);
    load();
  };

  const sevColor = (s: string) =>
    s === "critical" ? "bg-rose-500/10 text-rose-200 ring-rose-400/40" :
    s === "warn" ? "bg-amber-500/10 text-amber-200 ring-amber-400/30" :
    "bg-white/[0.04] text-white/60 ring-white/10";

  const stateColor = (s: string) =>
    s === "open" ? "bg-rose-500/10 text-rose-200 ring-rose-400/40" :
    s === "half_open" ? "bg-amber-500/10 text-amber-200 ring-amber-400/30" :
    "bg-emerald-500/10 text-emerald-200 ring-emerald-400/30";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-rose-500/15 ring-1 ring-rose-400/30 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-rose-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Containment & Self-Healing</h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Circuit breakers · quarantine · auto-recovery</p>
          </div>
        </div>
        <button onClick={load} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </header>

      {msg && <div className="text-xs text-emerald-300 bg-emerald-500/5 ring-1 ring-emerald-400/20 px-3 py-2 rounded-lg">{msg}</div>}

      <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
        <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Power className="h-3.5 w-3.5 text-rose-300" /> Circuit Breakers</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {breakers.map((b) => (
            <div key={b.scope} className={`rounded-lg p-3 ring-1 ${stateColor(b.state)}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase">{b.scope}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest">{b.state}</span>
              </div>
              {b.reason && <p className="text-[10px] mt-1 opacity-80 truncate" title={b.reason}>{b.reason}</p>}
              {b.auto_reset_at && <p className="text-[9px] mt-1 opacity-60 flex items-center gap-1"><Timer className="h-2.5 w-2.5" /> resets {new Date(b.auto_reset_at).toLocaleTimeString()}</p>}
              <div className="flex gap-1 mt-2">
                {b.state !== "closed" && (
                  <button onClick={() => run("reset_breaker", { scope: b.scope, reason: "manual reset" })} disabled={busy}
                    className="flex-1 text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 disabled:opacity-40">
                    Reset
                  </button>
                )}
                {b.state === "closed" && (
                  <button onClick={() => run("trip_breaker", { scope: b.scope, reason: "manual trip", auto_reset_minutes: 30 })} disabled={busy}
                    className="flex-1 text-[10px] px-2 py-1 rounded bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30 hover:bg-rose-500/25 disabled:opacity-40">
                    Trip 30m
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2"><Wrench className="h-3.5 w-3.5 text-amber-300" /> Safe Recovery</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <input value={userId} onChange={(e) => setUserId(e.target.value.trim())} placeholder="user_id (uuid)"
              className="w-full px-3 py-2 rounded-lg text-[11px] font-mono bg-black/40 text-white ring-1 ring-white/10 focus:outline-none focus:ring-amber-400/40" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (audit log)"
              className="w-full px-3 py-2 rounded-lg text-[11px] bg-black/40 text-white ring-1 ring-white/10 focus:outline-none focus:ring-amber-400/40" />
            <label className="text-[10px] text-white/50 flex items-center gap-1.5">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> force (delta over safe limit)
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button disabled={busy || !userId} onClick={() => run("quarantine_wallet", { user_id: userId, reason })}
                className="text-[10px] px-2.5 py-1.5 rounded bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30 hover:bg-rose-500/25 disabled:opacity-40 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Quarantine
              </button>
              <button disabled={busy || !userId} onClick={() => run("release_quarantine", { user_id: userId, reason })}
                className="text-[10px] px-2.5 py-1.5 rounded bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 disabled:opacity-40 flex items-center gap-1">
                <Unlock className="h-3 w-3" /> Release
              </button>
              <button disabled={busy || !userId} onClick={() => run("safe_recompute", { user_id: userId, reason, force })}
                className="text-[10px] px-2.5 py-1.5 rounded bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/25 disabled:opacity-40 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Safe Recompute
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <button disabled={busy} onClick={() => run("release_due_holds")}
              className="w-full text-[11px] px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 disabled:opacity-40">
              Release due payout holds
            </button>
            <button disabled={busy} onClick={() => run("replay_attestation", { date: new Date().toISOString().slice(0, 10) })}
              className="w-full text-[11px] px-3 py-2 rounded-lg bg-white/[0.04] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08] disabled:opacity-40">
              Verify today's attestation
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
        <h3 className="text-xs font-bold text-white mb-3">Quarantined Wallets ({quarantined.length})</h3>
        <div className="max-h-64 overflow-y-auto">
          {quarantined.length === 0 && <p className="text-[11px] text-white/30">None.</p>}
          {quarantined.map((q) => (
            <div key={q.user_id} className="text-[11px] flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04]">
              <div className="min-w-0">
                <div className="font-mono text-white/80 truncate">{q.user_id}</div>
                <div className="text-white/40 truncate">{q.quarantine_reason}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-white/70">${Number(q.balance).toFixed(2)}</div>
                <button onClick={() => run("release_quarantine", { user_id: q.user_id, reason: "manual release" })}
                  className="text-[10px] text-emerald-300 hover:text-emerald-100">release</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
        <h3 className="text-xs font-bold text-white mb-3">Pending Payout Holds ({holds.length})</h3>
        <div className="max-h-64 overflow-y-auto text-[11px]">
          {holds.length === 0 && <p className="text-white/30">None.</p>}
          {holds.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.04]">
              <div className="min-w-0">
                <div className="font-mono text-white/70 truncate">{h.user_id}</div>
                <div className="text-white/40">{h.hold_type} · ${Number(h.amount).toFixed(2)} · attempts {h.attempts}</div>
                {h.last_error && <div className="text-rose-300 truncate" title={h.last_error}>{h.last_error}</div>}
              </div>
              <div className="text-[10px] text-white/40 shrink-0">
                {h.release_after ? `due ${new Date(h.release_after).toLocaleString()}` : "manual"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
        <h3 className="text-xs font-bold text-white mb-3">Recent Anomalies</h3>
        <div className="max-h-96 overflow-y-auto">
          {anomalies.length === 0 && <p className="text-[11px] text-white/30">No anomalies recorded.</p>}
          {anomalies.map((a) => (
            <div key={a.id} className="py-1.5 border-b border-white/[0.04] text-[11px] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ring-1 uppercase ${sevColor(a.severity)}`}>{a.severity}</span>
                  <span className="text-white/80 font-semibold">{a.rule}</span>
                  {a.scope && <span className="text-white/40 font-mono">[{a.scope}]</span>}
                </div>
                {a.action_taken && <div className="text-white/50">→ {a.action_taken}</div>}
              </div>
              <div className="text-[10px] text-white/40 shrink-0 font-mono">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
