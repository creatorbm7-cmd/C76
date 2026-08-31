import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TriggerHealthCheck from "@/components/admin/TriggerHealthCheck";

type Status = "ok" | "warn" | "down";
interface Check { group: string; name: string; status: Status; latency_ms: number; detail: string; }
interface Report {
  generated_at: string;
  summary: { ok: number; warn: number; down: number; total: number };
  checks: Check[];
}

const STATUS_TONE: Record<Status, { bg: string; text: string; ring: string; Icon: any }> = {
  ok:   { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/30", Icon: CheckCircle2 },
  warn: { bg: "bg-amber-500/10",   text: "text-amber-300",   ring: "ring-amber-500/30",   Icon: AlertTriangle },
  down: { bg: "bg-rose-500/15",    text: "text-rose-300",    ring: "ring-rose-500/40",    Icon: XCircle },
};

export default function AdminHealth() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke<Report>("platform-health", { body: {} });
      if (error) throw error;
      if (!data) throw new Error("Empty response");
      setReport(data);
      setLastRun(new Date());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(run, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, run]);

  const groups = report
    ? Array.from(new Set(report.checks.map((c) => c.group)))
    : [];

  return (
    <div className="admin-live-shell min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-emerald-500/[0.06] blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-rose-500/[0.04] blur-[160px]" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-white/40 hover:text-white/80 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Platform Diagnostics</p>
              <h1 className="text-xl font-bold leading-none flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-300" /> Health Agent
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-2 text-white/60">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-emerald-400" />
              Auto-refresh 30s
            </label>
            {lastRun && <span className="text-white/40">Updated {lastRun.toLocaleTimeString()}</span>}
            <button
              onClick={run}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-5 py-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 px-4 py-3 text-rose-200 text-sm flex items-center gap-2">
            <XCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <TriggerHealthCheck />

        {report && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Total checks" value={report.summary.total} tone="text-white" />
              <SummaryCard label="Healthy" value={report.summary.ok} tone="text-emerald-300" />
              <SummaryCard label="Warnings" value={report.summary.warn} tone="text-amber-300" />
              <SummaryCard label="Down" value={report.summary.down} tone="text-rose-300" pulse={report.summary.down > 0} />
            </div>

            {/* Groups */}
            {groups.map((g) => {
              const items = report.checks
                .filter((c) => c.group === g)
                .sort((a, b) => {
                  const order: Record<Status, number> = { down: 0, warn: 1, ok: 2 };
                  return order[a.status] - order[b.status];
                });
              return (
                <section key={g}>
                  <h2 className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-2 px-1">{g} <span className="text-white/20">· {items.length}</span></h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((c) => {
                      const tone = STATUS_TONE[c.status];
                      return (
                        <div key={`${g}-${c.name}`} className={`rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 flex items-center gap-3 ring-1 ${tone.ring}`}>
                          <div className={`h-7 w-7 rounded-md grid place-items-center ${tone.bg} ${tone.text}`}>
                            <tone.Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-[11px] text-white/50 truncate">{c.detail}</div>
                          </div>
                          <div className="text-[10px] font-mono text-white/40 tabular-nums">{c.latency_ms}ms</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}

        {!report && loading && (
          <div className="flex items-center justify-center py-20 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Running diagnostics…
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone, pulse }: { label: string; value: number; tone: string; pulse?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 ${pulse ? "animate-pulse" : ""}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}
