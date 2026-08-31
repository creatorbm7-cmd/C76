import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import C7EarnBurst, { C7_EARN_EVENT } from "@/components/c7/C7EarnBurst";

// Phase 1.2 — synthetic-event verification for the C7 earn-burst.
// No backend, no wiring to real earning: tests dispatch the CustomEvent directly.

const emit = (amount: unknown) =>
  act(() => {
    window.dispatchEvent(new CustomEvent(C7_EARN_EVENT, { detail: { amount } }));
  });

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("C7EarnBurst (Phase 1.2)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); cleanup(); });

  it("shows +X C74 after the aggregation window, then auto-dismisses", () => {
    render(<C7EarnBurst />);
    expect(screen.queryByRole("status")).toBeNull(); // nothing before an event

    emit(18);
    advance(399);
    expect(screen.queryByRole("status")).toBeNull(); // still inside the 400ms window

    advance(1); // commit at 400ms
    expect(screen.getByRole("status")).toHaveTextContent("+18");
    expect(screen.getByRole("status")).toHaveTextContent("C74");

    advance(1600); // auto-dismiss
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("aggregates earns arriving within ~400ms into a single +ΣX", () => {
    render(<C7EarnBurst />);
    emit(10);
    advance(150);
    emit(8); // resets the window; total should be 18
    advance(400);
    const nodes = screen.getAllByRole("status");
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toHaveTextContent("+18");
  });

  it("ignores invalid / non-positive amounts", () => {
    render(<C7EarnBurst />);
    emit(0);
    emit(-5);
    emit(NaN);
    emit("nope");
    advance(500);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("formats fractional amounts", () => {
    render(<C7EarnBurst />);
    emit(0.23);
    advance(400);
    expect(screen.getByRole("status")).toHaveTextContent("+0.23");
  });

  it("honors prefers-reduced-motion with a static chip (no animation)", () => {
    const orig = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: true, media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      const { container } = render(<C7EarnBurst />);
      emit(12);
      advance(400);
      const root = container.querySelector(".c7eb-root");
      expect(root).not.toBeNull();
      expect(root).toHaveAttribute("data-reduced", "1");
      expect(screen.getByRole("status")).toHaveTextContent("+12");
    } finally {
      window.matchMedia = orig;
    }
  });
});
