// Treasury / Liability — real-money exposure dashboard.
//
// Read-only view of real cash in/out and current outstanding liability now
// that the platform is live: approved deposits, processed withdrawals,
// pending queues, and total player balance owed.

import { useState, useEffect, useCallback, useMemo } from "react";
import { num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, ArrowDownToLine, ArrowUpFromLine, Wallet, Scale, Clock,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Dep { amount: number; method: string; created_at: string; status: string; }
interface Wd { amount: number; chain: string | null; status: string; created_at: string; }

export default function AdminLiability() {
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<Dep[]>([]);
  const [withdrawals, setWithdrawals] = useState<Wd[]>([]);
  const [liability, setLiability] = useState(0);
  // Quarantined / unbacked balances (e.g. research-test injections) — segregated,
  // never counted as real liability. Records preserved for audit.
  const [quarantinedLiability, setQuarantinedLiability] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [depRes, wdRes, walletRes] = await Promise.all([
      supabase.from("deposit_requests").select("amount, method, created_at, status").order("created_at", { ascending: false }).limit(500),
      supabase.from("crypto_withdrawals").select("amount, chain, status, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("casino_wallets").select("balance, quarantine"),
    ]);
    if (depRes.error) toast.error(depRes.error.message);
    setDeposits((depRes.data ?? []) as Dep[]);
    setWithdrawals((wdRes.data ?? []) as Wd[]);
    const w = (walletRes.data ?? []) as { balance: number; quarantine: boolean }[];
    setLiability(w.filter(x => !x.quarantine).reduce((s, x) => s + Number(x.balance || 0), 0));
    setQuarantinedLiability(w.filter(x => x.quarantine).reduce((s, x) => s + Number(x.balance || 0), 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-liability")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + Number(x.amount || 0), 0);
  const depApproved = deposits.filter(d => d.status === "approved");
  const depPending = deposits.filter(d => d.status === "pending");
  const wdDone = withdrawals.filter(w => w.status === "completed");
  const wdPending = withdrawals.filter(w => w.status === "pending");

  const totalIn = sum(depApproved);
  const totalOut = sum(wdDone);
  const net = totalIn - totalOut;
  const fmt = (n: number) => num(n, { max: 2 });
  const fmtT = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" });

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.lb-card{background:#ffffff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.lb-mono{font-variant-numeric:tabular-nums;letter-spacing:-.02em}`}</style>

      <div className="space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Finance · Liability & Reconciliation"
          title="LIABILITY & RECONCILE"
          tone="emerald"
          icon={<Scale className="h-5 w-5" />}
          badges={[
            { label: `NET CASH ${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))} USDT`, tone: net >= 0 ? "emerald" : "rose", dot: true },
            { label: `${fmt(liability)} USDT OWED`, tone: "amber" },
            { label: `${depPending.length + wdPending.length} PENDING`, tone: "cyan" },
          ]}
          subtitle={<>Cash custody (USDT) · live · <span className="font-bold" style={{ color: "#059669" }}>{fmt(liability)} USDT</span> player cash liability across all wallets. Gaming revenue (GGR) is on the Dashboard; C74 (energy) liability is on the C74 tab — kept separate.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh treasury">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<ArrowDownToLine className="h-4 w-4" />} label="Deposits in (approved)" value={Math.round(totalIn)} sub="USDT cash in" tone="emerald" delay={0} />
          <V8StatCard icon={<ArrowUpFromLine className="h-4 w-4" />} label="Withdrawals out" value={Math.round(totalOut)} sub="USDT paid out" tone="rose" delay={80} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="Net cash flow" value={Math.round(Math.abs(net))} sub={net >= 0 ? "USDT surplus" : "USDT deficit"} tone={net >= 0 ? "emerald" : "rose"} delay={160} prefix={net >= 0 ? "+" : "−"} />
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Player cash liability (USDT)" value={Math.round(liability)} sub="USDT owed" tone="amber" delay={240} />
        </div>

        {/* Segregated: quarantined / unbacked balances — NOT real liability.
            Kept visible for audit; underlying records preserved. */}
        {quarantinedLiability > 0 && (
          <div className="lb-card p-3 flex items-center justify-between" style={{ borderStyle: "dashed", borderColor: "rgba(148,163,184,0.55)" }}>
            <div className="text-[11px] font-semibold text-slate-500">
              Segregated (quarantined / unbacked) — excluded from liability above · records preserved
            </div>
            <div className="text-sm font-black lb-mono text-slate-400">{fmt(quarantinedLiability)} USDT</div>
          </div>
        )}

      {loading ? (
        <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="lb-card p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div><div className="text-xl font-black lb-mono text-slate-900">{depPending.length}</div><div className="text-[10px] text-slate-500 font-semibold">Pending deposits · {fmt(sum(depPending))}</div></div>
            </div>
            <div className="lb-card p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div><div className="text-xl font-black lb-mono text-slate-900">{wdPending.length}</div><div className="text-[10px] text-slate-500 font-semibold">Pending withdrawals · {fmt(sum(wdPending))}</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Feed title="Recent approved deposits" rows={depApproved.slice(0, 10).map(d => ({ amount: d.amount, sub: `${d.method} · ${fmtT(d.created_at)}`, pos: true }))} empty="No deposits yet" fmt={fmt} fmtSign="+" />
            <Feed title="Recent withdrawals" rows={wdDone.slice(0, 10).map(w => ({ amount: w.amount, sub: `${w.chain || "—"} · ${fmtT(w.created_at)}`, pos: false }))} empty="No withdrawals yet" fmt={fmt} fmtSign="−" />
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function Feed({ title, rows, empty, fmt, fmtSign }: { title: string; rows: { amount: number; sub: string; pos: boolean }[]; empty: string; fmt: (n: number) => string; fmtSign: string }) {
  return (
    <div className="lb-card overflow-hidden">
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</h3>
      </div>
      {rows.length === 0 ? <div className="p-8 text-center text-slate-400 text-xs">{empty}</div> : (
        <div>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i ? "1px solid rgba(15,23,42,0.04)" : undefined }}>
              <div className="text-[11px] text-slate-500">{r.sub}</div>
              <div className="text-sm font-black lb-mono" style={{ color: r.pos ? "#059669" : "#e11d48" }}>{fmtSign}{fmt(r.amount)} USDT</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
