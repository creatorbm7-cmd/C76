import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type DisplayCurrency = "USDT" | "INR";
export const USDT_INR_RATE = 83;

interface Ctx {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  format: (usdt: number) => string;
  symbol: string;
}

const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() => {
    if (typeof window === "undefined") return "USDT";
    return (localStorage.getItem("dtx-display-currency") as DisplayCurrency) || "USDT";
  });

  const setCurrency = (c: DisplayCurrency) => {
    setCurrencyState(c);
    try { localStorage.setItem("dtx-display-currency", c); } catch {}
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dtx-display-currency" && e.newValue) {
        setCurrencyState(e.newValue as DisplayCurrency);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const format = (usdt: number) => {
    if (currency === "INR") {
      const inr = usdt * USDT_INR_RATE;
      return inr.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    }
    return usdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <CurrencyCtx.Provider value={{ currency, setCurrency, format, symbol: currency === "INR" ? "₹" : "$" }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useDisplayCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) {
    // Safe fallback when provider not mounted
    return {
      currency: "USDT" as DisplayCurrency,
      setCurrency: () => {},
      symbol: "$",
      format: (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }
  return ctx;
}

export function CurrencyToggle({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useDisplayCurrency();
  return (
    <div className={`inline-flex rounded-full bg-dtx-bg/60 ring-1 ring-dtx-gold/30 p-0.5 ${className}`}>
      {(["USDT", "INR"] as const).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
            currency === c
              ? "bg-[image:var(--dtx-gradient-gold)] text-dtx-bg shadow-[0_0_12px_hsl(var(--dtx-gold)/0.6)]"
              : "text-dtx-muted hover:text-dtx-text"
          }`}
          aria-pressed={currency === c}
        >
          {c === "INR" ? "₹ INR" : "$ USDT"}
        </button>
      ))}
    </div>
  );
}
