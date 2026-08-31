import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function WagerVolumeChart({ data }: { data: { label: string; volume: number }[] }) {
  return (
    <div className="adm-glass rounded-2xl p-4 h-[280px]">
      <header className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white/90">Wager Volume · 60m</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">USDT</span>
      </header>
      <ResponsiveContainer width="100%" height="86%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="emerald" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(245 70% 55%)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="hsl(245 70% 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} interval={9} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: "rgba(8,12,20,0.95)", border: "1px solid rgba(255, 201, 53,0.3)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Area type="monotone" dataKey="volume" stroke="hsl(245 70% 65%)" strokeWidth={2} fill="url(#emerald)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
