import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminCasino } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Gift, Loader2, RefreshCw, Sparkles, CheckCircle2, PauseCircle, CalendarX } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Campaign {
  id: string; name: string; amount: number; wagering_requirement: number;
  expires_at: string | null; max_users: number; is_active: boolean;
  claimed_count: number; total_given: number; created_at: string;
}

export default function AdminPromotions() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ name: "", amount: "10", wagering_req: "5", expiry: "", max_users: "100" });

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase.from("bonus_campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Campaign name is required");
    setBusy(true);
    const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
      action: "create_campaign",
      name: form.name.trim(),
      amount: Number(form.amount),
      wagering_req: Number(form.wagering_req),
      expiry: form.expiry || null,
      max_users: Number(form.max_users),
    });
    setBusy(false);
    if (error || data?.error) return toast.error(error?.message || data?.error || "Failed to create");
    toast.success("Campaign created");
    setForm({ name: "", amount: "10", wagering_req: "5", expiry: "", max_users: "100" });
    setShowForm(false);
    fetchCampaigns();
  };

  const toggleActive = async (c: Campaign) => {
    const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
      action: "toggle_campaign", id: c.id, is_active: !c.is_active,
    });
    if (error || data?.error) return toast.error(error?.message || data?.error || "Failed");
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
    toast.success(`Campaign ${!c.is_active ? "activated" : "deactivated"}`);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setBusy(true);
    const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
      action: "delete_campaign", id: confirmDel.id,
    });
    setBusy(false);
    if (error || data?.error) return toast.error(error?.message || data?.error || "Failed");
    setCampaigns(prev => prev.filter(c => c.id !== confirmDel.id));
    setConfirmDel(null);
    toast.success("Campaign deleted");
  };

  const kpis = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 86400000;
    const monthGiven = campaigns
      .filter(c => +new Date(c.created_at) > monthAgo)
      .reduce((s, c) => s + Number(c.total_given || 0), 0);
    const active = campaigns.filter(c => c.is_active).length;
    const paused = campaigns.filter(c => !c.is_active).length;
    const expired = campaigns.filter(c => c.expires_at && +new Date(c.expires_at) < now).length;
    return { active, paused, expired, monthGiven, total: campaigns.length };
  }, [campaigns]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
      {/* PREMIUM HERO */}
      <V8PageHero
        eyebrow="Growth · Promotions"
        title="PROMOTIONS & BONUSES"
        tone="emerald"
        icon={<Gift className="h-5 w-5" />}
        badges={[
          { label: `${kpis.active} ACTIVE`, tone: "emerald", dot: true },
          { label: `${kpis.total} TOTAL`, tone: "cyan" },
          { label: `${kpis.expired} EXPIRED`, tone: "rose" },
        ]}
        subtitle={<>Bonus campaigns &amp; player incentives · <span className="font-bold" style={{ color: "#15803d" }}>${kpis.monthGiven.toFixed(2)}</span> given in the last 30 days across <span className="font-bold">{kpis.total}</span> campaigns.</>}
        actions={
          <>
            <V8HeroBtn variant="ghost" onClick={fetchCampaigns} disabled={loading} title="Refresh campaigns">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
            <V8HeroBtn variant="primary" onClick={() => setShowForm(!showForm)} title="Create a new campaign">
              <Plus className="h-3.5 w-3.5" /> New Campaign
            </V8HeroBtn>
          </>
        }
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <V8StatCard icon={<Gift className="h-4 w-4" />} label="Total Campaigns" value={kpis.total} sub={`$${kpis.monthGiven.toFixed(2)} given (30d)`} tone="cyan" delay={0} />
        <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={kpis.active} sub="live &amp; claimable" tone="emerald" delay={80} />
        <V8StatCard icon={<PauseCircle className="h-4 w-4" />} label="Paused" value={kpis.paused} sub="toggled off" tone="amber" delay={160} />
        <V8StatCard icon={<CalendarX className="h-4 w-4" />} label="Expired" value={kpis.expired} sub="past expiry date" tone="rose" delay={240} />
      </div>

      {showForm && (
        <div className="rounded-2xl border border-dtx-border p-4 space-y-3 bg-dtx-panel">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Campaign Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-dtx-bg border-dtx-border text-foreground" />
            <Input type="number" placeholder="Bonus Amount (USDT)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-dtx-bg border-dtx-border text-foreground" />
            <Input type="number" placeholder="Wagering Req (x)" value={form.wagering_req} onChange={e => setForm(f => ({ ...f, wagering_req: e.target.value }))} className="bg-dtx-bg border-dtx-border text-foreground" />
            <Input type="datetime-local" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} className="bg-dtx-bg border-dtx-border text-foreground" />
            <Input type="number" placeholder="Max Users" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: e.target.value }))} className="bg-dtx-bg border-dtx-border text-foreground" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={busy} size="sm" className="bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Create
            </Button>
            <Button onClick={() => setShowForm(false)} size="sm" variant="ghost" className="text-dtx-muted">Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-dtx-border overflow-hidden bg-dtx-panel">
        {loading ? (
          <div className="p-8 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-dtx-panel2 rounded animate-pulse" />)}</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Gift className="h-10 w-10 text-dtx-muted/40 mx-auto mb-3" />
            <p className="text-sm text-dtx-muted mb-3">No campaigns yet</p>
            <Button onClick={() => setShowForm(true)} size="sm" className="bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
              <Plus className="h-3.5 w-3.5 mr-1" /> Create your first campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-dtx-bg/50">
                <tr className="text-dtx-muted">
                  <th className="text-left p-3 font-semibold">Name</th><th className="text-right p-3 font-semibold">Amount</th>
                  <th className="text-left p-3 font-semibold">Wager</th><th className="text-left p-3 font-semibold">Expiry</th>
                  <th className="text-left p-3 font-semibold">Claimed</th><th className="text-right p-3 font-semibold">Given</th>
                  <th className="text-center p-3 font-semibold">Active</th><th className="text-right p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-t border-dtx-border/40 hover:bg-dtx-panel2/40">
                    <td className="p-3 text-foreground font-medium">{c.name}</td>
                    <td className="p-3 text-right text-dtx-win font-mono font-bold">${c.amount}</td>
                    <td className="p-3 text-foreground/70">{c.wagering_requirement}x</td>
                    <td className="p-3 text-dtx-muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-foreground/70">{c.claimed_count}/{c.max_users}</td>
                    <td className="p-3 text-right text-dtx-mint font-mono">${c.total_given}</td>
                    <td className="p-3 text-center"><Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} /></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)} className="text-dtx-loss hover:text-dtx-loss h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={o => !o && setConfirmDel(null)}>
        <AlertDialogContent className="bg-dtx-panel border-dtx-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-dtx-muted">
              "<b className="text-foreground">{confirmDel?.name}</b>" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dtx-bg border-dtx-border text-foreground hover:bg-dtx-panel2">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleDelete} className="bg-dtx-loss text-white hover:bg-dtx-loss/90">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
