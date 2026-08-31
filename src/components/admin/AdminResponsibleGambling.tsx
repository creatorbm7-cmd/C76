// Responsible Gambling — admin oversight (parallel to the player surface).
// Read-only view of players' self-set deposit limits + self-exclusions,
// via admin_list_responsible_gambling(). Players configure these themselves
// at /responsible; admins monitor for safer-gambling compliance.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, ShieldAlert, Clock, Wallet } from "lucide-react";

interface Row {
  user_id: string;
  daily_deposit_limit: number | null;
  self_excluded_until: string | null;
  updated_at: string;
}

export default function AdminResponsibleGambling() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "excluded" | "limited">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_responsible_gambling");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-rg")
      .on("postgres_changes", { event: "*", schema: "public", table: "responsible_gambling" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const now = Date.now();
  const isExcluded = (r: Row) => r.self_excluded_until != null && new Date(r.self_excluded_until).getTime() > now;

  const filtered = useMemo(() => items.filter(r =>
    filter === "all" ? true : filter === "excluded" ? isExcluded(r) : (r.daily_deposit_limit != null && r.daily_deposit_limit > 0)
  ), [items, filter, now]);

  const excludedCount = useMemo(() => items.filter(isExcluded).length, [items, now]);
  const limitedCount = useMemo(() => items.filter(r => r.daily_deposit_limit != null && r.daily_deposit_limit > 0).length, [items]);

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" /> Responsible Gambling
          </h2>
          <p className="text-xs text-white/50 mt-1">{excludedCount} self-excluded · {limitedCount} with deposit limits</p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "excluded", "limited"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md font-semibold transition ${
                filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}>{f}</button>
          ))}
          <button onClick={load} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5"><RefreshCw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-white/30"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-white/30 text-sm">No {filter !== "all" ? filter : ""} players</div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "#ffffff" }}>
          <table className="w-full text-sm">
            <thead><tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
              <th className="text-left p-3">Player</th><th className="text-right p-3">Daily limit</th>
              <th className="text-left p-3">Status</th><th className="text-right p-3">Updated</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const excluded = isExcluded(r);
                return (
                  <tr key={r.user_id} className="border-b border-white/[0.04]">
                    <td className="p-3 font-mono text-[11px] text-white/55">{r.user_id.slice(0, 8)}…{r.user_id.slice(-4)}</td>
                    <td className="p-3 text-right font-mono text-white">
                      {r.daily_deposit_limit != null && r.daily_deposit_limit > 0
                        ? <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3 text-white/40" />{Number(r.daily_deposit_limit).toLocaleString()}</span>
                        : <span className="text-white/30">none</span>}
                    </td>
                    <td className="p-3">
                      {excluded
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300"><Clock className="h-3 w-3" /> excluded → {fmt(r.self_excluded_until)}</span>
                        : <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">active</span>}
                    </td>
                    <td className="p-3 text-right text-[11px] text-white/40">{fmt(r.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
