import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, History as HistoryIcon } from "lucide-react";

const PRESETS: { key: string; label: string; text: string }[] = [
  {
    key: "launch",
    label: "🎰 Launch",
    text: `🎰 <b>C7 Winners is LIVE!</b>

✨ 37 Games Available:
✈️ Aviator | 💥 Crash
💣 Mines | 🎰 Slots
🃏 Cards | 🐟 Fishing
🇮🇳 Indian | ⚽ Sports

💰 Real USDT Payouts
⚡ Instant Withdrawals
🔐 Provably Fair

🎁 100% Welcome Bonus!
Deposit today & get matched!

▶ Play Now:
https://c7winners.live`,
  },
  {
    key: "bonus",
    label: "🎁 Bonus",
    text: `🎁 <b>Special Bonus Alert!</b>

Deposit now & get a 100% match!
Limited time offer.

▶ https://c7winners.live`,
  },
  {
    key: "tournament",
    label: "🏆 Tournament",
    text: `🏆 <b>Tournament Starting!</b>

Top players win USDT prizes!
Join now and climb the leaderboard.

▶ https://c7winners.live`,
  },
  { key: "custom", label: "⚡ Custom", text: "" },
];

type Target = "all_tg" | "all_users";

export default function AdminBroadcastDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [message, setMessage] = useState(PRESETS[0].text);
  const [target, setTarget] = useState<Target>("all_tg");
  const [sending, setSending] = useState(false);
  const [counts, setCounts] = useState({ all: 0, tg: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<"compose" | "history">("compose");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ count: all }, { count: tg }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).not("telegram_chat_id", "is", null),
      ]);
      setCounts({ all: all ?? 0, tg: tg ?? 0 });
      const { data } = await supabase
        .from("audit_logs")
        .select("id, created_at, event_details")
        .eq("event_type", "telegram_broadcast")
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory(data ?? []);
    })();
  }, [open]);

  const recipientCount = useMemo(() => (target === "all_tg" ? counts.tg : counts.all), [target, counts]);

  const send = async () => {
    const msg = message.trim();
    if (!msg) { toast.error("Message is empty"); return; }
    if (!confirm(`Send to ${recipientCount} user(s) with Telegram linked?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-telegram-broadcast", {
        body: { message: msg },
        headers: sessionStorage.getItem("dtx_admin_auth")
          ? { "x-admin-pin-session": sessionStorage.getItem("dtx_admin_auth") as string }
          : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`📢 Sent ${data.sent} · Failed ${data.failed}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" style={{ background: "#f1f5f9", borderColor: "rgba(15,23,42,0.08)" }}>
        <DialogHeader>
          <DialogTitle className="text-white text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-orange-400" /> Telegram Broadcast
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b border-white/5 mb-3">
          {(["compose", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-[11px] uppercase tracking-widest ${tab === t ? "text-orange-400 border-b-2 border-orange-400" : "text-white/40"}`}>
              {t === "compose" ? "Compose" : <><HistoryIcon className="inline h-3 w-3 mr-1" />History</>}
            </button>
          ))}
        </div>

        {tab === "compose" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button key={p.key} onClick={() => setMessage(p.text)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10">
                  {p.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40">Message (HTML allowed)</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={10}
                className="text-xs font-mono mt-1" placeholder="Type your broadcast..." />
              <div className="text-[10px] text-white/30 mt-1">{message.length} / 3500</div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1.5">Send to</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                  <input type="radio" checked={target === "all_tg"} onChange={() => setTarget("all_tg")} />
                  With Telegram linked ({counts.tg})
                </label>
                <label className="flex items-center gap-2 text-xs text-white/40 cursor-not-allowed">
                  <input type="radio" disabled />
                  All users ({counts.all}) — non-TG users skipped automatically
                </label>
              </div>
            </div>

            <div className="rounded-md p-2.5 bg-black/40 border border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Preview</div>
              <pre className="text-[11px] text-white/80 whitespace-pre-wrap font-mono">{message || "—"}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={sending} className="text-xs h-8">Cancel</Button>
              <Button size="sm" onClick={send} disabled={sending || !message.trim() || recipientCount === 0}
                className="text-xs h-8 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold">
                <Send className="h-3 w-3 mr-1.5" />{sending ? "Sending..." : `Send to ${recipientCount}`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-xs text-white/40 text-center py-8">No broadcasts yet</div>
            ) : history.map(h => (
              <div key={h.id} className="p-2.5 rounded-md bg-black/30 border border-white/5">
                <div className="flex justify-between items-center text-[10px] text-white/40 mb-1">
                  <span>{new Date(h.created_at).toLocaleString()}</span>
                  <span>
                    <span className="text-green-400">✓ {h.event_details?.sent ?? 0}</span>
                    {" · "}
                    <span className="text-red-400">✗ {h.event_details?.failed ?? 0}</span>
                  </span>
                </div>
                <pre className="text-[10px] text-white/70 whitespace-pre-wrap line-clamp-3 font-mono">
                  {h.event_details?.message ?? "—"}
                </pre>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
