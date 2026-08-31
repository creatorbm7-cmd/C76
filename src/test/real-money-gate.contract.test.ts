// Real-Money Master Gate — CONTRACT SPEC (executable).
//
// This is a DESIGN/REVIEW artifact for the unified `real_money_enabled` master
// gate (see docs/REAL-MONEY-MASTER-GATE-DESIGN.md and
// docs/REAL-MONEY-MASTER-GATE-CODEPATHS.md). It defines the behavior the real
// implementation (a fail-closed DB helper is_real_money_enabled() + wiring into
// the deposit-credit / payout / swap paths) MUST satisfy.
//
// It is intentionally SELF-CONTAINED: the reference predicate below mirrors the
// proposed DB helper's semantics but imports no production code and changes no
// money path. Nothing here enables real money or alters behavior — it only
// pins the contract so a future implementation can be checked against it.
import { describe, it, expect } from "vitest";

// ── Reference implementation of the gate semantics (mirror of the future
//    fail-closed helper: `coalesce(value = 'true', false)`). ──────────────
function isRealMoneyEnabled(value: string | null | undefined): boolean {
  // Fail-closed: ONLY the exact string 'true' turns real money on.
  return value === "true";
}

type Direction = "money_in" | "money_out" | "read_only";

// A money action is permitted only when the master gate is ON *and* that
// rail's own flag is ON (defense in depth). Read-only is always permitted.
function gateAllows(dir: Direction, masterValue: string | null | undefined, railOn: boolean): boolean {
  if (dir === "read_only") return true;
  return isRealMoneyEnabled(masterValue) && railOn;
}

describe("real-money master gate — fail-closed parse", () => {
  it("treats only the exact string 'true' as ON", () => {
    expect(isRealMoneyEnabled("true")).toBe(true);
  });

  it.each([undefined, null, "", "false", "FALSE", "True", "TRUE", "0", "1", "yes", "on", " true "])(
    "treats %p as OFF",
    (v) => {
      expect(isRealMoneyEnabled(v as string | null | undefined)).toBe(false);
    },
  );

  it("treats an absent key (undefined) as OFF — matches DB coalesce(...,false)", () => {
    expect(isRealMoneyEnabled(undefined)).toBe(false);
  });
});

describe("real-money master gate — enforcement matrix", () => {
  it("BLOCKS money-in when master is OFF, regardless of the deposit rail flag", () => {
    expect(gateAllows("money_in", undefined, /*railOn*/ true)).toBe(false);
    expect(gateAllows("money_in", "false", true)).toBe(false);
  });

  it("BLOCKS money-out when master is OFF, regardless of auto_payout_enabled", () => {
    expect(gateAllows("money_out", undefined, /*railOn*/ true)).toBe(false);
    expect(gateAllows("money_out", "false", true)).toBe(false);
  });

  it("still requires the rail flag when master is ON (defense in depth)", () => {
    expect(gateAllows("money_in", "true", /*railOn*/ false)).toBe(false);
    expect(gateAllows("money_out", "true", /*railOn*/ false)).toBe(false);
    expect(gateAllows("money_in", "true", /*railOn*/ true)).toBe(true);
    expect(gateAllows("money_out", "true", /*railOn*/ true)).toBe(true);
  });

  it("ALWAYS allows read-only paths (reporting / reconciliation), both states", () => {
    expect(gateAllows("read_only", undefined, false)).toBe(true);
    expect(gateAllows("read_only", "true", true)).toBe(true);
  });
});

describe("real-money master gate — current production posture (documented expectation)", () => {
  // Snapshot of the audited state: the master key is ABSENT ⇒ OFF, so every
  // money action must be blocked at the gate even though inbound rails are
  // configured live. This encodes the audit conclusion as an assertion.
  const auditedMasterValue = undefined; // key absent in platform_settings

  it("with the key absent, no money-in or money-out is permitted at the gate", () => {
    expect(gateAllows("money_in", auditedMasterValue, true)).toBe(false);
    expect(gateAllows("money_out", auditedMasterValue, true)).toBe(false);
  });
});
