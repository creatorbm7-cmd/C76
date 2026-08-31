import { useCallback, useEffect, useRef } from "react";
import { useDtxStore } from "@/store/dtxStore";
import { supabase } from "@/integrations/supabase/client";
import { syncDtxBalance } from "@/hooks/useCasinoGame";

/**
 * Subscribe to the signed-in user's USDT wallet balance.
 * - Live updates via postgres_changes
 * - Re-syncs on tab focus, network online, and auth state changes
 * - Exposes a `refetch()` so UI can offer a manual refresh button
 */
export function useDtxBalance() {
  const setBalance = useDtxStore((s) => s.setBalance);
  const setConnection = useDtxStore((s) => s.setConnection);
  const userIdRef = useRef<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userIdRef.current) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
    }
    await syncDtxBalance(setBalance);
  }, [setBalance]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      setConnection("connecting");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setConnection("offline"); return; }
      userIdRef.current = user.id;
      await refetch();

      channel = supabase
        .channel(`dtx-wallet-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "casino_wallets", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = (payload.new ?? payload.old) as { balance?: number } | null;
            if (mounted && row?.balance != null) setBalance(Number(row.balance));
          },
        )
        .subscribe((status) => {
          if (!mounted) return;
          if (status === "SUBSCRIBED") setConnection("connected");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("offline");
        });
    })();

    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    const onOnline = () => { setConnection("connecting"); refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);

    const { data: authSub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const newId = session?.user?.id ?? null;
      if (newId !== userIdRef.current) {
        // User changed (switch account) or signed out. Zero the store IMMEDIATELY
        // so the previous user's balance can never linger on the new/blank
        // session, THEN load the new user's real balance. Guarantees one user's
        // wallet is never shown on another user's account.
        userIdRef.current = newId;
        setBalance(0);
        if (newId) refetch();
      } else {
        refetch();
      }
    });

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [setBalance, setConnection, refetch]);

  return { refetch };
}
