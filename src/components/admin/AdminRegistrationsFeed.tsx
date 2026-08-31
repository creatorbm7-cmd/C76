import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Mail, Clock, ShieldCheck, Sparkles } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  email_verified?: boolean | null;
  account_status?: string | null;
  kyc_status?: string | null;
}

const fmtAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function AdminRegistrationsFeed() {
  const [items, setItems] = useState<Profile[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [pulseId, setPulseId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, email_verified, account_status, kyc_status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setItems((data || []) as Profile[]);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        setTodayCount((data || []).filter((d: any) => +new Date(d.created_at) >= +todayStart).length);
      }
    })();

    const ch = supabase
      .channel("admin-registrations-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as Profile;
        setItems((prev) => [row, ...prev].slice(0, 50));
        setTodayCount((c) => c + 1);
        setPulseId(row.id);
        setTimeout(() => setPulseId(null), 1200);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as Profile;
        setItems((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)));
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">New Registrations</h2>
          <p className="text-xs text-white/50">Live feed — last 7 days</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 ring-1 ring-emerald-400/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] uppercase tracking-widest text-emerald-300 font-semibold">Live</span>
          </div>
          <div className="bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Today</div>
            <div className="text-sm font-bold text-white">{todayCount}</div>
          </div>
        </div>
      </header>

      <div className="adm-glass rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white/90">Recent Sign-ups</h3>
        </div>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-white/[0.04]">
          {items.map((p) => {
            const onboardingComplete = !!p.full_name && !!p.email_verified;
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${pulseId === p.id ? "bg-amber-500/10" : ""}`}>
                <div className="h-9 w-9 rounded-full casino-gold-gradient flex items-center justify-center flex-shrink-0 text-black text-sm font-bold">
                  {(p.full_name?.[0] || p.email?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{p.full_name || "Unnamed user"}</p>
                    {pulseId === p.id && (
                      <span className="text-[9px] uppercase tracking-widest font-bold text-amber-400 inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> New
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email || "—"}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${onboardingComplete ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {onboardingComplete ? <><ShieldCheck className="h-2.5 w-2.5 inline mr-0.5" />Onboarded</> : "Pending"}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtAgo(p.created_at)}</span>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div className="px-4 py-12 text-center text-xs text-white/30">No recent registrations</div>}
        </div>
      </div>
    </div>
  );
}
