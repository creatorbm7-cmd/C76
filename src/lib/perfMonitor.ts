// Lightweight global perf monitor: FPS, timer counts, network counts.
// Patches setInterval/setTimeout/clearInterval/clearTimeout and fetch to track usage.

type Listener = (s: PerfSnapshot) => void;

export interface PerfSnapshot {
  fps: number;
  activeIntervals: number;
  activeTimeouts: number;
  requestsLastMinute: number;
}

const state = {
  fps: 0,
  frames: 0,
  lastSampleTs: performance.now(),
  activeIntervals: new Set<number>(),
  activeTimeouts: new Set<number>(),
  requestTimestamps: [] as number[],
  listeners: new Set<Listener>(),
  started: false,
};

function notify() {
  const snap: PerfSnapshot = {
    fps: state.fps,
    activeIntervals: state.activeIntervals.size,
    activeTimeouts: state.activeTimeouts.size,
    requestsLastMinute: state.requestTimestamps.length,
  };
  state.listeners.forEach((l) => l(snap));
}

export function startPerfMonitor() {
  if (state.started || typeof window === "undefined") return;
  state.started = true;

  // FPS loop
  const tick = (t: number) => {
    state.frames++;
    const elapsed = t - state.lastSampleTs;
    if (elapsed >= 1000) {
      state.fps = Math.round((state.frames * 1000) / elapsed);
      state.frames = 0;
      state.lastSampleTs = t;
      // prune request timestamps > 60s
      const cutoff = Date.now() - 60_000;
      state.requestTimestamps = state.requestTimestamps.filter((ts) => ts >= cutoff);
      notify();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Patch timers
  const origSetInterval = window.setInterval.bind(window);
  const origClearInterval = window.clearInterval.bind(window);
  const origSetTimeout = window.setTimeout.bind(window);
  const origClearTimeout = window.clearTimeout.bind(window);

  (window as any).setInterval = ((handler: any, timeout?: number, ...args: any[]) => {
    const id = origSetInterval(handler, timeout, ...args);
    state.activeIntervals.add(id as unknown as number);
    return id;
  }) as typeof window.setInterval;

  (window as any).clearInterval = ((id?: number) => {
    if (id != null) state.activeIntervals.delete(id);
    return origClearInterval(id as any);
  }) as typeof window.clearInterval;

  (window as any).setTimeout = ((handler: any, timeout?: number, ...args: any[]) => {
    const id = origSetTimeout((...a: any[]) => {
      state.activeTimeouts.delete(id as unknown as number);
      if (typeof handler === "function") handler(...a);
    }, timeout, ...args);
    state.activeTimeouts.add(id as unknown as number);
    return id;
  }) as typeof window.setTimeout;

  (window as any).clearTimeout = ((id?: number) => {
    if (id != null) state.activeTimeouts.delete(id);
    return origClearTimeout(id as any);
  }) as typeof window.clearTimeout;

  // Patch fetch
  const origFetch = window.fetch.bind(window);
  window.fetch = ((...args: Parameters<typeof fetch>) => {
    state.requestTimestamps.push(Date.now());
    return origFetch(...args);
  }) as typeof window.fetch;
}

export function subscribePerf(l: Listener) {
  state.listeners.add(l);
  return () => state.listeners.delete(l);
}

export function getMemoryMB(): { used: number; total: number; limit: number } | null {
  const m = (performance as any).memory;
  if (!m) return null;
  const MB = 1024 * 1024;
  return {
    used: m.usedJSHeapSize / MB,
    total: m.totalJSHeapSize / MB,
    limit: m.jsHeapSizeLimit / MB,
  };
}

export function getPageLoadMs(): number | null {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;
  return Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd || 0);
}

export function getRealtimeChannelCount(): number {
  try {
    // Best-effort: read supabase realtime channels without hard import to avoid cycles
    const w = window as any;
    const sb = w.__supabase_client__;
    if (sb?.realtime?.channels) return sb.realtime.channels.length;
  } catch {}
  return 0;
}

export function getBundleSummary(): { scripts: number; totalKB: number } {
  const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const scripts = res.filter((r) => r.initiatorType === "script" || r.name.endsWith(".js"));
  const totalKB = Math.round(
    scripts.reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0) / 1024,
  );
  return { scripts: scripts.length, totalKB };
}
