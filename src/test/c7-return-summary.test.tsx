import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { summarizeReturn, type LaunchMarker } from "@/lib/c7launch";

// Phase 3.2 — return/victory summary.

const NOW = 1_000_000_000;
const marker = (over: Partial<LaunchMarker> = {}): LaunchMarker =>
  ({ game: "Dragon", energy: 100, streak: 2, rankIdx: 1, ts: NOW, ...over });
const cur = (over: Partial<{ ready: boolean; energy: number; streak: number; rankIdx: number }> = {}) =>
  ({ ready: true, energy: 118, streak: 3, rankIdx: 2, ...over });

describe("summarizeReturn (pure)", () => {
  it("null when there is no marker", () => {
    expect(summarizeReturn(null, NOW, cur())).toBeNull();
  });
  it("null while data not ready (wait)", () => {
    expect(summarizeReturn(marker(), NOW, cur({ ready: false }))).toBeNull();
  });
  it("null when the marker is stale (>30m)", () => {
    expect(summarizeReturn(marker(), NOW + 31 * 60 * 1000, cur())).toBeNull();
  });
  it("null when energy did not increase", () => {
    expect(summarizeReturn(marker({ energy: 118 }), NOW, cur({ energy: 118 }))).toBeNull();
    expect(summarizeReturn(marker({ energy: 130 }), NOW, cur({ energy: 118 }))).toBeNull(); // decrease
  });
  it("computes earned + streak + rank-up on a real gain", () => {
    const s = summarizeReturn(marker(), NOW + 60_000, cur());
    expect(s).toEqual({ game: "Dragon", earned: 18, streakDelta: 1, rankUp: true });
  });
  it("no rank-up / no streak delta when unchanged", () => {
    const s = summarizeReturn(marker({ streak: 3, rankIdx: 2 }), NOW, cur({ streak: 3, rankIdx: 2 }));
    expect(s).toMatchObject({ earned: 18, streakDelta: 0, rankUp: false });
  });
});

// ── Component: driven via a mocked pulse + real localStorage marker ──
const h = vi.hoisted(() => ({ status: null as Record<string, unknown> | null }));
vi.mock("@/hooks/useMining", () => ({
  useMining: () => ({ status: h.status, loading: false, reload: () => {} }),
  MINING_LEVELS: [],
}));
import C7ReturnSummary from "@/components/c7/C7ReturnSummary";

const setMarker = (m: LaunchMarker) => localStorage.setItem("c7:game-launch", JSON.stringify(m));

describe("C7ReturnSummary (component)", () => {
  beforeEach(() => { localStorage.clear(); h.status = null; });
  afterEach(() => cleanup());

  it("shows nothing when there is no marker", () => {
    h.status = { balance: 500, level_idx: 2, level_name: "Gold Miner", level_icon: "🥇", streak_days: 3, vip_mult: 1.5, lifetime: 12000 };
    render(<C7ReturnSummary />);
    expect(screen.queryByText("Victory!")).toBeNull();
  });

  it("shows the victory card with the session gain, then dismisses + clears the marker", () => {
    setMarker({ game: "Dragon Fortune", energy: 482, streak: 2, rankIdx: 1, ts: Date.now() });
    h.status = { balance: 500, level_idx: 2, level_name: "Gold Miner", level_icon: "🥇", level_next_at: 50000, streak_days: 3, vip_mult: 1.5, lifetime: 12000 };
    render(<C7ReturnSummary />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Victory!");
    expect(dialog).toHaveTextContent("Dragon Fortune");
    expect(dialog).toHaveTextContent("+18");                    // 500 - 482
    expect(dialog).toHaveTextContent("RANK UP");                // rankIdx 1 → level_idx 2 = rank up
    expect(dialog).toHaveTextContent("38,000");                 // 50000 - 12000 → C74 to next rank
    expect(dialog).toHaveTextContent("C74 to");
    expect(localStorage.getItem("c7:game-launch")).toBeNull();  // resolved/cleared
    fireEvent.click(screen.getByText("Keep playing →"));
    expect(screen.queryByText("Victory!")).toBeNull();
  });

  it("shows nothing (but clears the marker) when there was no gain", () => {
    setMarker({ game: "Dragon", energy: 500, streak: 2, rankIdx: 1, ts: Date.now() });
    h.status = { balance: 500, level_idx: 1, level_name: "Silver Miner", level_icon: "🥈", streak_days: 2, vip_mult: 1.25, lifetime: 3000 };
    render(<C7ReturnSummary />);
    expect(screen.queryByText("Victory!")).toBeNull();
    expect(localStorage.getItem("c7:game-launch")).toBeNull();
  });
});
