import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  betsCount: number;
  sessionsCompleted: number;
  diff: number;
  lastBetAt: string | null;
  triggerOk: boolean | null;
  loading: boolean;
}

export default function TriggerHealthCheck() {
  const [s, setS] = useState<Stats>({
    betsCount: 0, sessionsCompleted: 0, diff: 0, lastBetAt: null, triggerOk: null, loading: true,
  });

  const run = async () => {
    setS((p) => ({ ...p, loading: true }));
    const [betsHead, sessHead, latestSession, latestBet] = await Promise.all([
      supabase.from("casino_bets").select("id", { count: "exact", head: true }),
      supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("game_sessions").select("id,created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("casino_bets").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    let triggerOk: boolean | null = null;
    if (latestSession.data?.id) {
      const { data: match } = await supabase.from("casino_bets").select("id").eq("session_id", latestSession.data.id).maybeSingle();
      triggerOk = !!match;
    }

    const betsCount = betsHead.count ?? 0;
    const sessionsCompleted = sessHead.count ?? 0;
    setS({
      betsCount,
      sessionsCompleted,
      diff: sessionsCompleted - betsCount,
      lastBetAt: latestBet.data?.created_at ?? null,
      triggerOk,
      loading: false,
    });
  };

  useEffect(() => { run(); }, []);

  const stat = (label: string, value: string | number, tone = "text-white") => (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-white/40">Casino bets sync</h2>
        <button onClick={run} disabled={s.loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-xs disabled:opacity-50">
          {s.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Run check
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat("casino_bets (total)", s.betsCount)}
        {stat("game_sessions (completed)", s.sessionsCompleted)}
        {stat("Diff", s.diff, Math.abs(s.diff) <= 2 ? "text-emerald-300" : "text-amber-300")}
        {stat("Last bet", s.lastBetAt ? new Date(s.lastBetAt).toLocaleTimeString() : "—", "text-white/70 text-base")}
      </div>

      <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
        s.triggerOk === true ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" :
        s.triggerOk === false ? "bg-rose-500/10 border-rose-500/40 text-rose-200" :
        "bg-white/[0.02] border-white/10 text-white/60"
      }`}>
        {s.triggerOk === true && <CheckCircle2 className="h-5 w-5" />}
        {s.triggerOk === false && <XCircle className="h-5 w-5" />}
        {s.triggerOk === null && <Loader2 className="h-5 w-5 animate-spin" />}
        <div className="text-sm">
          {s.triggerOk === true && "Trigger working — latest completed session has a matching casino_bets row."}
          {s.triggerOk === false && "Trigger broken — latest completed session has NO matching casino_bets row."}
          {s.triggerOk === null && "Running check…"}
        </div>
      </div>
    </section>
  );
}
