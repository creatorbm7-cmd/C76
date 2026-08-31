import { useState, useEffect, useCallback } from "react";
import { useCountUp } from "./adminV8Kit";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";
import { TrendingUp, Users, Gamepad2, Clock, Loader2, BarChart3, Activity, Flame } from "lucide-react";

const GAME_COLORS: Record<string, string> = {
  crash: "#10B981", mines: "#F59E0B", plinko: "#3B82F6", dice: "#8B5CF6",
  coinflip: "#EC4899", limbo: "#F97316", wheel: "#06B6D4", keno: "#84CC16", hilo: "#E11D48",
};

const tooltipStyle = {
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(245,158,11,0.3)",
  borderRadius: 12,
  color: "#fff",
  backdropFilter: "blur(8px)",
  boxShadow: "0 8px 32px rgba(245,158,11,0.15)",
  fontSize: 11,
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// useCountUp is imported from ./adminV8Kit (shared count-up hook).

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [retention, setRetention] = useState<any[]>([]);
  const [gamePopularity, setGamePopularity] = useState<any[]>([]);
  const [depositFunnel, setDepositFunnel] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<number[][]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const [betsRes, profilesRes, walletsRes, depositsRes] = await Promise.all([
      supabase.from("casino_bets").select("user_id, game_type, created_at"),
      supabase.from("profiles").select("id, created_at"),
      supabase.from("casino_wallets").select("user_id, total_deposited, total_wagered"),
      supabase.from("casino_transactions").select("user_id, type, created_at").eq("type", "deposit"),
    ]);

    const bets = betsRes.data || [];
    const profiles = profilesRes.data || [];
    const wallets = walletsRes.data || [];

    const now = new Date();
    const retentionData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000);
      const dayStr = day.toISOString().slice(0, 10);
      const dayBets = bets.filter(b => (b.created_at || "").startsWith(dayStr));
      const uniquePlayers = new Set(dayBets.map(b => b.user_id)).size;
      const newUsers = profiles.filter(p => (p.created_at || "").startsWith(dayStr)).length;
      retentionData.push({ date: dayStr.slice(5), activePlayers: uniquePlayers, newUsers });
    }
    setRetention(retentionData);

    const gameCounts: Record<string, { bets: number; volume: number }> = {};
    bets.forEach(b => {
      if (!gameCounts[b.game_type]) gameCounts[b.game_type] = { bets: 0, volume: 0 };
      gameCounts[b.game_type].bets++;
    });
    setGamePopularity(
      Object.entries(gameCounts)
        .map(([game, data]) => ({ game, bets: data.bets, color: GAME_COLORS[game] || "#888" }))
        .sort((a, b) => b.bets - a.bets)
    );

    const totalUsers = profiles.length;
    const usersWithWallet = wallets.length;
    const usersWithDeposit = new Set(wallets.filter(w => (w.total_deposited || 0) > 0).map(w => w.user_id)).size;
    const usersWhoPlayed = new Set(bets.map(b => b.user_id)).size;
    setDepositFunnel([
      { stage: "Registered", value: totalUsers, fill: "#3B82F6" },
      { stage: "Wallet", value: usersWithWallet, fill: "#8B5CF6" },
      { stage: "Deposited", value: usersWithDeposit, fill: "#F59E0B" },
      { stage: "Played", value: usersWhoPlayed, fill: "#10B981" },
    ]);

    const heatData: number[][] = DAYS.map(() => Array(24).fill(0));
    bets.forEach(b => {
      if (!b.created_at) return;
      const d = new Date(b.created_at);
      const dayIndex = (d.getDay() + 6) % 7;
      heatData[dayIndex][d.getHours()]++;
    });
    setHeatmap(heatData);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-analytics-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_bets" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_wallets" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400/40" />
      </div>
    );
  }

  const maxHeat = Math.max(1, ...heatmap.flat());
  const peakHour = (() => { let mH = 0, mV = 0; heatmap.forEach(day => day.forEach((v, h) => { if (v > mV) { mV = v; mH = h; } })); return mH; })();
  const conversion = depositFunnel.length >= 4 && depositFunnel[0].value > 0
    ? (depositFunnel[3].value / depositFunnel[0].value) * 100 : 0;

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes v8-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes v8-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .v8-card { animation: v8-fade-in 0.5s ease-out backwards; }
        .v8-tilt { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .v8-tilt:hover { transform: perspective(800px) rotateX(2deg) rotateY(-2deg) translateY(-2px); }
        .v8-mono { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
      `}</style>

      {/* Hero */}
      <div className="relative rounded-2xl p-5 border overflow-hidden v8-card"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(244,63,94,0.04), rgba(255,255,255,0.3))",
          borderColor: "rgba(245,158,11,0.20)",
          boxShadow: "0 8px 32px -8px rgba(245,158,11,0.15)",
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 0 16px rgba(245,158,11,0.5)" }}>
              <BarChart3 className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300/70 font-bold">Analytics Engine</p>
              <h2 className="text-xl font-black text-white tracking-tight">Player Intelligence</h2>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: "v8-pulse 1.5s ease-in-out infinite" }} />
            LIVE STREAM
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PremiumKpi icon={<Users className="h-4 w-4" />} label="Active Today" value={retention[retention.length - 1]?.activePlayers || 0} tone="amber" delay={0} />
        <PremiumKpi icon={<Gamepad2 className="h-4 w-4" />} label="Top Game" stringValue={gamePopularity[0]?.game || "—"} tone="cyan" delay={80} />
        <PremiumKpi icon={<TrendingUp className="h-4 w-4" />} label="Funnel Conv." value={conversion} suffix="%" decimals={1} tone="emerald" delay={160} />
        <PremiumKpi icon={<Clock className="h-4 w-4" />} label="Peak Hour" stringValue={`${peakHour.toString().padStart(2, "0")}:00`} tone="rose" delay={240} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Player Retention · 7d" icon={<Activity className="h-3 w-3 text-amber-400" />} accent="amber">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={retention}>
              <defs>
                <linearGradient id="v8-active" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="v8-new" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.03)" />
              <XAxis dataKey="date" stroke="rgba(15,23,42,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(15,23,42,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="activePlayers" stroke="#fbbf24" strokeWidth={2} fill="url(#v8-active)" name="Active Players" />
              <Area type="monotone" dataKey="newUsers" stroke="#3B82F6" strokeWidth={2} fill="url(#v8-new)" name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Game Popularity" icon={<Flame className="h-3 w-3 text-rose-400" />} accent="rose">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gamePopularity} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.03)" />
              <XAxis type="number" stroke="rgba(15,23,42,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="game" stroke="rgba(15,23,42,0.4)" fontSize={10} width={60} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(245,158,11,0.05)" }} />
              <Bar dataKey="bets" radius={[0, 6, 6, 0]} name="Total Bets">
                {gamePopularity.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Deposit Funnel" icon={<TrendingUp className="h-3 w-3 text-cyan-400" />} accent="cyan">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={depositFunnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.03)" />
              <XAxis dataKey="stage" stroke="rgba(15,23,42,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(15,23,42,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(56,189,248,0.05)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Users">
                {depositFunnel.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak Hours Heatmap" icon={<Clock className="h-3 w-3 text-emerald-400" />} accent="emerald">
          <div className="overflow-x-auto">
            <div className="flex items-center mb-2 pl-10">
              {HOURS.filter(h => h % 3 === 0).map(h => (
                <div key={h} className="text-[8px] text-white/25 font-bold" style={{ width: `${100 / 8}%`, textAlign: "center" }}>
                  {h.toString().padStart(2, "0")}
                </div>
              ))}
            </div>
            <div className="space-y-[3px]">
              {DAYS.map((day, di) => (
                <div key={day} className="flex items-center gap-1">
                  <span className="text-[9px] text-white/40 w-8 text-right font-bold">{day}</span>
                  <div className="flex flex-1 gap-[1.5px]">
                    {HOURS.map(h => {
                      const val = heatmap[di]?.[h] || 0;
                      const intensity = val / maxHeat;
                      return (
                        <div key={h} className="flex-1 rounded-[3px] min-h-[16px] transition-all"
                          style={{
                            backgroundColor: intensity === 0
                              ? "rgba(15,23,42,0.02)"
                              : `hsla(45, 100%, 60%, ${0.1 + intensity * 0.85})`,
                            boxShadow: intensity > 0.6 ? `0 0 6px hsla(45, 100%, 60%, ${intensity * 0.5})` : "none",
                          }}
                          title={`${day} ${h}:00 — ${val} bets`} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-[9px] text-white/30 font-bold">Low</span>
              <div className="flex gap-[1.5px]">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                  <div key={v} className="w-3 h-3 rounded-[3px]"
                    style={{ backgroundColor: `hsla(45, 100%, 60%, ${v})`, boxShadow: v > 0.6 ? `0 0 4px hsla(45, 100%, 60%, ${v * 0.5})` : "none" }} />
                ))}
              </div>
              <span className="text-[9px] text-white/30 font-bold">High</span>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function PremiumKpi({ icon, label, value, stringValue, tone, delay, suffix = "", decimals = 0 }: any) {
  const animated = useCountUp(typeof value === "number" ? value : 0, 900);
  const toneMap: Record<string, { bg: string; ring: string; glow: string; text: string }> = {
    amber:   { bg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.04))", ring: "rgba(245,158,11,0.3)", glow: "0 8px 30px rgba(245,158,11,0.2)", text: "#fbbf24" },
    emerald: { bg: "linear-gradient(135deg, rgba(255, 201, 53,0.18), rgba(255, 201, 53,0.04))", ring: "rgba(255, 201, 53,0.3)", glow: "0 8px 30px rgba(255, 201, 53,0.2)", text: "#ffd76b" },
    rose:    { bg: "linear-gradient(135deg, rgba(244,63,94,0.18), rgba(244,63,94,0.04))",   ring: "rgba(244,63,94,0.3)",  glow: "0 8px 30px rgba(244,63,94,0.2)",  text: "#fb7185" },
    cyan:    { bg: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(56,189,248,0.04))", ring: "rgba(56,189,248,0.3)", glow: "0 8px 30px rgba(56,189,248,0.2)", text: "#38bdf8" },
  };
  const c = toneMap[tone] || toneMap.amber;
  const display = stringValue !== undefined ? stringValue :
    decimals === 0 ? Math.round(animated).toLocaleString() : animated.toFixed(decimals);
  return (
    <div className="v8-card v8-tilt rounded-2xl p-4 border relative overflow-hidden"
      style={{ background: c.bg, borderColor: c.ring, boxShadow: c.glow, animationDelay: `${delay}ms` }}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-40"
        style={{ background: `radial-gradient(circle, ${c.ring}, transparent 70%)`, transform: "translate(40%, -40%)" }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/55 font-black">{label}</div>
          <div style={{ color: c.text }}>{icon}</div>
        </div>
        <div className="text-lg md:text-xl font-black capitalize v8-mono"
          style={{ color: c.text, textShadow: `0 0 12px ${c.ring}` }}>
          {display}{suffix}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, accent, children }: any) {
  const accentMap: Record<string, string> = {
    amber: "rgba(245,158,11,0.15)",
    rose: "rgba(244,63,94,0.15)",
    cyan: "rgba(56,189,248,0.15)",
    emerald: "rgba(255, 201, 53,0.15)",
  };
  return (
    <div className="rounded-2xl border p-4 v8-card" style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))",
      borderColor: accentMap[accent] || "rgba(15,23,42,0.08)",
      backdropFilter: "blur(20px)",
      boxShadow: "inset 0 1px 0 rgba(15,23,42,0.04)",
    }}>
      <div className="flex items-center gap-1.5 mb-3">
        {icon}
        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">{title}</h3>
      </div>
      {children}
    </div>
  );
}
