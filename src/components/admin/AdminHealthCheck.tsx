import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const FUNCTIONS = [
  "send-otp-email", "verify-otp-email", "verify-two-factor-pin", "verify-admin-pin",
  "notify-event", "notify-admins",
  "casino-withdraw", "casino-transfer", "place-bet", "mines-reveal", "mines-cashout",
  "admin-casino", "rotate-seed",
  "process-deposit", "scan-user-deposits", "cron-scan-deposits", "derive-user-wallet",
  "generate-platform-wallet", "process-withdrawal",
  "create-checkout", "create-fiat-topup", "verify-fiat-topup", "payments-webhook",
  "process-swap", "check-tpsl",
  "send-transactional-email", "process-email-queue", "preview-transactional-email",
  "handle-email-suppression", "handle-email-unsubscribe",
  "send-telegram-broadcast", "telegram-webhook",
  "ai-coach-talk", "automation-webhook", "scheduled-tasks",
];

type Status = "idle" | "checking" | "ok" | "warn" | "error";
type Result = { name: string; status: Status; latencyMs?: number; httpStatus?: number; checkedAt?: string; error?: string };

type AuditError = { id: string; event_type: string; created_at: string; event_details: any };

const STORAGE_KEY = "dtx_health_enabled";

export default function AdminHealthCheck() {
  const [results, setResults] = useState<Result[]>(
    FUNCTIONS.map((name) => ({ name, status: "idle" }))
  );
  const [running, setRunning] = useState(false);
  const [errors, setErrors] = useState<AuditError[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(false);

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return Object.fromEntries(FUNCTIONS.map((n) => [n, saved[n] !== false]));
    } catch {
      return Object.fromEntries(FUNCTIONS.map((n) => [n, true]));
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled)); } catch {}
  }, [enabled]);

  const toggle = (name: string) =>
    setEnabled((e) => ({ ...e, [name]: !e[name] }));
  const setAll = (val: boolean) =>
    setEnabled(Object.fromEntries(FUNCTIONS.map((n) => [n, val])));
  const onlyFailing = () => {
    const failing = new Set(
      results
        .filter(
          (r) =>
            r.status === "error" ||
            r.status === "warn" ||
            (r.httpStatus != null && (r.httpStatus < 200 || r.httpStatus >= 300))
        )
        .map((r) => r.name)
    );
    if (failing.size === 0) return;
    setEnabled(Object.fromEntries(FUNCTIONS.map((n) => [n, failing.has(n)])));
  };

  const pingOnce = async (name: string): Promise<Result> => {
    const t0 = performance.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: "OPTIONS",
        signal: ctrl.signal,
        headers: {
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type",
          "Origin": window.location.origin,
        },
      });
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - t0);
      let status: Status = "ok";
      if (res.status >= 500) status = "error";
      else if (res.status >= 400 && res.status !== 401 && res.status !== 405) status = "warn";
      return { name, status, latencyMs, httpStatus: res.status, checkedAt: new Date().toISOString() };
    } catch (e: any) {
      return {
        name,
        status: "error",
        latencyMs: Math.round(performance.now() - t0),
        checkedAt: new Date().toISOString(),
        error: e?.message || "Network error",
      };
    }
  };

  // Retry once on transient network failure ("Load failed", AbortError, TypeError)
  const pingOne = async (name: string): Promise<Result> => {
    const first = await pingOnce(name);
    if (first.status !== "error") return first;
    await new Promise((r) => setTimeout(r, 400));
    return await pingOnce(name);
  };

  // Bounded concurrency — Safari and most CDNs reject bursts of 30+ parallel fetches.
  const runWithConcurrency = async <T,>(items: string[], limit: number, fn: (n: string) => Promise<T>): Promise<T[]> => {
    const out: T[] = new Array(items.length);
    let idx = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    });
    await Promise.all(workers);
    return out;
  };

  const runAll = async () => {
    const targets = FUNCTIONS.filter((n) => enabled[n]);
    if (targets.length === 0) return;
    setRunning(true);
    setResults((prev) =>
      prev.map((x) => (enabled[x.name] ? { ...x, status: "checking" as Status } : x))
    );
    const settled = await runWithConcurrency(targets, 6, pingOne);
    const byName = new Map(settled.map((r) => [r.name, r]));
    setResults((prev) => prev.map((x) => byName.get(x.name) ?? x));
    setRunning(false);
  };

  const loadErrors = async () => {
    setErrorsLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("audit_logs")
        .select("id,event_type,created_at,event_details")
        .or("event_type.ilike.%error%,event_type.ilike.%fail%,event_type.ilike.%reject%")
        .order("created_at", { ascending: false })
        .limit(20);
      setErrors(data || []);
    } finally {
      setErrorsLoading(false);
    }
  };

  const [autoRefresh, setAutoRefresh] = useState<number>(0); // seconds, 0 = off
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    runAll();
    loadErrors();
  }, []);

  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return; }
    setCountdown(autoRefresh);
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { runAll(); loadErrors(); return autoRefresh; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh]);

  const enabledList = results.filter((r) => enabled[r.name]);
  const enabledCount = enabledList.length;
  const counts = enabledList.reduce(
    (a, r) => ({ ...a, [r.status]: (a as any)[r.status] + 1 }),
    { idle: 0, checking: 0, ok: 0, warn: 0, error: 0 } as Record<Status, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Edge Function Health
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Pings every edge function via CORS preflight. 200/204/401/405 = reachable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-[11px]">
            <Pill color="emerald" label={`${counts.ok} OK`} />
            <Pill color="amber" label={`${counts.warn} Warn`} />
            <Pill color="rose" label={`${counts.error} Down`} />
          </div>
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(Number(e.target.value))}
            className="bg-white/[0.04] text-white/80 text-xs px-2 py-1.5 rounded-md ring-1 ring-white/10 hover:ring-white/20 focus:outline-none"
            title="Auto-refresh interval"
          >
            <option value={0}>Auto-refresh: Off</option>
            <option value={10}>Every 10s</option>
            <option value={30}>Every 30s</option>
            <option value={60}>Every 60s</option>
            <option value={300}>Every 5m</option>
          </select>
          <button
            onClick={() => { runAll(); loadErrors(); }}
            disabled={running}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold ring-1 ring-emerald-400/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
            {autoRefresh > 0 ? `Refresh (${countdown}s)` : "Refresh"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 border-b border-white/[0.06]">
          <div className="text-[11px] text-white/50">
            <span className="font-mono text-white/80">{enabledCount}</span> / {FUNCTIONS.length} selected
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <button onClick={() => setAll(true)} className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/70 ring-1 ring-white/10">All</button>
            <button onClick={() => setAll(false)} className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/70 ring-1 ring-white/10">None</button>
            <button onClick={onlyFailing} className="px-2 py-1 rounded-md bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-400/30">Only failing</button>
          </div>
        </div>
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-widest text-white/40 border-b border-white/[0.06]">
          <div className="col-span-1">On</div>
          <div className="col-span-4">Function</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">HTTP</div>
          <div className="col-span-1">Latency</div>
          <div className="col-span-2">Last Check</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {results.map((r) => {
            const on = enabled[r.name];
            return (
              <div
                key={r.name}
                className={`grid grid-cols-12 px-4 py-2.5 text-xs items-center hover:bg-white/[0.02] ${on ? "" : "opacity-40"}`}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(r.name)}
                    className="h-3.5 w-3.5 accent-emerald-400 cursor-pointer"
                  />
                </div>
                <div className="col-span-4 font-mono text-white/80 truncate">{r.name}</div>
                <div className="col-span-2">
                  {on ? <StatusBadge status={r.status} /> : <span className="text-white/30 text-[11px]">Skipped</span>}
                </div>
                <div className="col-span-2 font-mono text-white/60">{on ? (r.httpStatus ?? "—") : "—"}</div>
                <div className="col-span-1 font-mono text-white/60">{on && r.latencyMs != null ? `${r.latencyMs}ms` : "—"}</div>
                <div className="col-span-2 text-white/40">
                  {on && r.checkedAt ? new Date(r.checkedAt).toLocaleTimeString() : "—"}
                  {on && r.error && <div className="text-yellow-400 text-[10px] truncate">{r.error}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Recent Errors (audit log)</h3>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40">{errors.length} entries</span>
        </div>
        {errorsLoading ? (
          <div className="p-6 text-center text-white/40 text-xs">Loading…</div>
        ) : errors.length === 0 ? (
          <div className="p-6 text-center text-white/40 text-xs">No recent errors.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {errors.map((e) => (
              <div key={e.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-yellow-300">{e.event_type}</span>
                  <span className="text-white/40 text-[10px]">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                {e.event_details && (
                  <pre className="mt-1 text-[10px] text-white/50 truncate font-mono">
                    {typeof e.event_details === "string" ? e.event_details : JSON.stringify(e.event_details)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ color, label }: { color: "emerald" | "amber" | "rose"; label: string }) {
  const map = {
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
    rose: "bg-yellow-500/10 text-yellow-300 ring-yellow-400/30",
  } as const;
  return <span className={`px-2 py-1 rounded-md ring-1 font-semibold ${map[color]}`}>{label}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "checking") return <span className="inline-flex items-center gap-1.5 text-white/50 text-[11px]"><Loader2 className="h-3 w-3 animate-spin" />Checking</span>;
  if (status === "ok") return <span className="inline-flex items-center gap-1.5 text-emerald-300 text-[11px]"><CheckCircle2 className="h-3 w-3" />Healthy</span>;
  if (status === "warn") return <span className="inline-flex items-center gap-1.5 text-amber-300 text-[11px]"><AlertTriangle className="h-3 w-3" />Warn</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1.5 text-yellow-300 text-[11px]"><XCircle className="h-3 w-3" />Down</span>;
  return <span className="text-white/30 text-[11px]">—</span>;
}
