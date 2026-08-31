import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { reduceBalance, C7_EARN_EVENT } from "@/lib/c7energy";

// Phase 1.1 (mechanism B) — frontend balance-diff earn detection.

// ── Pure reducer: increase / unchanged / decrease / initial load / duplicate ──
describe("reduceBalance (balance-diff core)", () => {
  it("initial load seeds silently (no emit)", () => {
    const r = reduceBalance({ last: null }, 100);
    expect(r.delta).toBeNull();
    expect(r.state.last).toBe(100);
  });

  it("increase surfaces the exact positive delta", () => {
    const r = reduceBalance({ last: 100 }, 118);
    expect(r.delta).toBe(18);
    expect(r.state.last).toBe(118);
  });

  it("unchanged / duplicate refresh does not emit", () => {
    const r = reduceBalance({ last: 100 }, 100);
    expect(r.delta).toBeNull();
    expect(r.state.last).toBe(100);
  });

  it("decrease re-baselines without emitting", () => {
    const r = reduceBalance({ last: 100 }, 80);
    expect(r.delta).toBeNull();
    expect(r.state.last).toBe(80);
  });

  it("ignores non-finite / undefined balances (keeps baseline)", () => {
    expect(reduceBalance({ last: 100 }, undefined).delta).toBeNull();
    expect(reduceBalance({ last: 100 }, NaN).delta).toBeNull();
    expect(reduceBalance({ last: 100 }, undefined).state.last).toBe(100);
  });

  it("handles fractional deltas", () => {
    expect(reduceBalance({ last: 10 }, 10.23).delta).toBeCloseTo(0.23, 5);
  });
});

// ── Component: drive the useMining balance and assert emitted earns ──
const h = vi.hoisted(() => ({ balance: null as number | null }));
vi.mock("@/hooks/useMining", () => ({
  useMining: () => ({
    status: h.balance == null ? null : { balance: h.balance },
    loading: false,
    reload: () => {},
  }),
  MINING_LEVELS: [],
}));

// Imported after the mock is declared (vi.mock is hoisted).
import C7EarnWatch from "@/components/c7/C7EarnWatch";

describe("C7EarnWatch (component)", () => {
  let earns: number[];
  const onEarn = (e: Event) => { earns.push((e as CustomEvent).detail.amount); };

  beforeEach(() => {
    earns = [];
    h.balance = null;
    window.addEventListener(C7_EARN_EVENT, onEarn as EventListener);
  });
  afterEach(() => {
    window.removeEventListener(C7_EARN_EVENT, onEarn as EventListener);
    cleanup();
  });

  it("no emit on initial hydration", () => {
    h.balance = 100;
    render(<C7EarnWatch />);
    expect(earns).toEqual([]);
  });

  it("emits once per real credit; ignores duplicate + decrease; rapid multiple earns", () => {
    h.balance = 100;
    const { rerender } = render(<C7EarnWatch />); // seed, no emit

    h.balance = 110; rerender(<C7EarnWatch />);   // +10
    h.balance = 130; rerender(<C7EarnWatch />);   // +20 (rapid second earn)
    h.balance = 130; rerender(<C7EarnWatch />);   // duplicate refresh → no emit
    h.balance = 90;  rerender(<C7EarnWatch />);   // decrease → no emit, re-baseline to 90
    h.balance = 95;  rerender(<C7EarnWatch />);   // +5 from the new 90 baseline

    expect(earns).toEqual([10, 20, 5]);
  });

  it("does not double-emit when the same higher balance is re-observed", () => {
    h.balance = 50;
    const { rerender } = render(<C7EarnWatch />); // seed
    h.balance = 68; rerender(<C7EarnWatch />);    // +18
    h.balance = 68; rerender(<C7EarnWatch />);    // same → no re-emit
    h.balance = 68; rerender(<C7EarnWatch />);    // same → no re-emit
    expect(earns).toEqual([18]);
  });
});
