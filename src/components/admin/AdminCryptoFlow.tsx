import { useCallback, useEffect, useMemo, useState } from "react";
import { num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Wallet, ArrowDownLeft, ArrowUpRight, Radio, Hash } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminCryptoFlow — read-only monitor for the automated crypto payin/payout rail.
 *
 * Deposits: on-chain transfers to per-user addresses are auto-detected into
 * `incoming_deposits` (by the deposit-watcher / scanner functions) and credited.
 * Payouts: `withdrawal_requests` are sent on-chain. This surfaces the whole
 * automated flow for the operator — monitoring only, no money moves here.
 */

type Addr = { id: string; user_id: string | null; chain: string; address: string; is_active: boolean; derived_index: number | null };
type Dep = { id: string; tx_hash: string | null; from_address: string | null; to_address: string | null; amount: number | null; currency: string | null; chain: string | null; detected_at: string | null; matched_user_id: string | null; credited_at: string | null; status: string | null };
type Wd = { id: string; user_id: string | null; amount: number | null; net_amount: number | null; currency: string | null; chain: string | null; wallet_address: string | null; status: string | null; tx_hash: string | null; created_at: string | null; sent_at: string | null };

const fmt = (n: number) => num(n, { max: 6 });
const short = (s: string | null, n = 8) => (s ? `${s.slice(0, n)}…${s.slice(-4)}` : "—");
const isCredited = (d: Dep) => !!d.credited_at || (d.status || "").toLowerCase() === "credited";
const isSent = (w: Wd) => !!w.sent_at || !!w.tx_hash || ["sent", "completed", "paid", "success"].includes((w.status || "").toLowerCase());

