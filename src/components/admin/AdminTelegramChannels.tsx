import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, RefreshCw } from "lucide-react";

type Channel = {
  id: string;
  channel_username: string;
  display_name: string | null;
  enabled: boolean;
  broadcast_big_wins: boolean;
  broadcast_jackpots: boolean;
  broadcast_promos: boolean;
  broadcast_leaderboard: boolean;
  big_win_threshold_usd: number;
  channel_chat_id: string | null;
  last_leaderboard_at: string | null;
};

type Broadcast = {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  rendered_text: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
};

export default function AdminTelegramChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recent, setRecent] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: ch }, { data: rb }] = await Promise.all([
      supabase.from("telegram_channels").select("*").order("created_at", { ascending: true }),
      supabase
        .from("telegram_channel_broadcasts")
        .select("id, kind, status, attempts, rendered_text, last_error, sent_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setChannels((ch as Channel[]) ?? []);
    setRecent((rb as Broadcast[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateChannel(id: string, patch: Partial<Channel>) {
    const { error } = await supabase.from("telegram_channels").update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  }

  async function runEngine() {
    setFiring(true);
    try {
      const { data, error } = await supabase.functions.invoke("channel-broadcast-engine", {
        body: { source: "admin-manual" },
      });
      if (error) throw error;
      toast.success(`Engine ran: sent ${data?.sent ?? 0}, enqueued ${data?.enqueued ?? 0}`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Engine failed");
    } finally {
      setFiring(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Telegram Channels</h2>
        <Button onClick={runEngine} disabled={firing} variant="secondary">
          <RefreshCw className={`w-4 h-4 mr-2 ${firing ? "animate-spin" : ""}`} />
          Run engine now
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {channels.map((ch) => (
        <Card key={ch.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {ch.channel_username}
              {ch.channel_chat_id ? (
                <Badge variant="outline" className="ml-2">id: {ch.channel_chat_id}</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">not bound yet</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <ToggleRow label="Channel enabled" v={ch.enabled} onChange={(v) => updateChannel(ch.id, { enabled: v })} />
            <ToggleRow label="Big wins" v={ch.broadcast_big_wins} onChange={(v) => updateChannel(ch.id, { broadcast_big_wins: v })} />
            <ToggleRow label="Jackpots" v={ch.broadcast_jackpots} onChange={(v) => updateChannel(ch.id, { broadcast_jackpots: v })} />
            <ToggleRow label="Promos" v={ch.broadcast_promos} onChange={(v) => updateChannel(ch.id, { broadcast_promos: v })} />
            <ToggleRow label="Daily leaderboard (08:00 UTC)" v={ch.broadcast_leaderboard} onChange={(v) => updateChannel(ch.id, { broadcast_leaderboard: v })} />
            <div className="space-y-1">
              <Label className="text-xs">Big-win threshold (USD)</Label>
              <Input
                type="number"
                defaultValue={ch.big_win_threshold_usd}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n !== Number(ch.big_win_threshold_usd)) {
                    updateChannel(ch.id, { big_win_threshold_usd: n });
                  }
                }}
              />
            </div>
            {!ch.channel_chat_id && (
              <p className="md:col-span-2 text-xs text-amber-500">
                Add @dtx_creatorbot as <b>Administrator</b> in {ch.channel_username} with <b>Post Messages</b> permission, then click "Run engine now". The first successful send will bind the chat id automatically.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Recent broadcasts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No broadcasts yet.</p>}
          {recent.map((b) => (
            <div key={b.id} className="flex items-start gap-3 text-xs border border-border/40 rounded-md p-2">
              <Badge variant={b.status === "sent" ? "default" : b.status === "failed" ? "destructive" : "secondary"}>
                {b.status}
              </Badge>
              <Badge variant="outline">{b.kind}</Badge>
              <div className="flex-1 min-w-0">
                <p className="truncate whitespace-pre-wrap">{b.rendered_text || b.last_error || "(pending)"}</p>
                <p className="text-muted-foreground mt-1">
                  attempts: {b.attempts} · {new Date(b.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border border-border/40 rounded-md px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}
