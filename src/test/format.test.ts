import { describe, it, expect } from "vitest";
import { num, usd, inr, pct } from "@/lib/format";

describe("lib/format", () => {
  it("num: en-US grouping, 0 decimals by default", () => {
    expect(num(1234567)).toBe("1,234,567");
    expect(num(1234.9)).toBe("1,235"); // rounds to 0 dp
  });

  it("num: honors max decimals", () => {
    expect(num(1234.5, { max: 2 })).toBe("1,234.5");
    expect(num(0.123456, { max: 6 })).toBe("0.123456");
  });

  it("num: en-IN lakh grouping (matches the jackpot display)", () => {
    expect(num(2000229, { locale: "en-IN" })).toBe("20,00,229");
  });

  it("num: min+max force fixed decimals", () => {
    expect(num(5, { locale: "en-IN", min: 2, max: 2 })).toBe("5.00");
  });

  it("usd: dollar prefix, up to 2 decimals", () => {
    expect(usd(1234)).toBe("$1,234");
    expect(usd(1234.5)).toBe("$1,234.5");
    expect(usd(1234, { min: 2 })).toBe("$1,234.00");
  });

  it("inr: rupee prefix with en-IN grouping", () => {
    expect(inr(123456.78)).toBe("₹1,23,456.78");
  });

  it("pct: percentage suffix", () => {
    expect(pct(12.5)).toBe("12.5%");
  });

  it("guards null / undefined to 0", () => {
    expect(num(null as unknown as number)).toBe("0");
    expect(usd(undefined as unknown as number)).toBe("$0");
  });
});
