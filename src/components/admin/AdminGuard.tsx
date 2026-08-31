/**
 * AdminGuard — client-side role gate for operator (/admin/*) pages.
 *
 * Previously only /admin self-gated via AdminPinGate; the other operator
 * pages (payouts, deposits, users, bonuses, audit…) rendered their shell to
 * ANY visitor and relied entirely on server-side RLS. This adds defense in
 * depth: verify a logged-in session with the `admin` role, else redirect to
 * the admin login. (Server RLS / is_admin() edge checks remain the real
 * enforcement for data + money actions.)
 */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "admin" | "denied";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setStatus("denied"); return; }
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!alive) return;
      setStatus(!error && data ? "admin" : "denied");
    })();
    return () => { alive = false; };
  }, []);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--c7-bg, #ffffff)", display: "grid", placeItems: "center", color: "#9fc4ac", fontSize: 14, fontWeight: 700 }}>
        Verifying access…
      </div>
    );
  }
  if (status === "denied") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
