import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Activity } from "lucide-react";

/**
 * Certified RTP Monitor — aggregate, pooled-across-all-players Return-To-Player
 * per game. Reads the admin-only `admin_game_rtp` RPC (security definer). This is
 * monitoring ONLY: it verifies the configured house edge holds across real volume.
 * There is no per-user targeting anywhere — every player sees the same odds.
 *
 * Target RTP is the certified house config (96%). Actual RTP naturally swings on
 * low bet counts (variance) and converges toward target as volume grows.
 */
const TARGET_RTP = 96; // certified house config (%) — same for all players

type Row = {
  game_type: string;
  bets: number;
  players: number;
  total_wagered: number;
  total_paid_out: number;
  actual_rtp_pct: number | null;
  house_edge_pct: number | null;
  last_bet: string | null;
};

// Colour by how far actual RTP sits from target, scaled by sample size so we
// don't scream "red" on 40 bets of pure variance.
function rtpTone(rtp: number | null, bets: number): string {
  if (rtp == null) return "text-white/40";
  const drift = Math.abs(rtp - TARGET_RTP);
  const tol = bets >= 2000 ? 3 : bets >= 500 ? 6 : 15; // wider tolerance on small samples
  if (drift <= tol) return "text-emerald-400";
  if (drift <= tol * 2) return "text-amber-400";
  return "text-rose-400";
}

export default function AdminRtpMonitor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_game_rtp", { p_days: days });
    if (!error && Array.isArray(data)) setRows(data as Row[]);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const tot = rows.reduce(
    (a, r) => ({ w: a.w + Number(r.total_wagered || 0), p: a.p + Number(r.total_paid_out || 0), b: a.b + Number(r.bets || 0) }),
    { w: 0, p: 0, b: 0 },
  );
  const overallRtp = tot.w > 0 ? (100 * tot.p) / tot.w : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          <span className="font-semibold text-sm">Certified RTP Monitor</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-0.5">
            target {TARGET_RTP}% · same for all players
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days ?? "all"}
            onChange={(e) => setDays(e.target.value === "all" ? null : Number(e.target.value))}
            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white"
          >
            <option value="all">All time</option>
            <option value="30">Last 30d</option>
            <option value="7">Last 7d</option>
            <option value="1">Last 24h</option>
          </select>
          <button onClick={load} className="p-1.5 rounded border border-white/10 hover:bg-white/5" aria-label="Refresh">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {overallRtp != null && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs">
          <span className="text-white/50">Overall pooled RTP: <b className={rtpTone(overallRtp, tot.b)}>{overallRtp.toFixed(2)}%</b></span>
          <span className="text-white/50">House edge: <b className="text-white/80">{(100 - overallRtp).toFixed(2)}%</b></span>
          <span className="text-white/50">Wagered: <b className="text-white/80">{tot.w.toFixed(0)}</b></span>
          <span className="text-white/50">Bets: <b className="text-white/80">{tot.b}</b></span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 text-left border-b border-white/10">
              <th className="py-2 pr-3 font-medium">Game</th>
              <th className="py-2 px-3 font-medium text-right">Bets</th>
              <th className="py-2 px-3 font-medium text-right">Players</th>
              <th className="py-2 px-3 font-medium text-right">Wagered</th>
              <th className="py-2 px-3 font-medium text-right">Paid out</th>
              <th className="py-2 px-3 font-medium text-right">Actual RTP</th>
              <th className="py-2 pl-3 font-medium text-right">Edge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.game_type} className="border-b border-white/5">
                <td className="py-2 pr-3 capitalize font-medium">{r.game_type}</td>
                <td className="py-2 px-3 text-right text-white/70">{r.bets}</td>
                <td className="py-2 px-3 text-right text-white/70">{r.players}</td>
                <td className="py-2 px-3 text-right text-white/70">{Number(r.total_wagered || 0).toFixed(0)}</td>
                <td className="py-2 px-3 text-right text-white/70">{Number(r.total_paid_out || 0).toFixed(0)}</td>
                <td className={`py-2 px-3 text-right font-semibold ${rtpTone(r.actual_rtp_pct, r.bets)}`}>
                  {r.actual_rtp_pct == null ? "—" : `${r.actual_rtp_pct}%`}
                </td>
                <td className="py-2 pl-3 text-right text-white/70">
                  {r.house_edge_pct == null ? "—" : `${r.house_edge_pct}%`}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-white/40">No bet data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-white/30 leading-relaxed">
        Pooled across all players — no per-user data. Small samples swing on variance and converge to the {TARGET_RTP}% target as volume grows.
        Green = within tolerance for the sample size, amber = drifting, rose = investigate the paytable.
      </p>
    </div>
  );
}
