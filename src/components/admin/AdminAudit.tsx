import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Download, Loader2, Save, ShieldAlert, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type AuditRow = {
  id: string; user_id: string | null; event_type: string;
  event_details: any; amount: number | null; ip_address: string | null;
  created_at: string;
};
type RevenueRow = { fee_type: string; today: number; week: number; month: number; all_time: number };
type Fees = {
  withdrawal_flat: number; withdrawal_pct: number; sports_bet_pct: number;
  trading_open_pct: number; trading_close_pct: number; deposit_pct: number;
};

const EVENT_TYPES = [
  "all","sports_bet_placed","trade_opened","trade_closed","trade_liquidated",
  "bet_won","bet_lost","withdrawal_request","withdrawal_approved","withdrawal_rejected",
  "deposit","balance_changed","profile_updated","admin_action",
];

function toCsv(rows: AuditRow[]) {
  const head = ["id","created_at","user_id","event_type","amount","ip","details"];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.created_at, r.user_id ?? "", r.event_type,
      r.amount ?? "", r.ip_address ?? "",
      JSON.stringify(r.event_details ?? {}).replace(/"/g, '""'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}

export default function AdminAudit() {
  // ----- audit log state
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState("all");
  const [userQ, setUserQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");

  // ----- revenue + fees
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [fees, setFees] = useState<Fees | null>(null);
  const [savingFees, setSavingFees] = useState(false);

  const loadAudit = async () => {
    setLoading(true);
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (eventType !== "all") q = q.eq("event_type", eventType);
    if (from) q = q.gte("created_at", new Date(from).toISOString());
    if (to) q = q.lte("created_at", new Date(to).toISOString());
    if (minAmt) q = q.gte("amount", parseFloat(minAmt));
    if (maxAmt) q = q.lte("amount", parseFloat(maxAmt));
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    let filtered = (data ?? []) as AuditRow[];
    if (userQ.trim()) {
      const needle = userQ.trim().toLowerCase();
      filtered = filtered.filter(r => (r.user_id ?? "").toLowerCase().includes(needle));
    }
    setRows(filtered);
  };

  const loadRevenue = async () => {
    const { data, error } = await supabase.rpc("admin_revenue_summary");
    if (!error) setRevenue((data ?? []) as RevenueRow[]);
  };

  const loadFees = async () => {
    const { data } = await supabase.rpc("get_public_fees");
    if (data) setFees(data as Fees);
  };

  useEffect(() => { loadAudit(); loadRevenue(); loadFees(); }, []);

  const totals = useMemo(() => {
    return revenue.reduce(
      (acc, r) => ({
        today: acc.today + Number(r.today),
        week: acc.week + Number(r.week),
        month: acc.month + Number(r.month),
        all_time: acc.all_time + Number(r.all_time),
      }), { today:0, week:0, month:0, all_time:0 },
    );
  }, [revenue]);

  const suspicious = useMemo(() => {
    const last24h = rows.filter(r => Date.now() - new Date(r.created_at).getTime() < 86_400_000);
    const bigW = last24h.filter(r => r.event_type === "withdrawal_request" && (r.amount ?? 0) > 5000).length;
    const failedLogins = last24h.filter(r => r.event_type === "login_failed").length;
    return { bigW, failedLogins, total24h: last24h.length };
  }, [rows]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const saveFees = async () => {
    if (!fees) return;
    setSavingFees(true);
    const { error } = await supabase.rpc("admin_update_platform_fees", {
      p_withdrawal_flat: fees.withdrawal_flat,
      p_withdrawal_pct: fees.withdrawal_pct,
      p_sports_bet_pct: fees.sports_bet_pct,
      p_trading_open_pct: fees.trading_open_pct,
      p_trading_close_pct: fees.trading_close_pct,
      p_deposit_pct: fees.deposit_pct,
    });
    setSavingFees(false);
    if (error) toast.error(error.message); else toast.success("Fees updated");
  };

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-emerald-400" />
        <h2 className="text-xl font-bold">Audit & Fees</h2>
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="bg-white/5">
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="fees">Fee Config</TabsTrigger>
        </TabsList>

        {/* AUDIT */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SuspCard label="Last 24h events" value={suspicious.total24h} />
            <SuspCard label="Large withdrawals (24h)" value={suspicious.bigW} alert={suspicious.bigW > 0} />
            <SuspCard label="Failed logins (24h)" value={suspicious.failedLogins} alert={suspicious.failedLogins > 5} />
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 gap-2">
              <select value={eventType} onChange={e => setEventType(e.target.value)}
                className="bg-black/40 border border-white/10 rounded px-2 py-2 text-sm">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input placeholder="User id contains…" value={userQ} onChange={e => setUserQ(e.target.value)} />
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
              <Input type="number" placeholder="Min $" value={minAmt} onChange={e => setMinAmt(e.target.value)} />
              <Input type="number" placeholder="Max $" value={maxAmt} onChange={e => setMaxAmt(e.target.value)} />
              <div className="col-span-full flex gap-2">
                <Button onClick={loadAudit} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Filters"}
                </Button>
                <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
                  <Download className="h-4 w-4 mr-2" />Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{r.event_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.user_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{r.amount != null ? `$${Number(r.amount).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-xs">{r.ip_address ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-md truncate" title={JSON.stringify(r.event_details)}>
                        {r.event_details ? JSON.stringify(r.event_details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && !loading && (
                    <TableRow><TableCell colSpan={6} className="text-center text-white/40 py-8">No audit events.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVENUE */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RevCard label="Today" value={totals.today} />
            <RevCard label="7 days" value={totals.week} />
            <RevCard label="30 days" value={totals.month} />
            <RevCard label="All time" value={totals.all_time} highlight />
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Revenue by fee type</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue}>
                  <CartesianGrid stroke="rgba(15,23,42,0.05)" />
                  <XAxis dataKey="fee_type" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.1)" }} />
                  <Bar dataKey="all_time" fill="#ffc935" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Today</TableHead>
                    <TableHead className="text-right">7d</TableHead>
                    <TableHead className="text-right">30d</TableHead>
                    <TableHead className="text-right">All time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.map(r => (
                    <TableRow key={r.fee_type}>
                      <TableCell><Badge variant="outline">{r.fee_type}</Badge></TableCell>
                      <TableCell className="text-right font-mono">${Number(r.today).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${Number(r.week).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${Number(r.month).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">${Number(r.all_time).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {!revenue.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-6">No revenue collected yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEES */}
        <TabsContent value="fees" className="mt-4">
          {!fees ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-sm">Platform Fee Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-white/50">Percentages are decimals: 0.005 = 0.5%. Updates are audit-logged.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FeeField label="Withdrawal flat (USDT)" value={fees.withdrawal_flat} onChange={v => setFees({...fees, withdrawal_flat: v})} step={0.1} />
                  <FeeField label="Withdrawal %" value={fees.withdrawal_pct} onChange={v => setFees({...fees, withdrawal_pct: v})} step={0.001} />
                  <FeeField label="Sports bet %" value={fees.sports_bet_pct} onChange={v => setFees({...fees, sports_bet_pct: v})} step={0.005} />
                  <FeeField label="Trading open % (notional)" value={fees.trading_open_pct} onChange={v => setFees({...fees, trading_open_pct: v})} step={0.0005} />
                  <FeeField label="Trading close % (notional)" value={fees.trading_close_pct} onChange={v => setFees({...fees, trading_close_pct: v})} step={0.0005} />
                  <FeeField label="Deposit %" value={fees.deposit_pct} onChange={v => setFees({...fees, deposit_pct: v})} step={0.001} />
                </div>
                <Button onClick={saveFees} disabled={savingFees} className="bg-emerald-600 hover:bg-emerald-500">
                  {savingFees ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Save Fees</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SuspCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <Card className={`border ${alert ? "border-red-500/40 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
      <CardContent className="p-4">
        <div className="text-xs text-white/50">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${alert ? "text-red-400" : "text-white"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RevCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`border ${highlight ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-white/5"}`}>
      <CardContent className="p-4">
        <div className="text-xs text-white/50">{label}</div>
        <div className={`text-2xl font-bold font-mono mt-1 ${highlight ? "text-emerald-400" : "text-white"}`}>${value.toFixed(2)}</div>
      </CardContent>
    </Card>
  );
}

function FeeField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div>
      <label className="text-xs text-white/60 mb-1 block">{label}</label>
      <Input type="number" step={step} value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="bg-black/40 border-white/10" />
    </div>
  );
}