function Pill({ ok, warn, children }: { ok?: boolean; warn?: boolean; children: React.ReactNode }) {
  const c = ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-slate-400";
  const bg = ok ? "rgba(16,185,129,0.14)" : warn ? "rgba(245,158,11,0.14)" : "rgba(15,23,42,0.06)";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c}`} style={{ background: bg }}>{children}</span>;
}

export default function AdminCryptoFlow() {
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [wds, setWds] = useState<Wd[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: a }, { data: d }, { data: w }] = await Promise.all([
      supabase.from("user_deposit_addresses").select("id, user_id, chain, address, is_active, derived_index").limit(500),
      supabase.from("incoming_deposits").select("id, tx_hash, from_address, to_address, amount, currency, chain, detected_at, matched_user_id, credited_at, status").order("detected_at", { ascending: false }).limit(100),
      supabase.from("withdrawal_requests").select("id, user_id, amount, net_amount, currency, chain, wallet_address, status, tx_hash, created_at, sent_at").order("created_at", { ascending: false }).limit(100),
    ]);
    const A = (a || []) as Addr[]; const D = (d || []) as Dep[]; const W = (w || []) as Wd[];
    setAddrs(A); setDeps(D); setWds(W);
    const ids = [...new Set([...A.map((x) => x.user_id), ...D.map((x) => x.matched_user_id), ...W.map((x) => x.user_id)].filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of (profs || []) as { id: string; email?: string; full_name?: string }[]) map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      setNames(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const credited = deps.filter(isCredited);
    const pendingDep = deps.filter((d) => !isCredited(d));
    const sent = wds.filter(isSent);
    const pendingWd = wds.filter((w) => !isSent(w));
    return {
      addresses: addrs.length,
      creditedSum: credited.reduce((s, d) => s + Number(d.amount || 0), 0),
      pendingDep: pendingDep.length,
      paidSum: sent.reduce((s, w) => s + Number(w.net_amount ?? w.amount ?? 0), 0),
      pendingWd: pendingWd.length,
      detected: deps.length,
    };
  }, [addrs, deps, wds]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Finance · Crypto Auto Flow"
          title="CRYPTO AUTO FLOW"
          tone="amber"
          icon={<Radio className="h-5 w-5" />}
          badges={[
            { label: `${stats.addresses} ADDRESSES`, tone: "cyan", icon: <Wallet className="h-3 w-3" /> },
            { label: `${stats.pendingDep} PENDING IN`, tone: "amber", dot: stats.pendingDep > 0 },
            { label: `${stats.pendingWd} PENDING OUT`, tone: "rose", dot: stats.pendingWd > 0 },
          ]}
          subtitle={<>Automated per-user crypto payin (on-chain auto-detect &amp; credit) and payout · <span className="font-bold" style={{ color: "#b45309" }}>{stats.detected}</span> on-chain tx seen · monitoring only.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh flow">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Deposit addrs" value={stats.addresses} sub="per-user, issued" tone="cyan" delay={0} />
          <V8StatCard icon={<ArrowDownLeft className="h-4 w-4" />} label="Auto-credited" value={Math.round(stats.creditedSum)} sub="USDT in, detected" tone="emerald" delay={80} />
          <V8StatCard icon={<Hash className="h-4 w-4" />} label="Detected tx" value={stats.detected} sub="on-chain seen" tone="amber" delay={160} />
          <V8StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Paid out" value={Math.round(stats.paidSum)} sub="USDT sent" tone="rose" delay={240} />
        </div>

      {/* Incoming deposits */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-bold text-slate-800 flex items-center gap-2"><ArrowDownLeft className="h-4 w-4 text-emerald-500" /> Auto payin — detected deposits</div>
        {loading ? <div className="p-8 text-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          : deps.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No on-chain deposits detected yet. Once the watcher + HD seed are live, incoming transfers to user addresses appear here and auto-credit.</div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 text-left">
                <th className="px-4 py-2 font-semibold">Detected</th><th className="px-4 py-2 font-semibold">Player</th><th className="px-4 py-2 font-semibold">Chain</th>
                <th className="px-4 py-2 font-semibold">Tx</th><th className="px-4 py-2 font-semibold text-right">Amount</th><th className="px-4 py-2 font-semibold text-center">Status</th>
              </tr></thead>
              <tbody>
                {deps.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-400">{d.detected_at ? new Date(d.detected_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.matched_user_id ? (names[d.matched_user_id] || short(d.matched_user_id)) : <span className="text-amber-600">unmatched</span>}</td>
                    <td className="px-4 py-2 uppercase text-slate-500">{d.chain || "—"}</td>
                    <td className="px-4 py-2 font-mono text-slate-400">{short(d.tx_hash)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600">{fmt(Number(d.amount || 0))} {d.currency || ""}</td>
                    <td className="px-4 py-2 text-center"><Pill ok={isCredited(d)} warn={!isCredited(d)}>{isCredited(d) ? "Credited" : (d.status || "pending")}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payouts */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-bold text-slate-800 flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-rose-500" /> Payout — withdrawals</div>
        {wds.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No withdrawals yet.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 text-left">
                <th className="px-4 py-2 font-semibold">Requested</th><th className="px-4 py-2 font-semibold">Player</th><th className="px-4 py-2 font-semibold">Chain</th>
                <th className="px-4 py-2 font-semibold">To</th><th className="px-4 py-2 font-semibold text-right">Net</th><th className="px-4 py-2 font-semibold text-center">Status</th>
              </tr></thead>
              <tbody>
                {wds.map((w) => (
                  <tr key={w.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-400">{w.created_at ? new Date(w.created_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{w.user_id ? (names[w.user_id] || short(w.user_id)) : "—"}</td>
                    <td className="px-4 py-2 uppercase text-slate-500">{w.chain || "—"}</td>
                    <td className="px-4 py-2 font-mono text-slate-400">{short(w.wallet_address)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-rose-600">{fmt(Number(w.net_amount ?? w.amount ?? 0))} {w.currency || ""}</td>
                    <td className="px-4 py-2 text-center"><Pill ok={isSent(w)} warn={!isSent(w)}>{isSent(w) ? "Sent" : (w.status || "pending")}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-bold text-slate-800 flex items-center gap-2"><Wallet className="h-4 w-4 text-cyan-500" /> Per-user deposit addresses</div>
        {addrs.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No per-user addresses derived yet. They are minted on first crypto-deposit view once the HD seed is configured.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 text-left">
                <th className="px-4 py-2 font-semibold">Player</th><th className="px-4 py-2 font-semibold">Chain</th><th className="px-4 py-2 font-semibold">Address</th>
                <th className="px-4 py-2 font-semibold text-right">Index</th><th className="px-4 py-2 font-semibold text-center">Active</th>
              </tr></thead>
              <tbody>
                {addrs.slice(0, 80).map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-2 whitespace-nowrap">{a.user_id ? (names[a.user_id] || short(a.user_id)) : "shared"}</td>
                    <td className="px-4 py-2 uppercase text-slate-500">{a.chain}</td>
                    <td className="px-4 py-2 font-mono text-slate-400">{short(a.address, 10)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-400">{a.derived_index ?? "—"}</td>
                    <td className="px-4 py-2 text-center"><Pill ok={a.is_active} warn={!a.is_active}>{a.is_active ? "Active" : "Off"}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Monitoring only. Deposits are auto-detected on-chain and credited by the watcher/scanner functions; payouts are on-chain sends.
        To mint real per-user addresses and enable full auto-credit, the HD-wallet seed + a TRON scan API key must be set as edge-function secrets (never in the repo/frontend).
      </p>
      </div>
    </div>
  );
}
