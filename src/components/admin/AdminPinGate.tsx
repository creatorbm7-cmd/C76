import { useState, useRef, useEffect } from "react";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";

interface AdminPinGateProps {
  onSuccess: () => void;
}

export default function AdminPinGate({ onSuccess }: AdminPinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "admin" | "denied">("loading");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user is logged in and has admin role before showing PIN gate
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setAuthStatus("denied");
        return;
      }
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
        setAuthStatus(data ? "admin" : "denied");
      });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || locked || !pin.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("verify-admin-pin", {
        body: { pin },
      });

      if (fnError) {
        // Parse the response body for details
        let parsed: any = {};
        try {
          parsed = typeof fnError === "object" && "context" in fnError
            ? JSON.parse((fnError as any).context?.body || "{}")
            : {};
        } catch {}

        if (parsed.locked) {
          setLocked(true);
          setError("Too many attempts. Please wait 15 minutes.");
        } else {
          setError(parsed.error || "Verification failed");
          if (parsed.remaining_attempts !== undefined) {
            setRemaining(parsed.remaining_attempts);
          }
          setShake(true);
          setTimeout(() => setShake(false), 600);
        }
        setPin("");
        inputRef.current?.focus();
        setLoading(false);
        return;
      }

      if (data?.success) {
        sessionStorage.setItem("dtx_admin_auth", data.session_token);
        onSuccess();
      } else if (data?.locked) {
        setLocked(true);
        setError("Too many attempts. Please wait 15 minutes.");
      } else {
        setError(data?.error || "Invalid PIN");
        if (data?.remaining_attempts !== undefined) {
          setRemaining(data.remaining_attempts);
        }
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (authStatus === "loading") return null;
  if (authStatus === "denied") return <Navigate to="/admin/login" replace />;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "#f4f6f8" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 70% at 50% -10%, rgba(22,163,74,0.08), transparent 55%)" }} />

      <div className={`relative w-full max-w-sm mx-4 ${shake ? "admin-shake" : ""}`}>
        <div
          className="rounded-2xl border p-8"
          style={{
            background: "#ffffff",
            borderColor: error ? "rgba(225,29,72,0.45)" : "rgba(15,23,42,0.10)",
            boxShadow: "0 12px 40px -12px rgba(15,23,42,0.18)",
          }}
        >
          <div className="flex justify-center mb-6">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.25)" }}
            >
              <Shield className="h-8 w-8" style={{ color: "#16a34a" }} />
            </div>
          </div>

          <h2 className="text-center text-lg font-bold mb-1" style={{ color: "#0f172a" }}>Admin Access</h2>
          <p className="text-center text-xs mb-6" style={{ color: "rgba(15,23,42,0.5)" }}>Enter admin code to continue</p>

          {locked ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertTriangle className="h-8 w-8" style={{ color: "#e11d48" }} />
              <p className="text-center text-sm font-semibold" style={{ color: "#e11d48" }}>
                Too many failed attempts
              </p>
              <p className="text-center text-xs" style={{ color: "rgba(15,23,42,0.5)" }}>
                Please wait 15 minutes before trying again.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(15,23,42,0.35)" }} />
                <input
                  ref={inputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Admin code..."
                  autoFocus
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono focus:outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: `1px solid ${error ? "rgba(225,29,72,0.5)" : "rgba(15,23,42,0.14)"}`,
                  }}
                />
              </div>

                {error && (
                  <div className="text-center">
                    <p className="text-xs font-semibold" style={{ color: "#e11d48" }}>
                      {error}
                    </p>
                    {remaining !== null && remaining > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: "rgba(15,23,42,0.45)" }}>
                        {remaining} attempt{remaining !== 1 ? "s" : ""} remaining
                      </p>
                    )}
                  </div>
                )}

              <button
                type="submit"
                disabled={loading || !pin.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #16a34a, #0b7a3f)" }}
              >
                {loading ? "Verifying..." : "Enter Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
