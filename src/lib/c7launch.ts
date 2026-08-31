/**
 * C7 game launch marker + return summary (Engagement System, Phase 3.2).
 *
 * Provider/2J games launch via a TOP-LEVEL redirect away from our app, so we can't
 * observe the round in-session. Before redirecting we persist a small marker (game
 * name + a snapshot of the player's C74 energy + streak/rank + timestamp). On the
 * next app load we compare against the fresh pulse and, if energy went UP during the
 * session, show a "welcome back" victory summary. Pure functions here; the component
 * wires them. localStorage only — no backend, no credit.
 */
export interface LaunchMarker {
  game: string;
  energy: number;
  streak: number;
  rankIdx: number;
  ts: number;
}

export interface ReturnSummary {
  game: string;
  earned: number;
  streakDelta: number;
  rankUp: boolean;
}

const KEY = "c7:game-launch";
const TTL_MS = 30 * 60 * 1000; // markers older than 30 min are ignored

export function writeLaunchMarker(m: LaunchMarker): void {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}

export function readLaunchMarker(): LaunchMarker | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as LaunchMarker;
    if (!m || typeof m.ts !== "number" || typeof m.energy !== "number") return null;
    return m;
  } catch { return null; }
}

export function clearLaunchMarker(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

/**
 * Pure summary: given a marker and the CURRENT (fresh) pulse, compute the session
 * summary — or null if there is nothing to show (no marker, data not ready yet,
 * marker stale, or no positive energy gain).
 */
export function summarizeReturn(
  marker: LaunchMarker | null,
  now: number,
  current: { ready: boolean; energy: number; streak: number; rankIdx: number },
): ReturnSummary | null {
  if (!marker) return null;
  if (!current.ready) return null;               // wait for fresh data before deciding
  if (now - marker.ts > TTL_MS) return null;     // stale → ignore
  const earned = current.energy - marker.energy;
  if (!(earned > 0)) return null;                // no earn → no summary
  return {
    game: marker.game,
    earned,
    streakDelta: Math.max(0, current.streak - marker.streak),
    rankUp: current.rankIdx > marker.rankIdx,
  };
}
