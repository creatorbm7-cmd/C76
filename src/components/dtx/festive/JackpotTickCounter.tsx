import { useEffect, useState } from "react";

/** Cosmetic jackpot ticker: starts from `seed` and bumps every 3s by a small random amount. */
export default function JackpotTickCounter({ seed = 124350.42, label = "Jackpot" }: { seed?: number; label?: string }) {
  const [val, setVal] = useState(seed);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVal(v => v + Math.random() * 12 + 0.5);
      setPulse(p => p + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-card flex items-center gap-3 px-4 py-3">
      <span className="text-2xl">💰</span>
      <div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--c-muted)" }}>{label}</div>
        <div key={pulse} className="tick-num shimmer-text font-mono font-extrabold text-xl">
          ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
