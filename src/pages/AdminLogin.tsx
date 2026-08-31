import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, KeyRound, Check, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Step = "credentials" | "role" | "pin" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "credentials", label: "Sign in" },
  { key: "role", label: "Verify role" },
  { key: "pin", label: "Admin PIN" },
  { key: "done", label: "Enter dashboard" },
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // If already fully authenticated (session + admin + valid pin token), skip ahead
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!isAdmin) return;
      const token = sessionStorage.getItem("dtx_admin_auth");
      if (token) {
        const { data: ok } = await (supabase.rpc as any)("validate_admin_pin_session", { p_token: token });
        if (ok === true) {
          navigate("/admin", { replace: true });
          return;
        }
      }
      setStep("pin");
      setTimeout(() => pinRef.current?.focus(), 50);
    })();
  }, [navigate]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        triggerShake();
        return;
      }
      setStep("role");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Could not load user.");
        setStep("credentials");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        setError("This account does not have admin access.");
        await supabase.auth.signOut();
        setStep("credentials");
        triggerShake();
        return;
      }
      setStep("pin");
      setTimeout(() => pinRef.current?.focus(), 50);
    } catch (err: any) {
      setError(err?.message || "Sign in failed");
      setStep("credentials");
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || locked || !pin.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-admin-pin", {
        body: { pin },
      });
      if (fnError) {
        let parsed: any = {};
        try {
          parsed = JSON.parse((fnError as any).context?.body || "{}");
        } catch {}
        if (parsed.locked) {
          setLocked(true);
          setError("Too many attempts. Please wait 15 minutes.");
        } else {
          setError(parsed.error || "Verification failed");
          if (parsed.remaining_attempts !== undefined) setRemaining(parsed.remaining_attempts);
          triggerShake();
        }
        setPin("");
        return;
      }
      if (data?.success) {
        sessionStorage.setItem("dtx_admin_auth", data.session_token);
        setStep("done");
        setTimeout(() => navigate("/admin", { replace: true }), 700);
      } else if (data?.locked) {
        setLocked(true);
        setError("Too many attempts. Please wait 15 minutes.");
      } else {
        setError(data?.error || "Invalid PIN");
        if (data?.remaining_attempts !== undefined) setRemaining(data.remaining_attempts);
        setPin("");
        triggerShake();
      }
    } catch (err: any) {
      setError(err?.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#06180f" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(15,85%,4%)] via-[#06180f] to-[hsl(15,90%,3%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(35,95%,55%) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(160,80%,50%) 0, transparent 40%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "hsl(45,100%,60%,0.08)", border: "1px solid hsl(45,100%,60%,0.2)" }}
          >
            <Shield className="h-7 w-7 casino-gold-text" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">C7 Winners Admin</h1>
          <p className="text-xs text-white/40 mt-1">Secure multi-step authentication</p>
        </div>

        {/* Stepper */}
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const completed = i < stepIndex || step === "done";
              const active = i === stepIndex && step !== "done";
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                      style={{
                        background: completed
                          ? "hsl(160,80%,45%)"
                          : active
                          ? "hsl(35,95%,55%)"
                          : "hsl(0,0%,10%)",
                        color: completed || active ? "#000" : "hsl(0,0%,40%)",
                        border: active ? "1px solid hsl(45,100%,70%)" : "1px solid transparent",
                        boxShadow: active ? "0 0 14px hsl(353,75%,55%,0.4)" : "none",
                      }}
                    >
                      {completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span
                      className="text-[10px] font-medium tracking-wide"
                      style={{ color: completed || active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-2 mt-[-14px]" style={{
                      background: completed
                        ? "linear-gradient(90deg, hsl(160,80%,45%), hsl(35,95%,55%))"
                        : "hsl(0,0%,12%)",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div
          className={`rounded-2xl border p-7 backdrop-blur-xl ${shake ? "admin-shake" : ""}`}
          style={{
            background: "linear-gradient(180deg, rgba(15,15,30,0.85), rgba(8,8,16,0.9))",
            borderColor: error ? "hsl(0,60%,40%,0.5)" : "hsl(45,100%,60%,0.12)",
          }}
        >
            {step === "credentials" && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-white/60 mb-1.5 tracking-wide uppercase">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <input
                      type="email"
                      autoComplete="username"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[hsl(353,75%,55%,0.4)] transition-colors disabled:opacity-50"
                      style={{ background: "hsl(0,0%,5%)", border: "1px solid hsl(0,0%,12%)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/60 mb-1.5 tracking-wide uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[hsl(353,75%,55%,0.4)] transition-colors disabled:opacity-50"
                      style={{ background: "hsl(0,0%,5%)", border: "1px solid hsl(0,0%,12%)" }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-medium text-center" style={{ color: "hsl(0,70%,60%)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="w-full py-3 rounded-xl text-sm font-bold text-black casino-gold-gradient hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!email.trim()) {
                      setError("Enter your admin email first");
                      return;
                    }
                    setLoading(true);
                    setError(null);
                    try {
                      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: `${window.location.origin}`,
                      });
                      if (rErr) throw rErr;
                      setError(null);
                      alert("Password reset email sent. Check your inbox.");
                    } catch (err: any) {
                      setError(err?.message || "Could not send reset email");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="block w-full text-center text-[11px] text-white/50 hover:text-white/80 transition-colors"
                >
                  Forgot password?
                </button>
              </form>
            )}

            {step === "role" && (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 className="h-7 w-7 animate-spin casino-gold-text" />
                <p className="text-sm text-white/60">Verifying admin role…</p>
              </div>
            )}

            {step === "pin" && (
              <form onSubmit={handlePin} className="space-y-4">
                <div className="text-center mb-2">
                  <p className="text-sm font-semibold text-white">Enter Admin PIN</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Final security step before the dashboard</p>
                </div>

                {locked ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                    <p className="text-center text-sm text-red-400 font-semibold">Too many failed attempts</p>
                    <p className="text-center text-xs text-white/30">Please wait 15 minutes before retrying.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                      <input
                        ref={pinRef}
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Admin code"
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono text-white placeholder:text-white/15 focus:outline-none focus:border-[hsl(353,75%,55%,0.4)] transition-colors disabled:opacity-50"
                        style={{ background: "hsl(0,0%,5%)", border: `1px solid ${error ? "hsl(0,60%,40%)" : "hsl(0,0%,12%)"}` }}
                      />
                    </div>

                    {error && (
                      <div className="text-center">
                        <p className="text-xs font-semibold" style={{ color: "hsl(0,70%,60%)" }}>{error}</p>
                        {remaining !== null && remaining > 0 && (
                          <p className="text-[10px] text-white/30 mt-1">
                            {remaining} attempt{remaining !== 1 ? "s" : ""} remaining
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !pin.trim()}
                      className="w-full py-3 rounded-xl text-sm font-bold text-black casino-gold-gradient hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                        </>
                      ) : (
                        <>
                          Unlock dashboard <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            )}

            {step === "done" && (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(160,80%,45%)" }}>
                  <Check className="h-6 w-6 text-black" />
                </div>
                <p className="text-sm font-semibold text-white">Access granted</p>
                <p className="text-xs text-white/40">Redirecting to admin dashboard…</p>
              </div>
            )}
        </div>

        <p className="text-center text-[10px] text-white/25 mt-6 tracking-wide">
          Restricted area · All access attempts are logged
        </p>
      </div>
    </div>
  );
}
