/**
 * ReferralCapture — captures a `?ref=CODE` invite param and attaches the
 * referrer once the visitor is authenticated. Mounted once at the app root.
 * attach_referrer is idempotent (it refuses if already referred / invalid),
 * so this is safe to retry; we clear the stored code once it's been handled.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && ref.trim()) localStorage.setItem('c7_ref', ref.trim());
    } catch { /* ignore */ }

    const tryAttach = async () => {
      const code = localStorage.getItem('c7_ref');
      if (!code) return;
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase.rpc('attach_referrer', { p_code: code });
      const r = data as { success?: boolean; message?: string } | null;
      // Clear once handled (success OR a terminal message like "already referred"
      // / "invalid code") so we don't keep retrying a dead code.
      if (r && (r.success || r.message)) localStorage.removeItem('c7_ref');
    };

    tryAttach();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') tryAttach();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
