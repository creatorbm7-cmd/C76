/**
 * useC7Pulse — the C7 Engagement read-model (spec §2.1).
 *
 * A single hook that aggregates the player's C7-progression state so every
 * surface (the C7 HUD now; more later) reads the SAME shape. v1 exposes the
 * fields available today from useMining (energy, rank, streak, VIP multiplier);
 * mission / gullak / wheel / leaderboard chips are added as their read sources
 * are exposed. Pure read — never writes, never credits.
 */
import { useMining, MINING_LEVELS } from "./useMining";

export interface RankProgress {
  pct: number;             // 0…100 progress from the current rank's floor toward the next
  toNext: number | null;   // C74 (lifetime) remaining to the next rank; null at max rank
  nextName: string | null; // next rank's name; null at max rank
  nextIcon: string | null; // next rank's icon; null at max rank
  isMax: boolean;          // true once there is no higher rank (Diamond)
}

export interface C7Pulse {
  /** True once the mining status has loaded at least once (i.e. authenticated + available). */
  ready: boolean;
  energy: number;                                                   // live C74 balance
  rank: { idx: number; name: string; icon: string; nextAt: number | null };
  rankProgress: RankProgress;                                       // derived progress toward next rank
  streak: number;                                                   // consecutive-day mining streak
  vipMult: number;                                                  // VIP multiplier (1.0 … 2.0)
  lifetime: number;                                                 // lifetime mined (rank progress)
}

/**
 * Pure derivation of rank progress from the data useC7Pulse already exposes —
 * the current rank index, lifetime mined, and the next-rank threshold. Uses the
 * existing MINING_LEVELS ladder for the current rank's floor + the next rank's
 * label; no new fetch, no economics. Robust to an empty/short ladder.
 */
export function computeRankProgress(
  idx: number,
  lifetime: number,
  nextAt: number | null,
  levels: ReadonlyArray<{ name: string; icon: string; at: number }> = MINING_LEVELS,
): RankProgress {
  if (nextAt == null) return { pct: 100, toNext: null, nextName: null, nextIcon: null, isMax: true };
  const thisAt = levels[idx]?.at ?? 0;
  const span = nextAt - thisAt;
  const pct = span > 0 ? Math.max(0, Math.min(100, ((lifetime - thisAt) / span) * 100)) : 0;
  const next = levels[idx + 1];
  return {
    pct,
    toNext: Math.max(0, nextAt - lifetime),
    nextName: next?.name ?? null,
    nextIcon: next?.icon ?? null,
    isMax: false,
  };
}

export function useC7Pulse(): C7Pulse {
  const { status } = useMining();
  const idx = status?.level_idx ?? 0;
  const lifetime = status?.lifetime ?? 0;
  const nextAt = status?.level_next_at ?? null;
  return {
    ready: status != null,
    energy: status?.balance ?? 0,
    rank: {
      idx,
      name: status?.level_name ?? "Bronze Miner",
      icon: status?.level_icon ?? "🥉",
      nextAt,
    },
    rankProgress: computeRankProgress(idx, lifetime, nextAt),
    streak: status?.streak_days ?? 0,
    vipMult: status?.vip_mult ?? 1,
    lifetime,
  };
}
