/**
 * C7EarnWatch — frontend balance-diff detector for the C7 earn heartbeat (mechanism B).
 *
 * The earning path (provider / 2J games) settles server-side, so there is no
 * in-session settle response to read. Instead, this watches the user's C74 energy
 * balance through the EXISTING useMining refresh flow (mount + focus +
 * dtx:balance-updated) and, on a genuine INCREASE, emits c7:energy-earned with the
 * positive delta — so C7EarnBurst celebrates real earns wherever the user is.
 *
 * Never emits on decrease, no-change, initial hydration, or duplicate refreshes:
 * the reduceBalance() reducer only surfaces a delta on a true increase and otherwise
 * just re-baselines. A repeated identical balance is a no-op (React skips the effect
 * because the balance dependency is unchanged), so the same credit is never double-emitted.
 *
 * Frontend only — reads state via a display-only RPC and credits nothing.
 */
import { useEffect, useRef } from "react";
import { useMining } from "@/hooks/useMining";
import { emitEnergyEarned, reduceBalance, type EarnState } from "@/lib/c7energy";

export default function C7EarnWatch() {
  const { status } = useMining();
  const stateRef = useRef<EarnState>({ last: null });
  const balance = status?.balance;

  useEffect(() => {
    const { state, delta } = reduceBalance(stateRef.current, balance);
    stateRef.current = state;
    if (delta != null && delta > 0) {
      emitEnergyEarned({
        amount: delta,
        source: "balance",
        newBalance: typeof balance === "number" ? balance : undefined,
      });
    }
  }, [balance]);

  return null;
}
