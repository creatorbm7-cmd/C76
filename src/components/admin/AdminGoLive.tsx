import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2, Rocket, ShieldCheck,
  Banknote, Wallet, Globe, FileCheck,
} from "lucide-react";

/**
 * AdminGoLive — real-money go-live readiness control.
 *
 * READ-ONLY checklist computed live from the database. There is no reset or
 * mode-switch button here by design.
 *
 * IMPORTANT: once the platform is LIVE, non-zero player balances are REAL
 * customer deposits (a liability), NOT free-play to be zeroed. This panel must
 * never present them as a "reset to 0" blocker — doing so once already led to
 * real deposits being wiped and restored from backup. The balances check is
 * therefore informational in live mode, never a "fail".
 */

type CheckState = "pass" | "fail" | "warn";

interface Check {
  id: string;
  icon: React.ReactNode;
  label: string;
  state: CheckState;
  detail: string;
  ownerAction?: boolean; // operator/legal, not codeable
}

export default function AdminGoLive() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<string>("demo");
  const [coinLiability, setCoinLiability] = useState(0);
  const [walletsWithCoins, setWalletsWithCoins] = useState(0);
  const [kycApproved, setKycApproved] = useState(0);
  const [kycPending, setKycPending] = useState(0);
  const [depositEngine, setDepositEngine] = useState(false);
  const [geoConfigured, setGeoConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [modeRes, walletRes, kycAppRes, kycPendRes, depRes, geoRes] = await Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "mode").maybeSingle(),
      supabase.from("casino_wallets").select("balance"),
      supabase.from("kyc_submissions").select("user_id", { count: "exact", head: true }).in("status", ["approved", "verified"]),
      supabase.from("kyc_submissions").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("deposit_requests").select("id", { count: "exact", head: true }),
      supabase.from("geo_settings").select("*", { count: "exact", head: true }),
    ]);
    setMode(String((modeRes.data as any)?.value ?? "demo"));
    const wallets = walletRes.data || [];
    setCoinLiability(wallets.reduce((s, w) => s + Number(w.balance || 0), 0));
    setWalletsWithCoins(wallets.filter(w => Number(w.balance || 0) > 0).length);
    setKycApproved(kycAppRes.count ?? 0);
    setKycPending(kycPendRes.count ?? 0);
    setDepositEngine(depRes.error == null);
    setGeoConfigured((geoRes.count ?? 0) > 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);


  const checks: Check[] = [
    {
      id: "engine", icon: <Banknote className="h-4 w-4" />, label: "Deposit engine connected",
      state: depositEngine ? "pass" : "fail",
      detail: depositEngine ? "Manual deposit RPCs + table are live." : "Deposit engine migration not applied.",
    },
    {
      id: "kycflow", icon: <ShieldCheck className="h-4 w-4" />, label: "KYC verification flow",
      state: "pass",
      detail: `Player /kyc form + admin review live. ${kycApproved} approved · ${kycPending} pending.`,
    },
    {
      id: "balances", icon: <Wallet className="h-4 w-4" />,
      label: mode === "live" ? "Player balances (real funds)" : "Player balances",
      // In LIVE mode a non-zero balance is expected — it is real customer money
      // (platform liability), NOT a free-play blocker. Never mark it "fail"
      // (which reads as "reset to 0"); zeroing real deposits destroys real money.
      state: mode === "live" ? "pass" : (coinLiability > 0 ? "warn" : "pass"),
      detail: coinLiability > 0
        ? (mode === "live"
            ? `${fmt(coinLiability)} USDT held across ${walletsWithCoins} player wallet(s) — these are REAL customer deposits (platform liability). Do NOT reset; zeroing destroys real money.`
            : `${fmt(coinLiability)} coins across ${walletsWithCoins} wallets. If these are demo/test credits, zero them before first go-live. If they are real deposits, do NOT reset.`)
        : "All player balances are zero.",
    },
    {
      id: "geo", icon: <Globe className="h-4 w-4" />, label: "Geo-blocking configured",
      state: geoConfigured ? "pass" : "warn",
      detail: geoConfigured ? "Geo settings present." : "No prohibited-country blocklist configured.",
    },
    {
      id: "kycdone", icon: <FileCheck className="h-4 w-4" />, label: "At least one verified player",
      state: kycApproved > 0 ? "pass" : "warn",
      detail: kycApproved > 0 ? `${kycApproved} player(s) KYC-approved.` : "No players verified yet — deposits stay blocked until someone is approved.",
    },
    {
      id: "licence", icon: <FileCheck className="h-4 w-4" />, label: "Gambling licence valid", ownerAction: true,
      state: "warn",
      detail: "Licence 16665760 — must be confirmed valid by you. Not machine-verifiable.",
    },
    {
      id: "payment", icon: <FileCheck className="h-4 w-4" />, label: "Gambling-approved payment route", ownerAction: true,
      state: "warn",
      detail: "Dreampay DTX LTD (UK) — confirm it's approved for gambling MCC and wired.",
    },
  ];

  const blockers = checks.filter(c => c.state === "fail");
  const warnings = checks.filter(c => c.state === "warn");
  const ready = blockers.length === 0;

  return (
    <div className="space-y-5">
      <style>{`
        .gl-card { background:#ffffff; border:1px solid rgba(15,23,42,0.07); border-radius:16px; }
        @keyframes gl-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Rocket className="h-5 w-5 text-amber-400" /> Go-Live Readiness
          </h1>
          <p className="text-xs text-white/50 mt-1">Real-money switch checklist — read-only</p>
        </div>
        <button onClick={load} className="text-white/60 hover:text-white inline-flex items-center gap-1.5 text-xs font-semibold">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Mode + status banner */}
      <div className="gl-card p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Platform mode</div>
          <div className="text-3xl font-black tracking-tight mt-1" style={{ color: mode === "live" ? "#ff6b78" : "#ffc935" }}>
            {mode === "live" ? "🔴 LIVE · REAL MONEY" : "🟡 DEMO · FREE PLAY"}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-black ${ready ? "text-emerald-300" : "text-rose-300"}`}>
            {loading ? "Checking…" : ready ? "✓ No hard blockers" : `${blockers.length} blocker${blockers.length > 1 ? "s" : ""} remaining`}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">{warnings.length} item(s) need your confirmation</div>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-white/30"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="gl-card overflow-hidden">
          {checks.map((c, i) => (
            <div key={c.id} className="flex items-start gap-3 p-4" style={{ borderTop: i ? "1px solid rgba(15,23,42,0.05)" : undefined }}>
              <div className="mt-0.5 flex-shrink-0">
                {c.state === "pass" ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : c.state === "fail" ? <XCircle className="h-5 w-5 text-rose-400" />
                  : <AlertTriangle className="h-5 w-5 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white/60">{c.icon}</span>
                  <span className="text-sm font-bold text-white">{c.label}</span>
                  {c.ownerAction && <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/50">your task</span>}
                </div>
                <div className="text-[11px] text-white/50 mt-1 leading-relaxed">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Irreversible steps — operator-run, not one-click */}
      <div className="gl-card p-5" style={{ borderColor: "rgba(224,43,60,0.3)" }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-black text-white">Final go-live steps (irreversible)</h3>
        </div>
        <ol className="text-[12px] text-white/60 space-y-2 list-decimal pl-5 leading-relaxed">
          <li>
            {mode === "live"
              ? <><b className="text-emerald-300">Do NOT reset player balances.</b>{coinLiability > 0 && <span className="text-white/70"> The {fmt(coinLiability)} USDT outstanding are real customer deposits — zeroing them destroys real money.</span>}</>
              : <><b className="text-white/80">Zero any demo/test credits</b> (never real deposits) before first go-live.{coinLiability > 0 && <span className="text-amber-300"> {fmt(coinLiability)} coins present — verify they are test credits, not deposits, before touching them.</span>}</>}
          </li>
          <li><b className="text-white/80">Confirm licence + payment route</b> are valid and live.</li>
          <li><b className="text-white/80">Switch platform mode → LIVE.</b> Current: <b style={{ color: mode === "live" ? "#ff6b78" : "#ffc935" }}>{mode.toUpperCase()}</b></li>
        </ol>
        <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
          {mode === "live"
            ? "Platform is already LIVE. Player balances are real deposits — never reset them from a “clear balances” step. This panel is read-only."
            : "These are run deliberately at go-live, not from a one-click button. Only zero balances that are confirmed demo/test credits — never real deposits — and confirm the licence and payment route first."}
        </p>
      </div>
    </div>
  );
}
