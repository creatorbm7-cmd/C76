/**
 * C7 energy earn-event emitter (C7 Engagement System, Phase 1.1).
 *
 * Single client-side helper that announces a C74 earn so C7EarnBurst (Phase 1.2)
 * — and, later, the C7 HUD — can react. Decoupled from any component; safe to call
 * from hooks. The event name + detail shape are the shared contract, re-exported
 * from C7EarnBurst so there is one source of truth.
 *
 * This does NOT credit anything — crediting happens server-side (energy_ledger /
 * user_energy). This only surfaces an already-credited delta to the UI.
 */
import { C7_EARN_EVENT, type C7EarnDetail } from "@/components/c7/C7EarnBurst";

export { C7_EARN_EVENT };
export type { C7EarnDetail };

export function emitEnergyEarned(detail: C7EarnDetail): void {
  if (typeof window === "undefined") return;
  const amount = Number(detail?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return; // never emit a non-earn
  window.dispatchEvent(new CustomEvent(C7_EARN_EVENT, { detail: { ...detail, amount } }));
}

/** Baseline for the balance-diff earn detector. */
export interface EarnState { last: number | null }

/**
 * Pure balance-diff reducer (mechanism B). Given the previous baseline and the
 * latest observed C74 balance, returns the next baseline and the positive delta
 * to emit (or null). Rules:
 *   - non-finite/undefined balance → no-op (keep baseline)
 *   - first observation (last === null) → seed silently, no emit (initial hydration)
 *   - increase → emit the delta, advance baseline
 *   - decrease → re-baseline silently, no emit
 *   - unchanged / duplicate refresh → no-op
 */
export function reduceBalance(
  state: EarnState,
  balance: number | null | undefined,
): { state: EarnState; delta: number | null } {
  if (typeof balance !== "number" || !Number.isFinite(balance)) return { state, delta: null };
  if (state.last === null) return { state: { last: balance }, delta: null };
  if (balance > state.last) return { state: { last: balance }, delta: balance - state.last };
  if (balance < state.last) return { state: { last: balance }, delta: null };
  return { state, delta: null };
}
