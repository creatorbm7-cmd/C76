// C74 → USDT swap master gate — CONTRACT SPEC (executable).
//
// Pins the behavior of the defense-in-depth draft in
// `supabase/migrations/20260822130000_c74_swap_master_gate.sql`: the swap credits
// a WITHDRAWABLE USDT balance, so it is a money-out path that MUST fail closed
// when `is_real_money_enabled()` is false — independent of c74_swap_settings.enabled.
//
// Two layers:
//   1. Semantic contract (self-contained mirror of the gate rule).
//   2. Static assertions over the actual migration SQL, so the draft can't drift
//      away from the contract (gate present, fail-closed, ordered BEFORE any
//      balance credit or pool draw, and enable-flag alone can't bypass it).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── 1. Semantic contract ────────────────────────────────────────────────────
// The swap is money-out. It is permitted only when the master gate is ON. The
// per-feature `enabled` flag is necessary but NOT sufficient (defense in depth).
function swapAllowed(masterValue: string | null | undefined, swapEnabled: boolean): boolean {
  const masterOn = masterValue === "true"; // fail-closed: only exact 'true'
  return masterOn && swapEnabled;
}

describe("c74 swap gate — semantic contract", () => {
  it("BLOCKS the swap when master is OFF, even if c74_swap_settings.enabled=true", () => {
    expect(swapAllowed(undefined, /*enabled*/ true)).toBe(false); // audited prod state
    expect(swapAllowed("false", true)).toBe(false);
  });

  it("BLOCKS the swap when the swap flag is OFF, even if master is ON", () => {
    expect(swapAllowed("true", /*enabled*/ false)).toBe(false);
  });

  it("PERMITS the swap only when master AND swap flag are both ON", () => {
    expect(swapAllowed("true", true)).toBe(true);
  });

  it.each([undefined, null, "", "TRUE", "True", " true ", "1", "yes"])(
    "treats master value %p as OFF (fail-closed parse)",
    (v) => {
      expect(swapAllowed(v as string | null | undefined, true)).toBe(false);
    },
  );
});

// ── 2. Static assertions over the migration draft ───────────────────────────
const SQL = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260822130000_c74_swap_master_gate.sql"),
  "utf8",
);
const lc = SQL.toLowerCase();

describe("c74 swap gate — migration draft integrity", () => {
  it("replaces redeem_c74_to_usdt", () => {
    expect(lc).toContain("create or replace function public.redeem_c74_to_usdt");
  });

  it("checks the master gate and fails closed (E_REAL_MONEY_OFF)", () => {
    expect(lc).toContain("not public.is_real_money_enabled()");
    expect(SQL).toContain("E_REAL_MONEY_OFF");
  });

  it("applies the gate BEFORE any balance credit or pool draw", () => {
    const gate = lc.indexOf("is_real_money_enabled()");
    const creditProfiles = lc.indexOf("update public.profiles set balance");
    const creditWallet = lc.indexOf("update public.casino_wallets set balance");
    const poolDraw = lc.indexOf("update public.c74_swap_settings set pool_usdt");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(creditProfiles);
    expect(gate).toBeLessThan(creditWallet);
    expect(gate).toBeLessThan(poolDraw);
  });

  it("does NOT enable the swap or touch the real_money flag", () => {
    // No write that flips c74_swap_settings.enabled on.
    expect(lc).not.toContain("set enabled = true");
    expect(lc).not.toContain("enabled = true where id");
    // The master flag lives in platform_settings — the swap function must only
    // READ it via is_real_money_enabled(), never write it (no insert/update).
    expect(lc).not.toContain("update public.platform_settings");
    expect(lc).not.toContain("insert into public.platform_settings");
    // Only the read helper appears; no direct string write of the flag value.
    expect(lc).not.toContain("real_money_enabled', 'true'");
  });

  it("preserves the original caps, pool ceiling and idempotent audit rows", () => {
    expect(lc).toContain("per_user_daily_usdt");
    expect(lc).toContain("per_user_lifetime_usdt");
    expect(lc).toContain("v_usdt > s.pool_usdt");
    expect(lc).toContain("insert into public.c74_swaps");
    expect(lc).toContain("for update"); // settings-row serialization preserved
  });

  it("preserves the authenticated-only privilege posture", () => {
    expect(lc).toContain("revoke all on function public.redeem_c74_to_usdt(numeric) from public, anon");
    expect(lc).toContain("grant execute on function public.redeem_c74_to_usdt(numeric) to authenticated");
  });
});
