import { useState, useEffect, useCallback } from "react";
import { useCountUp } from "./adminV8Kit";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, AlertTriangle, Ban, Plus, Trash2, Search, Loader2,
  Lock, ShieldCheck, FileText, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// useCountUp is imported from ./adminV8Kit (shared count-up hook).

export default function AdminSecurity() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ipList, setIpList] = useState<any[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingIp, setAddingIp] = useState(false);
  const [enforce2FA, setEnforce2FA] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [logsRes, ipRes] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ip_blocklist").select("*").order("created_at", { ascending: false }),
    ]);
    setAuditLogs(logsRes.data || []);
    setIpList(ipRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const suspiciousAlerts = (() => {
    const alerts: { type: string; detail: string; count: number; time: string }[] = [];
    const failedByUser: Record<string, any[]> = {};
    const failedByIp: Record<string, any[]> = {};

    auditLogs.forEach(log => {
      const eventLower = (log.event_type || "").toLowerCase();
      if (eventLower.includes("fail") || eventLower.includes("denied") || eventLower.includes("error") || eventLower.includes("suspicious")) {
        if (log.user_id) {
          if (!failedByUser[log.user_id]) failedByUser[log.user_id] = [];
          failedByUser[log.user_id].push(log);
        }
        if (log.ip_address) {
          if (!failedByIp[log.ip_address]) failedByIp[log.ip_address] = [];
          failedByIp[log.ip_address].push(log);
        }
      }
    });

    Object.entries(failedByUser).forEach(([userId, logs]) => {
      if (logs.length >= 3) alerts.push({ type: "user", detail: `User ${userId.slice(0, 8)}… — ${logs.length} failed events`, count: logs.length, time: logs[0].created_at });
    });
    Object.entries(failedByIp).forEach(([ip, logs]) => {
      if (logs.length >= 3) alerts.push({ type: "ip", detail: `IP ${ip} — ${logs.length} failed events`, count: logs.length, time: logs[0].created_at });
    });
    return alerts.sort((a, b) => b.count - a.count).slice(0, 10);
  })();

  const filteredLogs = auditLogs.filter(l =>
    !logSearch ||
    (l.event_type || "").toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.ip_address || "").includes(logSearch) ||
    (l.user_id || "").includes(logSearch)
  );

  const handleAddIp = async () => {
    if (!newIp.trim()) return;
    setAddingIp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ip_blocklist").insert({
        ip_address: newIp.trim(),
        reason: newReason.trim() || null,
        blocked_by: user?.id || null,
      });
      if (error) throw error;
      toast.success(`IP ${newIp} blocked`);
      setNewIp(""); setNewReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
    setAddingIp(false);
  };

  const handleRemoveIp = async (id: string, ip: string) => {
    const { error } = await supabase.from("ip_blocklist").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`IP ${ip} unblocked`);
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-rose-400/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes v8-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes v8-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes v8-alert-glow {
          0%,100% { box-shadow: 0 0 14px rgba(244,63,94,0.25); }
          50% { box-shadow: 0 0 24px rgba(244,63,94,0.45); }
        }
        .v8-card { animation: v8-fade-in 0.5s ease-out backwards; }
        .v8-tilt { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .v8-tilt:hover { transform: perspective(800px) rotateX(2deg) rotateY(-2deg) translateY(-2px); }
        .v8-alert-pulse { animation: v8-alert-glow 2.5s ease-in-out infinite; }
        .v8-row-hover { transition: background 0.2s, transform 0.15s; }
        .v8-row-hover:hover { transform: translateX(2px); background: rgba(245,158,11,0.04) !important; }
        .v8-mono { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
      `}</style>

      {/* Hero header */}
      <div className="relative rounded-2xl p-5 border overflow-hidden v8-card"
        style={{
          background: "linear-gradient(135deg, rgba(244,63,94,0.08), rgba(245,158,11,0.04), rgba(255,255,255,0.3))",
          borderColor: "rgba(244,63,94,0.25)",
          boxShadow: "0 8px 32px -8px rgba(244,63,94,0.15)",
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, rgba(244,63,94,0.25), transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #fb7185, #f43f5e)", boxShadow: "0 0 16px rgba(244,63,94,0.5)" }}>
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-rose-300/70 font-bold">Security Center</p>
              <h2 className="text-xl font-black text-white tracking-tight">Audit & Defense</h2>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest ${
            suspiciousAlerts.length > 0
              ? "bg-rose-500/15 ring-1 ring-rose-500/40 text-rose-300 v8-alert-pulse"
              : "bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-300"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${suspiciousAlerts.length > 0 ? "bg-rose-400" : "bg-emerald-400"}`}
              style={{ animation: "v8-pulse 1.5s ease-in-out infinite" }} />
            {suspiciousAlerts.length > 0 ? `${suspiciousAlerts.length} ALERTS` : "ALL CLEAR"}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PremiumKpi icon={<FileText className="h-4 w-4" />} label="Audit Events" value={auditLogs.length} tone="amber" delay={0} />
        <PremiumKpi icon={<AlertTriangle className="h-4 w-4" />} label="Suspicious" value={suspiciousAlerts.length} tone={suspiciousAlerts.length > 0 ? "rose" : "emerald"} delay={80} />
        <PremiumKpi icon={<Ban className="h-4 w-4" />} label="Blocked IPs" value={ipList.length} tone="orange" delay={160} />
        <PremiumKpi icon={<Lock className="h-4 w-4" />} label="2FA Status" stringValue={enforce2FA ? "ON" : "OFF"} tone={enforce2FA ? "emerald" : "rose"} delay={240} />
      </div>

      {/* 2FA Toggle */}
      <div className="rounded-2xl border p-5 v8-card"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))",
          borderColor: enforce2FA ? "rgba(255, 201, 53,0.25)" : "rgba(15,23,42,0.06)",
          backdropFilter: "blur(20px)",
          boxShadow: enforce2FA ? "0 0 16px rgba(255, 201, 53,0.1)" : "none",
        }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl ${enforce2FA ? "bg-emerald-500/20" : "bg-white/[0.04]"}`}>
              <ShieldCheck className={`h-4 w-4 ${enforce2FA ? "text-emerald-300" : "text-white/40"}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Two-Factor Enforcement</h3>
              <p className="text-[11px] text-white/40 mt-0.5">Require 2FA before placing bets · Recommended</p>
            </div>
          </div>
          <Switch checked={enforce2FA} onCheckedChange={setEnforce2FA} />
        </div>
      </div>

      {/* Suspicious Activity */}
      <div className="rounded-2xl border overflow-hidden v8-card"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))",
          borderColor: suspiciousAlerts.length > 0 ? "rgba(244,63,94,0.25)" : "rgba(15,23,42,0.06)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2"
          style={{ background: suspiciousAlerts.length > 0 ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.2)" }}>
          <AlertTriangle className={`h-3.5 w-3.5 ${suspiciousAlerts.length > 0 ? "text-rose-400" : "text-white/40"}`} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Suspicious Activity</h3>
          {suspiciousAlerts.length > 0 && (
            <span className="ml-auto text-[10px] font-bold text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/15 ring-1 ring-rose-500/30">
              {suspiciousAlerts.length} active
            </span>
          )}
        </div>
        {suspiciousAlerts.length === 0 ? (
          <div className="p-10 text-center text-white/30">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-400/40" />
            <p className="text-xs font-bold text-white/50">All Clear</p>
            <p className="text-[10px] text-white/30 mt-1">No suspicious activity detected</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {suspiciousAlerts.map((alert, i) => (
              <div key={i} className="v8-row-hover px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    alert.type === "ip" ? "bg-orange-500/15 ring-1 ring-orange-500/30" : "bg-rose-500/15 ring-1 ring-rose-500/30"
                  }`}>
                    {alert.type === "ip" ? <Ban className="h-4 w-4 text-orange-300" /> : <AlertTriangle className="h-4 w-4 text-rose-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/90 font-medium truncate">{alert.detail}</p>
                    <p className="text-[10px] text-white/30">{alert.time ? new Date(alert.time).toLocaleString() : "—"}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30 flex-shrink-0 ml-2">
                  {alert.count} events
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IP Blocklist */}
      <div className="rounded-2xl border overflow-hidden v8-card"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))",
          borderColor: "rgba(249,115,22,0.18)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between"
          style={{ background: "rgba(249,115,22,0.06)" }}>
          <div className="flex items-center gap-2">
            <Ban className="h-3.5 w-3.5 text-orange-400" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">IP Blocklist</h3>
          </div>
          <span className="text-[10px] font-bold text-orange-300 px-2 py-0.5 rounded-full bg-orange-500/15 ring-1 ring-orange-500/30">
            {ipList.length} blocked
          </span>
        </div>

        {/* Add IP */}
        <div className="p-4 border-b border-white/[0.04] flex flex-wrap gap-2 items-end" style={{ background: "rgba(255,255,255,0.2)" }}>
          <Input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="IP address (e.g. 192.168.1.1)"
            className="flex-1 min-w-[180px] text-xs h-9"
            style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(15,23,42,0.06)", color: "white" }} />
          <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)"
            className="flex-1 min-w-[150px] text-xs h-9"
            style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(15,23,42,0.06)", color: "white" }} />
          <Button size="sm" onClick={handleAddIp} disabled={addingIp || !newIp.trim()}
            className="text-xs h-9 font-bold text-black"
            style={{ background: "linear-gradient(135deg, #fb923c, #f97316)", boxShadow: "0 4px 16px -4px rgba(249,115,22,0.4)" }}>
            {addingIp ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Block IP
          </Button>
        </div>

        {/* IP list */}
        <div className="divide-y divide-white/[0.04]">
          {ipList.length === 0 ? (
            <div className="p-10 text-center text-white/30">
              <Ban className="h-7 w-7 mx-auto mb-2 text-white/20" />
              <p className="text-xs font-bold text-white/50">No blocked IPs</p>
              <p className="text-[10px] text-white/30 mt-1">Add IPs above to start blocking</p>
            </div>
          ) : (
            ipList.map(ip => (
              <div key={ip.id} className="v8-row-hover px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono font-bold text-orange-200 px-2 py-0.5 rounded bg-orange-500/10 ring-1 ring-orange-500/20">
                      {ip.ip_address}
                    </span>
                    {ip.reason && <span className="text-[10px] text-white/40">— {ip.reason}</span>}
                  </div>
                  <p className="text-[10px] text-white/20 mt-1">{ip.created_at ? new Date(ip.created_at).toLocaleString() : ""}</p>
                </div>
                <button onClick={() => handleRemoveIp(ip.id, ip.ip_address)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-white/30 hover:text-rose-300 transition-all" title="Unblock">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-2xl border overflow-hidden v8-card"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))",
          borderColor: "rgba(245,158,11,0.15)",
          backdropFilter: "blur(20px)",
        }}>
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between gap-2"
          style={{ background: "rgba(245,158,11,0.05)" }}>
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-amber-400" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Audit Logs</h3>
          </div>
          <div className="relative w-44 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-amber-400/50" />
            <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-7 pr-3 py-1.5 rounded-md text-[10px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(15,23,42,0.06)" }} />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }}>
              <tr className="text-white/40 border-b border-white/[0.05] text-[10px] uppercase tracking-wider">
                <th className="text-left p-3 font-bold">Event</th>
                <th className="text-left p-3 font-bold">User</th>
                <th className="text-left p-3 font-bold">IP</th>
                <th className="text-left p-3 font-bold">Details</th>
                <th className="text-right p-3 font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice(0, 100).map((log, i) => {
                const evt = (log.event_type || "").toLowerCase();
                const isFailed = evt.includes("fail") || evt.includes("denied");
                const isAuth = evt.includes("login") || evt.includes("auth");
                return (
                  <tr key={log.id} className={`v8-row-hover border-b border-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.008]"}`}>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                        isFailed ? "bg-rose-500/10 text-rose-300 ring-rose-500/30" :
                        isAuth ? "bg-amber-500/10 text-amber-300 ring-amber-500/30" :
                        "bg-white/5 text-white/50 ring-white/10"
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="p-3 text-white/50 font-mono">{log.user_id ? `${log.user_id.slice(0, 8)}…` : "—"}</td>
                    <td className="p-3 text-white/40 font-mono">{log.ip_address || "—"}</td>
                    <td className="p-3 text-white/30 max-w-[220px] truncate">{log.event_details ? JSON.stringify(log.event_details).slice(0, 80) : "—"}</td>
                    <td className="p-3 text-right text-white/30 text-[10px]">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-white/30 text-xs">No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-white/[0.04] text-[10px] text-white/30 font-bold tracking-wider"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          Showing {Math.min(filteredLogs.length, 100)} of {filteredLogs.length} entries
        </div>
      </div>
    </div>
  );
}

function PremiumKpi({ icon, label, value, stringValue, tone, delay }: any) {
  const animated = useCountUp(typeof value === "number" ? value : 0, 800);
  const toneMap: Record<string, { bg: string; ring: string; glow: string; text: string }> = {
    amber:   { bg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.04))", ring: "rgba(245,158,11,0.3)", glow: "0 8px 30px rgba(245,158,11,0.2)", text: "#fbbf24" },
    emerald: { bg: "linear-gradient(135deg, rgba(255, 201, 53,0.18), rgba(255, 201, 53,0.04))", ring: "rgba(255, 201, 53,0.3)", glow: "0 8px 30px rgba(255, 201, 53,0.2)", text: "#ffd76b" },
    rose:    { bg: "linear-gradient(135deg, rgba(244,63,94,0.18), rgba(244,63,94,0.04))",   ring: "rgba(244,63,94,0.3)",  glow: "0 8px 30px rgba(244,63,94,0.2)",  text: "#fb7185" },
    orange:  { bg: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(249,115,22,0.04))", ring: "rgba(249,115,22,0.3)", glow: "0 8px 30px rgba(249,115,22,0.2)", text: "#fb923c" },
  };
  const c = toneMap[tone] || toneMap.amber;
  const display = stringValue !== undefined ? stringValue : Math.round(animated).toLocaleString();
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
        <div className="text-xl font-black v8-mono" style={{ color: c.text, textShadow: `0 0 12px ${c.ring}` }}>
          {display}
        </div>
      </div>
    </div>
  );
}
