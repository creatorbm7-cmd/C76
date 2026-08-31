import { describe, it, expect } from "vitest";
import { rankTheme } from "@/lib/c7rank";

// Phase 5.2a — rank presentation theme (pure).

describe("rankTheme (pure)", () => {
  it("maps each rank index to a distinct themed identity", () => {
    const keys = [0, 1, 2, 3].map((i) => rankTheme(i).key);
    expect(keys).toEqual(["bronze", "silver", "gold", "diamond"]);
    // each carries a title, flavour, icon, frame, glow, and chip colours
    for (const i of [0, 1, 2, 3]) {
      const t = rankTheme(i);
      expect(t.title).toMatch(/Miner$/);
      expect(t.flavor.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.frame).toContain("gradient");
      expect(t.chipBg).toContain("gradient");
      expect(t.glow).toContain("rgba");
    }
  });

  it("icons mirror the mining ladder", () => {
    expect([0, 1, 2, 3].map((i) => rankTheme(i).icon)).toEqual(["🥉", "🥈", "🥇", "💎"]);
  });

  it("clamps out-of-range / invalid indices into 0…3", () => {
    expect(rankTheme(-3).key).toBe("bronze");
    expect(rankTheme(99).key).toBe("diamond");
    expect(rankTheme(NaN).key).toBe("bronze");
    expect(rankTheme(2.9).key).toBe("gold"); // truncates toward 2
  });
});
