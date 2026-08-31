interface Tab<T extends string> {
  id: T;
  label: string;
  count?: number | null;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
}

export default function SegmentedTabs<T extends string>({ tabs, value, onChange, size = "md" }: Props<T>) {
  return (
    <div className="px-4">
      <div
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar"
        style={{
          background: "hsl(var(--dtx-panel) / 0.5)",
          border: "1px solid hsl(var(--dtx-border) / 0.2)",
        }}
        role="tablist"
      >
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={`shrink-0 rounded-xl font-bold uppercase tracking-wider transition-all ${
                size === "sm" ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-[11px]"
              }`}
              style={
                active
                  ? {
                      background: "var(--dtx-gradient-cta)",
                      color: "hsl(var(--dtx-bg))",
                      boxShadow: "0 4px 12px hsl(var(--dtx-mint) / 0.35)",
                    }
                  : { color: "hsl(var(--dtx-muted))", background: "transparent" }
              }
            >
              {t.label}
              {t.count != null && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center text-[9px] font-black px-1.5 rounded-full"
                  style={{
                    background: active ? "rgba(0,0,0,0.18)" : "hsl(var(--dtx-mint) / 0.18)",
                    color: active ? "hsl(var(--dtx-bg))" : "hsl(var(--dtx-mint))",
                    minWidth: 16,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
