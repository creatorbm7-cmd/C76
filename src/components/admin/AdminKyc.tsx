// KYC review queue — approve/reject player identity verifications.
//
// Pure frontend against the RLS-protected kyc_submissions table (admins
// have FOR ALL). Approving flips is_kyc_verified() → true, which unlocks
// real-money deposits for that user (once the platform is in live mode).

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Check, X, ShieldCheck, RefreshCw, ExternalLink, Zap, FileText, Clock } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

type Status = "pending" | "approved" | "rejected" | "verified";

interface Kyc {
  id: number;
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address_text: string | null;
  document_type: string;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  status: string | null;
  review_note: string | null;
  submitted_at: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }) : "—";

export default function AdminKyc() {
  const [items, setItems] = useState<Kyc[]>([]);
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Kyc | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  const loadAuto = useCallback(async () => {
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "kyc_auto_approve").maybeSingle();
    const v = String((data as any)?.value ?? "false").toLowerCase();
    setAutoApprove(["true", "1", "on", "yes"].includes(v));
  }, []);

  const toggleAuto = async (next: boolean) => {
    setAutoBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("platform_settings")
      .upsert({ key: "kyc_auto_approve", value: next ? "true" : "false", updated_by: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setAutoBusy(false);
    if (error) { toast.error(error.message); return; }
    setAutoApprove(next);
    toast.success(next ? "Auto-approve ON — adult (18+) submissions clear instantly" : "Auto-approve OFF — submissions wait for manual review");
  };

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("kyc_submissions")
      .select("id, user_id, full_name, date_of_birth, nationality, address_text, document_type, document_front_url, document_back_url, selfie_url, status, review_note, submitted_at")
      .order("submitted_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data ?? []) as Kyc[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
    loadAuto();
    const ch = supabase
      .channel("admin-kyc-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_submissions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const decide = async (k: Kyc, approve: boolean, note?: string) => {
    setBusyId(k.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("kyc_submissions").update({
      status: approve ? "approved" : "rejected",
      review_note: note ?? null,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", k.id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "KYC approved — user can deposit" : "KYC rejected");
    setRejectTarget(null); setRejectReason("");
    load();
  };

  const stats = useMemo(() => {
    const pending = items.filter(i => (i.status ?? "") === "pending").length;
    const approved = items.filter(i => { const s = i.status ?? ""; return s === "approved" || s === "verified"; }).length;
    const rejected = items.filter(i => (i.status ?? "") === "rejected").length;
    return { total: items.length, pending, approved, rejected };
  }, [items]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Users · KYC Verification"
          title="KYC VERIFICATION"
          tone="cyan"
          icon={<ShieldCheck className="h-5 w-5" />}
          badges={[
            { label: `${stats.pending} PENDING`, tone: "amber", dot: true },
            { label: `${stats.approved} APPROVED`, tone: "emerald" },
            { label: `${stats.rejected} REJECTED`, tone: "rose" },
          ]}
          subtitle={<>Player identity review queue · <span className="font-bold" style={{ color: "#d97706" }}>{stats.pending}</span> awaiting review · approving a submission unlocks real-money deposits for that user.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh queue">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<FileText className="h-4 w-4" />} label="Total (loaded)" value={stats.total} sub="in current view" tone="cyan" delay={0} />
          <V8StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pending} sub="awaiting review" tone="amber" delay={80} />
          <V8StatCard icon={<Check className="h-4 w-4" />} label="Approved" value={stats.approved} sub="deposits unlocked" tone="emerald" delay={160} />
          <V8StatCard icon={<X className="h-4 w-4" />} label="Rejected" value={stats.rejected} sub="held / re-submit" tone="rose" delay={240} />
        </div>

        {/* FILTERS */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md font-semibold transition ${
                filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}>{f}</button>
          ))}
        </div>

      <div className="rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 border"
        style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)", color: "#fcd34d" }}>
        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
        Approving a submission unlocks real-money deposits for that user. Verify the document matches the details before approving.
      </div>

      {/* Auto-approve (18+ only) toggle */}
      <div className="rounded-xl border p-3 flex items-start gap-3"
        style={{ background: autoApprove ? "rgba(16,185,129,0.08)" : "rgba(15,23,42,0.02)", borderColor: autoApprove ? "rgba(16,185,129,0.3)" : "rgba(15,23,42,0.08)" }}>
        <Zap className={`h-4 w-4 flex-shrink-0 mt-0.5 ${autoApprove ? "text-emerald-400" : "text-white/30"}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">Auto-approve on submit (18+ only)</div>
          <div className="text-[11px] text-white/50 mt-0.5">
            When ON, every new submission is approved the instant it's sent — no manual clicking.
            <span className="text-amber-300/80"> Under-18, missing/future DOB and duplicate identities are still held for manual review</span> (the age/AML gate stays on).
          </div>
        </div>
        <button
          role="switch"
          aria-checked={autoApprove}
          disabled={autoBusy}
          onClick={() => toggleAuto(!autoApprove)}
          className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50"
          style={{ background: autoApprove ? "#10b981" : "rgba(15,23,42,0.15)" }}
        >
          {autoBusy
            ? <Loader2 className="h-3 w-3 animate-spin text-white mx-auto" />
            : <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoApprove ? "translate-x-6" : "translate-x-1"}`} />}
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-white/30"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-white/30 text-sm">No {filter !== "all" ? filter : ""} submissions</div>
      ) : (
        <div className="space-y-2">
          {items.map(k => (
            <div key={k.id} className="rounded-xl border border-white/[0.06] p-3" style={{ background: "#ffffff" }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{k.full_name || "—"}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      (k.status === "approved" || k.status === "verified") ? "bg-emerald-500/15 text-emerald-300" :
                      k.status === "rejected" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"
                    }`}>{k.status}</span>
                  </div>
                  <div className="text-[11px] text-white/50 space-y-0.5">
                    <div>{k.document_type} · {k.nationality || "—"} · DOB {k.date_of_birth || "—"}</div>
                    {k.address_text && <div className="truncate">{k.address_text}</div>}
                    <div className="font-mono text-white/30">{k.user_id.slice(0, 8)}…{k.user_id.slice(-4)} · {fmt(k.submitted_at)}</div>
                    <div className="flex gap-3 pt-1">
                      {k.document_front_url && <a href={k.document_front_url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1">Front <ExternalLink className="h-3 w-3" /></a>}
                      {k.document_back_url && <a href={k.document_back_url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1">Back <ExternalLink className="h-3 w-3" /></a>}
                      {k.selfie_url && <a href={k.selfie_url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1">Selfie <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                    {k.review_note && <div className="text-rose-300/70 italic pt-0.5">Note: {k.review_note}</div>}
                  </div>
                </div>
                {(k.status === "pending") && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button size="sm" disabled={busyId === k.id} onClick={() => decide(k, true)}
                      className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white">
                      {busyId === k.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" disabled={busyId === k.id} onClick={() => { setRejectTarget(k); setRejectReason(""); }}
                      className="h-7 px-2.5 bg-rose-600 hover:bg-rose-500 text-white">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="bg-[#ffffff] border border-white/10 text-white">
          <DialogHeader><DialogTitle>Reject KYC</DialogTitle></DialogHeader>
          {rejectTarget && (
            <div className="space-y-3 text-sm">
              <div className="text-white/60">Reason (shown to {rejectTarget.full_name || "the user"} so they can re-submit):</div>
              <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} maxLength={300}
                placeholder="e.g. document blurry / name mismatch / expired ID"
                className="bg-white/[0.03] border-white/10 text-white" autoFocus />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-white" onClick={() => setRejectTarget(null)}>Cancel</Button>
                <Button onClick={() => decide(rejectTarget, false, rejectReason.trim() || "Could not verify")} disabled={busyId === rejectTarget.id}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white">
                  {busyId === rejectTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
