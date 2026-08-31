import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  subscribePerf,
  getMemoryMB,
  getPageLoadMs,
  getBundleSummary,
  startPerfMonitor,
  type PerfSnapshot,
} from "@/lib/perfMonitor";

type Tone = "good" | "warn" | "bad" | "neutral";

const toneClass: Record<Tone, string> = {
  good: "text-emerald-300 ring-emerald-400/30 bg-emerald-500/10",
  warn: "text-amber-300 ring-amber-400/30 bg-amber-500/10",
  bad: "text-red-300 ring-red-400/30 bg-red-500/10",
  neutral: "text-white/70 ring-white/10 bg-white/5",
};

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: Tone }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="font-mono font-bold text-2xl mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] opacity-60 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminPerformance() {
  const [snap, setSnap] = useState<PerfSnapshot>({ fps: 0, activeIntervals: 0, activeTimeouts: 0, requestsLastMinute: 0 });
  const [, force] = useState(0);

  useEffect(() => {
    startPerfMonitor();
    const unsub = subscribePerf(setSnap);
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => { unsub(); window.clearInterval(id); };
  }, []);

  const mem = getMemoryMB();
  const pageLoad = getPageLoadMs();
  const bundle = getBundleSummary();
  const channels = (supabase as any)?.realtime?.channels?.length ?? 0;

  const fpsTone: Tone = snap.fps >= 50 ? "good" : snap.fps >= 30 ? "warn" : "bad";
  const memTone: Tone = !mem ? "neutral" : mem.used / mem.limit < 0.5 ? "good" : mem.used / mem.limit < 0.8 ? "warn" : "bad";
  const loadTone: Tone = !pageLoad ? "neutral" : pageLoad < 2000 ? "good" : pageLoad < 4000 ? "warn" : "bad";
  const reqTone: Tone = snap.requestsLastMinute < 60 ? "good" : snap.requestsLastMinute < 200 ? "warn" : "bad";
  const intervalTone: Tone = snap.activeIntervals < 10 ? "good" : snap.activeIntervals < 25 ? "warn" : "bad";
  const timeoutTone: Tone = snap.activeTimeouts < 20 ? "good" : snap.activeTimeouts < 50 ? "warn" : "bad";
  const channelTone: Tone = channels < 6 ? "good" : channels < 12 ? "warn" : "bad";
  const bundleTone: Tone = bundle.totalKB < 1500 ? "good" : bundle.totalKB < 3500 ? "warn" : "bad";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Performance Monitor</h2>
        <p className="text-xs text-white/40 mt-1">Live metrics, refreshed every second.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card label="FPS" value={String(snap.fps)} sub="target ≥ 50" tone={fpsTone} />
        <Card
          label="JS Heap"
          value={mem ? `${mem.used.toFixed(0)} MB` : "n/a"}
          sub={mem ? `of ${mem.limit.toFixed(0)} MB limit` : "performance.memory unavailable"}
          tone={memTone}
        />
        <Card
          label="Page Load"
          value={pageLoad ? `${pageLoad} ms` : "n/a"}
          sub="navigation timing"
          tone={loadTone}
        />
        <Card
          label="Realtime Channels"
          value={String(channels)}
          sub="active Supabase subscriptions"
          tone={channelTone}
        />
        <Card
          label="Active Intervals"
          value={String(snap.activeIntervals)}
          sub="setInterval handles"
          tone={intervalTone}
        />
        <Card
          label="Pending Timeouts"
          value={String(snap.activeTimeouts)}
          sub="setTimeout handles"
          tone={timeoutTone}
        />
        <Card
          label="Requests / min"
          value={String(snap.requestsLastMinute)}
          sub="window.fetch over last 60s"
          tone={reqTone}
        />
        <Card
          label="Bundle Loaded"
          value={`${bundle.totalKB} KB`}
          sub={`${bundle.scripts} script resources`}
          tone={bundleTone}
        />
      </div>

      <div className="rounded-2xl ring-1 ring-white/10 bg-white/[0.02] p-4 text-[11px] text-white/50 leading-relaxed">
        Color coding: <span className="text-emerald-300">green = healthy</span>,{" "}
        <span className="text-amber-300">yellow = watch</span>,{" "}
        <span className="text-red-300">red = investigate</span>. The monitor patches global timers and{" "}
        <code>fetch</code> on first mount, so counts reflect everything since this session started.
      </div>
    </div>
  );
}
