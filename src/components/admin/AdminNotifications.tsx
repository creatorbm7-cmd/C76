import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, Loader2, Info, CheckCircle2, AlertTriangle, AlertOctagon, Mail } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody]   = useState("");
  const [level, setLevel] = useState<"info" | "success" | "warn" | "error">("info");
  const [link, setLink]   = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [alsoTelegram, setAlsoTelegram] = useState(true);
  const { items, refresh } = useNotifications(20);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSending(true);
    const { error } = await (supabase.rpc as any)("broadcast_notification", {
      p_title: title.trim(),
      p_body: body.trim(),
      p_level: level,
      p_link: link.trim() || null,
      p_target_user_id: targetUserId.trim() || null,
    });
    if (error) {
      setSending(false);
      toast.error(error.message ?? "Failed to send notification");
      return;
    }
    let tgSummary = "";
    if (alsoTelegram) {
      const { data, error: tgErr } = await supabase.functions.invoke("send-telegram-broadcast", {
        body: {
          title: title.trim(),
          body: body.trim(),
          level,
          link: link.trim() || null,
          target_user_id: targetUserId.trim() || null,
        },
        headers: sessionStorage.getItem("dtx_admin_auth")
          ? { "x-admin-pin-session": sessionStorage.getItem("dtx_admin_auth") as string }
          : undefined,
      });

      if (tgErr) tgSummary = " (Telegram failed)";
      else if (data && typeof (data as any).sent === "number") tgSummary = ` · Telegram: ${(data as any).sent}/${(data as any).total}`;
    }
    setSending(false);
    toast.success((targetUserId ? "Notification delivered" : "Broadcast sent to all users") + tgSummary);
    setTitle(""); setBody(""); setLink(""); setTargetUserId("");
    refresh();
  };

  const levelIcon = {
    info: <Info className="h-3.5 w-3.5 text-sky-300" />,
    success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />,
    error: <AlertOctagon className="h-3.5 w-3.5 text-yellow-300" />,
  } as const;
  // Notifications now carry a category `type`; the severity level lives in meta.
  const lvlOf = (n: { type?: string; meta?: { level?: unknown } | null }): keyof typeof levelIcon => {
    const v = String(n.meta?.level ?? n.type ?? "info").toLowerCase();
    if (v === "warning") return "warn";
    if (v === "success" || v === "error" || v === "warn") return v;
    return "info";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-emerald-300" />
          <h3 className="text-sm font-bold text-white">Compose Notification</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="System maintenance window" maxLength={200} />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="We'll be performing maintenance from 02:00–02:30 UTC." maxLength={2000} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/40">Severity</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/40">Link (optional)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/dtx/rewards" />
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Target user ID (blank = broadcast to all)</Label>
            <Input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="optional UUID" />
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
            <input type="checkbox" checked={alsoTelegram} onChange={(e) => setAlsoTelegram(e.target.checked)} className="accent-emerald-400" />
            Also send via Telegram to linked users
          </label>
          <Button onClick={send} disabled={sending} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {targetUserId ? "Send to user" : "Broadcast to all users"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent</h3>
        <div className="space-y-2 max-h-[520px] overflow-y-auto">
          {!items.length && <div className="text-xs text-white/40 py-12 text-center">No notifications sent yet.</div>}
          {items.map((n) => (
            <div key={n.id} className="rounded-lg p-3 bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-start gap-2">
                {levelIcon[lvlOf(n)]}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white truncate">{n.title}</span>
                    <span className="text-[9px] uppercase tracking-widest text-white/30">
                      {n.user_id ? "Direct" : "Broadcast"}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/55 mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="text-[10px] text-white/30 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TestEmailPanel />
    </div>
  );
}

function TestEmailPanel() {
  const [sending, setSending] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? ""));
  }, []);

  const sendTest = async (kind: "signup_welcome" | "deposit_credited" | "withdrawal_approved", label: string) => {
    setSending(kind);
    try {
      const pinToken = sessionStorage.getItem("dtx_admin_auth") ?? "";
      const { data, error } = await supabase.functions.invoke("admin-test-email", {
        body: { kind },
        headers: pinToken ? { "x-admin-pin-session": pinToken } : undefined,
      });
      if (error) throw error;
      toast.success(`${label} email sent to ${(data as any)?.sent_to ?? "you"}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send test email");
    } finally {
      setSending(null);
    }
  };

  const samples: Array<{ kind: "signup_welcome" | "deposit_credited" | "withdrawal_approved"; label: string; desc: string }> = [
    { kind: "signup_welcome", label: "Welcome", desc: "New user signup welcome email" },
    { kind: "deposit_credited", label: "Deposit", desc: "Sample $250 USDT deposit confirmation" },
    { kind: "withdrawal_approved", label: "Withdrawal", desc: "Sample $100 USDT withdrawal approved" },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 lg:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-emerald-300" />
        <h3 className="text-sm font-bold text-white">Test Transactional Emails</h3>
      </div>
      <p className="text-[11px] text-white/50 mb-4">
        Send yourself a live sample of each branded email. Delivered via Resend to{" "}
        <span className="text-emerald-300 font-mono">{adminEmail || "your admin email"}</span>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {samples.map((s) => (
          <div key={s.kind} className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
            <div className="text-sm font-semibold text-white mb-1">{s.label}</div>
            <div className="text-[11px] text-white/50 mb-3 min-h-[32px]">{s.desc}</div>
            <Button
              size="sm"
              className="w-full bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold"
              disabled={sending !== null}
              onClick={() => sendTest(s.kind, s.label)}
            >
              {sending === s.kind ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-3.5 w-3.5 mr-1.5" /> Send test</>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
