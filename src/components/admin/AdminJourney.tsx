// Live Journey Dashboard — every user's progress through the real-money funnel
// (Registered → KYC → Deposited → Played → Withdrew), in real time, with an
// inline KYC-approve action so an admin can act in parallel as users move.
//
// Pure frontend against RLS-protected tables (admins have read on profiles /
// casino_wallets / kyc_submissions / withdrawals, and FOR ALL on kyc). No
// money-logic here — approving KYC only flips the verification gate.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Check, UserPlus, ShieldCheck, Banknote, Gamepad2, ArrowUpRight, Workflow } from "lucide-react";

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  kycStatus: string;          // none | pending | approved | rejected
  kycId: number | null;       // latest submission id (for inline approve)
  deposited: boolean;
  played: boolean;
  withdrew: boolean;
  withdrawPending: boolean;
}

const STEPS = [
  { key: "reg",      label: "Registered", icon: UserPlus },
  { key: "kyc",      label: "KYC",        icon: ShieldCheck },
  { key: "deposit",  label: "Deposited",  icon: Banknote },
  { key: "play",     label: "Played",     icon: Gamepad2 },
  { key: "withdraw", label: "Withdrew",   icon: ArrowUpRight },
] as const;

const fmtAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

type Filter = "all" | "kyc_pending" | "active" | "withdraw_pending";

export default function AdminJourney() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [profRes, walletRes, kycRes, wrRes, cwRes] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("casino_wallets").select("user_id, total_deposited, total_withdrawn, total_wagered"),
      supabase.from("kyc_submissions").select("id, user_id, status, submitted_at").order("submitted_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("user_id").eq("status", "pending"),
      supabase.from("crypto_withdrawals").select("user_id").eq("status", "pending"),
    ]);

    const wallet = new Map<string, any>();
    (walletRes.data || []).forEach((w: any) => wallet.set(w.user_id, w));
    const kyc = new Map<string, any>();
    (kycRes.data || []).forEach((k: any) => { if (!kyc.has(k.user_id)) kyc.set(k.user_id, k); }); // first = latest
    const pendW = new Set<string>();
    (wrRes.data || []).forEach((r: any) => pendW.add(r.user_id));
    (cwRes.data || []).forEach((r: any) => pendW.add(r.user_id));

    const merged: Row[] = (profRes.data || []).map((p: any) => {
      const w = wallet.get(p.id);
      const k = kyc.get(p.id);
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        kycStatus: k?.status ?? "none",
        kycId: k?.id ?? null,
        deposited: Number(w?.total_deposited || 0) > 0,
        played: Number(w?.total_wagered || 0) > 0,
        withdrew: Number(w?.total_withdrawn || 0) > 0,
        withdrawPending: pendW.has(p.id),
      };
    });
    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const refresh = () => { if (debounce.current) clearTimeout(debounce.current); debounce.current = setTimeout(load, 600); };
    const ch = supabase
      .channel("admin-journey")
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_submissions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "casino_bets" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, refresh)
      .subscribe();
    return () => { if (debounce.current) clearTimeout(debounce.current); supabase.removeChannel(ch); };
  }, [load]);

  const done = (r: Row, key: string): boolean => {
    switch (key) {
      case "reg": return true;
      case "kyc": return r.kycStatus === "approved" || r.kycStatus === "verified";
      case "deposit": return r.deposited;
      case "play": return r.played;
      case "withdraw": return r.withdrew;
      default: return false;
    }
  };

  const funnel = useMemo(() => STEPS.map(s => ({
    ...s, count: rows.filter(r => done(r, s.key)).length,
  })), [rows]);

  const view = useMemo(() => {
    switch (filter) {
      case "kyc_pending": return rows.filter(r => r.kycStatus === "pending");
      case "active": return rows.filter(r => r.deposited || r.played);
      case "withdraw_pending": return rows.filter(r => r.withdrawPending);
      default: return rows;
    }
  }, [rows, filter]);

  const approveKyc = async (r: Row) => {
    if (!r.kycId) return;
    setBusyId(r.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("kyc_submissions").update({
      status: "approved", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(),
    }).eq("id", r.kycId);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("KYC approved — withdrawals unlocked for this user");
    load();
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "kyc_pending", label: "KYC pending" },
    { id: "active", label: "Active" },
    { id: "withdraw_pending", label: "Withdraw pending" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Workflow className="h-5 w-5 text-amber-400" /> Live Journey
          </h2>
          <p className="text-xs text-white/50 mt-1">Every user's funnel stage, updating in real time · {rows.length} users</p>
        </div>
        <button onClick={load} className="text-white/60 hover:text-white border border-white/10 rounded-md p-2">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Funnel summary */}
      <div className="grid grid-cols-5 gap-2">
        {funnel.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="rounded-xl border border-white/[0.06] p-3 text-center" style={{ background: "#ffffff" }}>
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: i === 0 ? "#9ca3af" : "#fbbf24" }} />
              <div className="text-lg font-bold text-white leading-none">{s.count}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/40 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md font-semibold transition ${
              filter === f.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
            }`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-white/30"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : view.length === 0 ? (
        <div className="p-10 text-center text-white/30 text-sm">No users in this view</div>
      ) : (
        <div className="space-y-2">
          {view.map(r => (
            <div key={r.id} className="rounded-xl border border-white/[0.06] p-3" style={{ background: "#ffffff" }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{r.full_name || r.email || "—"}</div>
                  <div className="text-[11px] text-white/40 truncate">{r.email} · {fmtAgo(r.created_at)} ago</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.kycStatus === "pending" && (
                    <button onClick={() => approveKyc(r)} disabled={busyId === r.id}
                      className="h-7 inline-flex items-center gap-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold">
                      {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve KYC
                    </button>
                  )}
                  {r.withdrawPending && (
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-500/15 text-amber-300">Withdraw ⏳</span>
                  )}
                </div>
              </div>

              {/* Funnel track */}
              <div className="flex items-center">
                {STEPS.map((s, i) => {
                  const ok = done(r, s.key);
                  const Icon = s.icon;
                  const pendingKyc = s.key === "kyc" && r.kycStatus === "pending";
                  const rejectedKyc = s.key === "kyc" && r.kycStatus === "rejected";
                  const color = ok ? "#10b981" : pendingKyc ? "#fbbf24" : rejectedKyc ? "#f43f5e" : "rgba(15,23,42,0.12)";
                  return (
                    <div key={s.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center"
                          style={{ background: ok ? "rgba(16,185,129,0.15)" : "rgba(15,23,42,0.03)", border: `1.5px solid ${color}` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <span className="text-[9px]" style={{ color: ok ? "#6ee7b7" : "rgba(15,23,42,0.35)" }}>{s.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-1 -mt-4 rounded"
                          style={{ background: done(r, STEPS[i + 1].key) ? "#10b981" : "rgba(15,23,42,0.08)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
