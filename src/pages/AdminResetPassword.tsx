import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets a session via the hash; just wait for auth state
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // Listen briefly for the recovery event to populate
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) setReady(true);
        });
        setTimeout(() => sub.subscription.unsubscribe(), 5000);
      }
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const { error: uErr } = await supabase.auth.updateUser({ password });
      if (uErr) throw uErr;
      setDone(true);
      setTimeout(() => navigate("/admin/login", { replace: true }), 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#06180f" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(250,30%,6%)] via-[#06180f] to-[hsl(180,20%,4%)] pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "hsl(45,100%,60%,0.08)", border: "1px solid hsl(45,100%,60%,0.2)" }}>
            <Shield className="h-7 w-7 casino-gold-text" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reset Admin Password</h1>
          <p className="text-xs text-white/40 mt-1">Choose a new password to continue</p>
        </div>

        <div className="rounded-2xl border p-7 backdrop-blur-xl"
          style={{ background: "linear-gradient(180deg, rgba(15,15,30,0.85), rgba(8,8,16,0.9))", borderColor: "hsl(45,100%,60%,0.12)" }}>
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin casino-gold-text" />
              <p className="text-xs text-white/50">Waiting for reset link session…</p>
              <p className="text-[10px] text-white/30 text-center">Open this page from the email reset link.</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: "hsl(160,80%,45%)" }}>
                <Check className="h-6 w-6 text-black" />
              </div>
              <p className="text-sm font-semibold text-white">Password updated</p>
              <p className="text-xs text-white/40">Redirecting to admin sign-in…</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {[
                { label: "New Password", value: password, set: setPassword },
                { label: "Confirm Password", value: confirm, set: setConfirm },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[11px] font-semibold text-white/60 mb-1.5 tracking-wide uppercase">{f.label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <input
                      type="password"
                      required
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 focus:outline-none transition-colors disabled:opacity-50"
                      style={{ background: "hsl(0,0%,5%)", border: "1px solid hsl(0,0%,12%)" }}
                    />
                  </div>
                </div>
              ))}
              {error && <p className="text-xs font-medium text-center" style={{ color: "hsl(0,70%,60%)" }}>{error}</p>}
              <button type="submit" disabled={loading || !password || !confirm}
                className="w-full py-3 rounded-xl text-sm font-bold text-black casino-gold-gradient hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
