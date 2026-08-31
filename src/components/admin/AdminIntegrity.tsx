import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, RefreshCw, Link2, FileSignature, Activity } from "lucide-react";

type Attestation = {
  attestation_date: string;
  merkle_root: string;
  user_count: number;
  total_balance: number;
  total_wagered: number | null;
  signed_at: string | null;
  signature: string | null;
};

type Action = {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  target_ref: string | null;
  reason: string | null;
  created_at: string;
};

type SelfTest = {
  status: string;
  duration_ms: number | null;
  error_code: string | null;
  created_at: string;
};

export default function AdminIntegrity() {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [selfTests, setSelfTests] = useState<SelfTest[]>([]);
  const [chainUser, setChainUser] = useState("");
  const [chainResult, setChainResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [att, act, st] = await Promise.all([
      supabase.from("ledger_attestations").select("*").order("attestation_date", { ascending: false }).limit(14),
      supabase.from("admin_financial_actions").select("id,admin_id,action,target_user_id,target_ref,reason,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("dual_path_log").select("status,duration_ms,error_code,created_at").eq("route", "rpc_self_test").order("created_at", { ascending: false }).limit(20),
    ]);
    setAttestations((att.data ?? []) as Attestation[]);
    setActions((act.data ?? []) as Action[]);
    setSelfTests((st.data ?? []) as SelfTest[]);
  };

  useEffect(() => { load(); }, []);

  const runSelfTest = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await (supabase.rpc as any)("rpc_self_test");
    setMsg(error ? `error: ${error.message}` : `self-test ${data?.ok ? "ok" : "failed"} in ${data?.duration_ms}ms`);
    setBusy(false);
    load();
  };

  const verifyChain = async () => {
    if (!chainUser) return;
    setBusy(true); setChainResult(null);
    const { data, error } = await (supabase.rpc as any)("rpc_verify_ledger_chain", { p_user_id: chainUser, p_from_seq: 0 });
    setChainResult(error ? { error: error.message } : data);
    setBusy(false);
  };

  const buildAttestation = async () => {
    setBusy(true); setMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/attest-daily`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "x-admin-pin-session": sessionStorage.getItem("dtx_admin_auth") ?? "",
        },
        body: JSON.stringify({}),
      }
    );
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? `attestation signed: ${j.merkle_root?.slice(0, 12)}…` : `failed: ${j.error ?? res.status}`);
    setBusy(false);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg casino-gold-gradient flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-black" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Financial Integrity</h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Tamper-evident ledger · daily attestations</p>
          </div>
        </div>
        <button onClick={load} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </header>

      {msg && <div className="text-xs text-emerald-300 bg-emerald-500/5 ring-1 ring-emerald-400/20 px-3 py-2 rounded-lg">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2"><FileSignature className="h-3.5 w-3.5 casino-gold-text" /> Daily Attestations</h3>
            <button onClick={buildAttestation} disabled={busy} className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-500/20 disabled:opacity-40">
              Sign today
            </button>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {attestations.length === 0 && <p className="text-[11px] text-white/30">No attestations yet.</p>}
            {attestations.map((a) => (
              <div key={a.attestation_date} className="text-[11px] flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04]">
                <div>
                  <div className="text-white/80 font-mono">{a.attestation_date}</div>
                  <div className="text-white/30 font-mono truncate" title={a.merkle_root}>{a.merkle_root.slice(0, 22)}…</div>
                </div>
                <div className="text-right">
                  <div className="text-white/60">{a.user_count} users</div>
                  <div className={`text-[10px] ${a.signature ? "text-emerald-300" : "text-amber-300"}`}>
                    {a.signature ? "signed" : "unsigned"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl ring-1 ring-white/[0.06] p-4" style={{ background: "#ffffff" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2"><Link2 className="h-3.5 w-3.5 casino-gold-text" /> Chain Verifier</h3>
          </div>
          <div className="flex gap-2">
            <input
              value={chainUser}
              onChange={(e) => setChainUser(e.target.value.trim())}
              placeholder="user_id (uuid)"
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-mono bg-black/40 text-white ring-1 ring-white/10 focus:outline-none focus:ring-amber-400/40"
            />
            <button onClick={verifyChain} disabled={busy || !chainUser} className="text-[11px] px-3 py-2 rounded-lg casino-gold-gradient text-black font-semibold disabled:opacity-40">
              Verify
            </button>
          </div>
          {chainResult && (
            <pre className="mt-3 text-[10px] text-white/70 bg-black/40 p-2 rounded max-h-48 overflow-auto">
{JSON.stringify(chainResult, null, 2)}
            </pre>
          )}
          <p className="text-[10px] text-white/30 mt-2">Recomputes per-user hash chain and reports the first divergence (if any).</p>
        </section>

        <section className="rounded-xl ring-1 ring-white/[0.06] p-4 md:col-span-2" style={{ background: "#ffffff" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2"><Activity className="h-3.5 w-3.5 casino-gold-text" /> Engine Self-Test</h3>
            <button onClick={runSelfTest} disabled={busy} className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/20 disabled:opacity-40">
              Run now
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
            {selfTests.map((s, i) => (
              <div key={i} className={`text-[10px] rounded p-2 ring-1 ${s.status === "ok" ? "bg-emerald-500/5 ring-emerald-400/20 text-emerald-200" : "bg-rose-500/10 ring-rose-400/30 text-rose-200"}`}>
                <div className="font-mono">{new Date(s.created_at).toLocaleTimeString()}</div>
                <div>{s.status} · {s.duration_ms ?? "-"}ms</div>
                {s.error_code && <div className="truncate" title={s.error_code}>{s.error_code}</div>}
              </div>
            ))}
            {selfTests.length === 0 && <p className="text-[11px] text-white/30">No self-test runs yet.</p>}
          </div>
        </section>

        <section className="rounded-xl ring-1 ring-white/[0.06] p-4 md:col-span-2" style={{ background: "#ffffff" }}>
          <h3 className="text-xs font-bold text-white mb-3">Admin Financial Actions</h3>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="text-white/40 uppercase tracking-widest text-[9px]">
                <tr>
                  <th className="text-left py-1">When</th>
                  <th className="text-left py-1">Action</th>
                  <th className="text-left py-1">Target</th>
                  <th className="text-left py-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id} className="border-t border-white/[0.04]">
                    <td className="py-1.5 text-white/60 font-mono">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-1.5 text-amber-200">{a.action}</td>
                    <td className="py-1.5 text-white/70 font-mono truncate max-w-[200px]">{a.target_user_id ?? a.target_ref ?? "-"}</td>
                    <td className="py-1.5 text-white/50">{a.reason ?? "-"}</td>
                  </tr>
                ))}
                {actions.length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-center text-white/30">No actions logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
