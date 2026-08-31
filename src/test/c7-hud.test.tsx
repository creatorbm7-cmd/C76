import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Phase 2 — persistent C7 HUD + useC7Pulse read-model.
// Drive the underlying useMining status via a hoisted mock.

const h = vi.hoisted(() => ({ status: null as Record<string, unknown> | null }));
vi.mock("@/hooks/useMining", () => ({
  useMining: () => ({ status: h.status, loading: false, reload: () => {} }),
  MINING_LEVELS: [],
}));

import { useC7Pulse, computeRankProgress } from "@/hooks/useC7Pulse";
import C7Hud from "@/components/c7/C7Hud";

const LEVELS = [
  { name: "Bronze Miner", icon: "🥉", at: 0 },
  { name: "Silver Miner", icon: "🥈", at: 2500 },
  { name: "Gold Miner", icon: "🥇", at: 10000 },
  { name: "Diamond Miner", icon: "💎", at: 50000 },
];

const GOLD = {
  balance: 1206, level_idx: 2, level_name: "Gold Miner", level_icon: "🥇",
  level_next_at: 50000, streak_days: 3, vip_mult: 1.5, lifetime: 12000,
};

const renderHud = (path = "/v3") =>
  render(<MemoryRouter initialEntries={[path]}><C7Hud /></MemoryRouter>);

afterEach(() => { cleanup(); h.status = null; });

describe("useC7Pulse", () => {
  it("ready=false and safe defaults when no status", () => {
    h.status = null;
    const { result } = renderHook(() => useC7Pulse());
    expect(result.current.ready).toBe(false);
    expect(result.current.energy).toBe(0);
    expect(result.current.rank.name).toBe("Bronze Miner");
    expect(result.current.vipMult).toBe(1);
  });

  it("maps mining status → pulse shape", () => {
    h.status = GOLD;
    const { result } = renderHook(() => useC7Pulse());
    expect(result.current.ready).toBe(true);
    expect(result.current.energy).toBe(1206);
    expect(result.current.rank).toMatchObject({ idx: 2, name: "Gold Miner", icon: "🥇", nextAt: 50000 });
    expect(result.current.streak).toBe(3);
    expect(result.current.vipMult).toBe(1.5);
  });
});

describe("computeRankProgress (pure)", () => {
  it("mid-rank: pct + toNext + next label derived from lifetime & nextAt", () => {
    const r = computeRankProgress(2, 12000, 50000, LEVELS);   // (12000-10000)/(50000-10000)=5%
    expect(r.isMax).toBe(false);
    expect(Math.round(r.pct)).toBe(5);
    expect(r.toNext).toBe(38000);
    expect(r).toMatchObject({ nextName: "Diamond Miner", nextIcon: "💎" });
  });
  it("max rank: nextAt null → isMax, no toNext / next label", () => {
    expect(computeRankProgress(3, 60000, null, LEVELS))
      .toEqual({ pct: 100, toNext: null, nextName: null, nextIcon: null, isMax: true });
  });
  it("clamps pct to 0..100 and floors toNext at 0", () => {
    expect(computeRankProgress(0, -50, 2500, LEVELS).pct).toBe(0);
    const over = computeRankProgress(1, 999999, 10000, LEVELS);
    expect(over.pct).toBe(100);
    expect(over.toNext).toBe(0);
  });
  it("robust to an empty ladder (thisAt→0, next label→null)", () => {
    const r = computeRankProgress(2, 12000, 50000, []);
    expect(r.isMax).toBe(false);
    expect(r.toNext).toBe(38000);
    expect(r.nextName).toBeNull();
  });
});

describe("C7Hud", () => {
  it("hidden until data has loaded (unauthenticated)", () => {
    h.status = null;
    renderHud("/v3");
    expect(screen.queryByTestId("c7-hud")).toBeNull();
  });

  it("hidden on /admin and /login even when ready", () => {
    h.status = GOLD;
    const { unmount } = renderHud("/admin/live");
    expect(screen.queryByTestId("c7-hud")).toBeNull();
    unmount();
    renderHud("/login");
    expect(screen.queryByTestId("c7-hud")).toBeNull();
  });

  it("shows the collapsed pill (energy + rank) when ready", () => {
    h.status = GOLD;
    renderHud("/v3");
    expect(screen.getByTestId("c7-hud")).toBeTruthy();
    expect(screen.getByLabelText("C7 stats")).toHaveTextContent("1,206");
    // panel collapsed by default
    expect(screen.queryByText("C74 Energy")).toBeNull();
  });

  it("expands to the full chip row on tap, then collapses", () => {
    h.status = GOLD;
    renderHud("/v3");
    fireEvent.click(screen.getByLabelText("C7 stats"));
    expect(screen.getByText("C74 Energy")).toBeTruthy();
    expect(screen.getByText("Gold Miner")).toBeTruthy();
    expect(screen.getByText("Streak")).toBeTruthy();
    expect(screen.getByText("×1.50")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("C7 stats"));
    expect(screen.queryByText("C74 Energy")).toBeNull();
  });

  it("shows rank progress toward the next rank when expanded", () => {
    h.status = GOLD;                                    // nextAt 50000 → not max
    renderHud("/v3");
    fireEvent.click(screen.getByLabelText("C7 stats"));
    expect(screen.getByText(/to next rank/i)).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });
});
