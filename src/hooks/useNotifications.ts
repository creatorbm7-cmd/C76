import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useNotifications — the single source of truth for the user's in-app
 * notification feed (deposit / withdrawal / VIP / referral / bonus / security).
 *
 * Reads the `notifications` table (RLS: users see only their own rows), keeps it
 * live over Supabase Realtime (per-user — RLS filters delivery), and exposes
 * read/unread state via the `mark_notification_read` / `mark_all_notifications_read`
 * RPCs. `meta` carries the premium fields (amount, currency, reference, status,
 * icon, cta_label, cta_route, level).
 */
export interface NotificationMeta {
  amount?: number;
  currency?: string;
  amount_usdt?: number;
  reference?: string;
  status?: string;
  level?: string;
  icon?: string;
  chain?: string;
  method?: string;
  tier?: string;
  device?: string;
  cta_label?: string;
  cta_route?: string;
  [k: string]: unknown;
}

export interface NotificationRow {
  id: number;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  meta: NotificationMeta | null;
  created_at: string;
}

export function useNotifications(limit = 50) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const uidRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id ?? null;
    uidRef.current = uid;
    if (!uid) { setItems([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("notifications" as any)
      .select("id, user_id, title, message, type, is_read, meta, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) setItems(((data ?? []) as unknown) as NotificationRow[]);
    else setError(true);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
    // Realtime: new rows for THIS user stream in (RLS filters delivery per-user).
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`notif:${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = (payload.new as unknown) as NotificationRow;
            setItems((prev) => (prev.some((p) => p.id === row.id) ? prev : [row, ...prev].slice(0, limit)));
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = (payload.new as unknown) as NotificationRow;
            setItems((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)));
          },
        )
        .subscribe();
    })();
    // Belt-and-braces: refresh on tab focus (covers missed realtime frames).
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load, limit]);

  const markRead = useCallback(async (id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    await (supabase.rpc as any)("mark_notification_read", { p_notification_id: id });
  }, []);

  const markAllRead = useCallback(async () => {
    if (!items.some((i) => !i.is_read)) return;
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    await (supabase.rpc as any)("mark_all_notifications_read");
  }, [items]);

  const unreadCount = items.reduce((acc, i) => acc + (i.is_read ? 0 : 1), 0);

  return { items, unreadCount, loading, error, markRead, markAllRead, refresh: load };
}
