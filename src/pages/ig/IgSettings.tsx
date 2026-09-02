// IgSettings (/ig/settings) — Instagram-light reskin of DtxSettingsPage.
// Same account data + mutations (profile save, Telegram link/unlink, logout);
// only the returned JSX markup and CSS are new. All state, effects and handlers
// are copied verbatim from the dark page — no RPC/Supabase/auth call is altered.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, LogOut, HeartPulse, FileCheck2, Save, ChevronRight,
  Crown, Trophy, Gift, Wallet as WalletIcon,
  Send, CheckCircle2, Link2Off, Loader2, RefreshCw, Phone, ShieldCheck, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usd } from "@/lib/format";
import { telegramDeepLink } from "@/lib/telegram-link";
import { DIAL_CODES, toE164, isE164 } from "@/lib/phone";
import { toast } from "@/hooks/use-toast";
import { useDtxBalance } from "@/hooks/useDtxBalance";
import { useDtxStore } from "@/store/dtxStore";
import { useProfileStats } from "@/hooks/useProfileStats";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

export default function IgSettings() {
  useDtxBalance();
  const navigate = useNavigate();
  const balance = useDtxStore((s) => s.balance);
  const { stats } = useProfileStats();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notif, setNotif] = useState(true);
  const [saving, setSaving] = useState(false);

  // Telegram linking state.
  const [tgChatId, setTgChatId] = useState<string | null>(null);
  const [tgToken, setTgToken] = useState<string | null>(null);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const tgConnected = !!tgChatId;

  // Phone verify state (signed-in link/verify → auth.users.phone + profiles.phone).
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [phPhase, setPhPhase] = useState<"view" | "enter" | "code">("view");
  const [phDial, setPhDial] = useState("+91");
  const [phNat, setPhNat] = useState("");
  const [phOtp, setPhOtp] = useState("");
  const [phBusy, setPhBusy] = useState(false);
  const [phErr, setPhErr] = useState<string | null>(null);
  const [phResend, setPhResend] = useState(0);
  const phE164 = toE164(phDial, phNat);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      // auth.users.phone is the canonical verified number; fall back to the
      // profiles.phone mirror if auth doesn't carry one.
      const authPhone = (user.phone && user.phone.trim()) ? `+${user.phone.replace(/^\+/, "")}` : null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, telegram_notifications_enabled, telegram_chat_id, phone")
        .eq("id", user.id).maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        setName((row.full_name as string | null) ?? "");
        setNotif((row.telegram_notifications_enabled as boolean | null) ?? true);
        setTgChatId((row.telegram_chat_id as string | null) ?? null);
        setVerifiedPhone(authPhone ?? ((row.phone as string | null) ?? null));
      } else {
        setVerifiedPhone(authPhone);
      }
    })();
  }, [navigate]);

  // Resend-code cooldown countdown for the phone panel.
  useEffect(() => {
    if (phResend <= 0) return;
    const t = setTimeout(() => setPhResend((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearTimeout(t);
  }, [phResend]);

  // Mint a single-use link token and open the bot deep-link.
  const connectTelegram = async () => {
    setTgError(null);
    setTgBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_telegram_link_token");
      if (error || !data) throw new Error(error?.message || "Could not create a link code. Please try again.");
      const token = String(data);
      setTgToken(token);
      window.open(telegramDeepLink(token), "_blank", "noopener,noreferrer");
    } catch (e) {
      setTgError(errMsg(e, "Something went wrong. Please try again."));
    } finally {
      setTgBusy(false);
    }
  };

  // Re-check whether the /start handshake has bound the chat id yet.
  const refreshTelegram = async () => {
    if (!userId) return;
    setTgError(null);
    setTgBusy(true);
    try {
      // Read the freshest value straight from the DB.
      const { data } = await supabase
        .from("profiles").select("telegram_chat_id").eq("id", userId).maybeSingle();
      const chatId = ((data as Record<string, unknown> | null)?.telegram_chat_id as string | null) ?? null;
      setTgChatId(chatId);
      if (chatId) {
        setTgToken(null);
        toast({ title: "Telegram connected", description: "You'll now get alerts in Telegram." });
      } else {
        toast({ title: "Not connected yet", description: "Open the bot and press Start, then check again." });
      }
    } catch (e) {
      setTgError(errMsg(e, "Could not refresh. Please try again."));
    } finally {
      setTgBusy(false);
    }
  };

  const disconnectTelegram = async () => {
    setTgError(null);
    setTgBusy(true);
    try {
      const { error } = await supabase.rpc("unlink_telegram");
      if (error) throw new Error(error.message);
      setTgChatId(null);
      setTgToken(null);
      toast({ title: "Telegram disconnected" });
    } catch (e) {
      setTgError(errMsg(e, "Could not disconnect. Please try again."));
    } finally {
      setTgBusy(false);
    }
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, telegram_notifications_enabled: notif } as never)
      .eq("id", userId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved" });
  };

  // Phone: signed-in link/verify. updateUser({ phone }) sends an SMS change code;
  // verifyOtp(type:'phone_change') confirms it onto auth.users.phone; we then
  // mirror to profiles.phone using the same self-update pattern as `save`.
  const sendPhoneCode = async () => {
    setPhErr(null);
    if (!isE164(phE164)) { setPhErr("Enter a valid mobile number (with country code)."); return; }
    setPhBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: phE164 });
      if (error) setPhErr(error.message);
      else {
        setPhPhase("code");
        setPhResend(45);
        toast({ title: "Code sent", description: `We texted a code to ${phE164}.` });
      }
    } catch (e) {
      setPhErr(errMsg(e, "Could not send the code. Please try again."));
    } finally {
      setPhBusy(false);
    }
  };

  const verifyPhone = async () => {
    setPhErr(null);
    const token = phOtp.replace(/\D/g, "");
    if (token.length < 4) { setPhErr("Enter the code from the SMS."); return; }
    setPhBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: phE164, token, type: "phone_change" });
      if (error) { setPhErr(error.message); return; }
      if (!data.session && !data.user) { setPhErr("Could not verify that code. Please try again."); return; }
      // Mirror the verified number into the app profile (RLS self-update).
      if (userId) {
        await supabase.from("profiles").update({ phone: phE164 } as never).eq("id", userId);
      }
      setVerifiedPhone(phE164);
      setPhPhase("view");
      setPhOtp("");
      setPhNat("");
      toast({ title: "Phone verified", description: `${phE164} is now on your account.` });
    } catch (e) {
      setPhErr(errMsg(e, "Verification failed. Please try again."));
    } finally {
      setPhBusy(false);
    }
  };

  const startPhoneEdit = () => { setPhErr(null); setPhOtp(""); setPhNat(""); setPhPhase("enter"); };

  const logout = async () => {
    try {
      sessionStorage.removeItem("dtx_games_filters_v1");
      localStorage.removeItem("dtx_recent_games");
    } catch { /* noop */ }
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const initial = (name || email || "C7").trim().charAt(0).toUpperCase();
  const memberSince = stats.member_since ? new Date(stats.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";

  const SHORTCUTS = [
    { icon: <WalletIcon className="h-5 w-5" />, label: "Wallet", to: "/ig/wallet" },
    { icon: <Gift className="h-5 w-5" />, label: "Bonuses", to: "/ig/bonuses" },
    { icon: <Crown className="h-5 w-5" />, label: "VIP", to: "/ig/vip" },
    { icon: <Trophy className="h-5 w-5" />, label: "Refer", to: "/ig/invite" },
  ];

  return (
    <div className="ig igset">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igset-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/ig/profile"))} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className="ig-ttl">Settings</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igset-main">
        <div className="ige-hero"><img src="/icons/v3/hdr/settings.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
        {/* Profile summary */}
        <section className="igset-hero">
          <span className="igset-ava">{initial}</span>
          <div className="igset-hero-txt">
            <div className="igset-hero-name">{name || email.split("@")[0] || "Player"}</div>
            <div className="igset-hero-sub">Member since {memberSince}</div>
          </div>
          <div className="igset-hero-bal">
            <span className="igset-hero-bal-k">Balance</span>
            <span className="igset-hero-bal-v">{usd(balance)}</span>
          </div>
        </section>

        {/* Personal info */}
        <div className="igset-sec"><span>👤</span> Personal info</div>
        <section className="igset-card">
          <Field label="Email"><div className="igset-email">{email}</div></Field>
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" className="igset-input" />
          </Field>
          <Field label="Telegram notifications">
            <label className="igset-toggle-row">
              <Toggle on={notif} onChange={setNotif} />
              <span className="igset-note">Send me Telegram alerts for wins, deposits &amp; withdrawals</span>
            </label>
          </Field>
          <button onClick={save} disabled={saving} className="igset-save">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </section>

        {/* Phone number */}
        <div className="igset-sec"><span>📱</span> Phone number</div>
        <section className="igset-card igset-tg">
          <div className="igset-tg-head">
            <span className={`igset-tg-ic ${verifiedPhone && phPhase === "view" ? "on" : ""}`}>
              {verifiedPhone && phPhase === "view" ? <ShieldCheck className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </span>
            <div className="igset-tg-head-txt">
              <div className="igset-tg-title">
                {verifiedPhone && phPhase === "view" ? "Phone verified" : "Add your mobile number"}
              </div>
              <div className="igset-tg-sub">
                {verifiedPhone && phPhase === "view"
                  ? verifiedPhone
                  : "Verify a mobile number for account recovery and alerts."}
              </div>
            </div>
            {verifiedPhone && phPhase === "view" && <span className="igset-tg-badge">VERIFIED</span>}
          </div>

          {phErr && <div className="igset-tg-err" role="alert">{phErr}</div>}

          {phPhase === "view" ? (
            <button onClick={startPhoneEdit} className="igset-tg-btn ghost">
              <Pencil className="h-4 w-4" /> {verifiedPhone ? "Change number" : "Add number"}
            </button>
          ) : phPhase === "enter" ? (
            <>
              <div className="igset-phone-row">
                <select className="igset-dial" value={phDial} onChange={(e) => setPhDial(e.target.value)} aria-label="Country code">
                  {DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  type="tel" inputMode="numeric" value={phNat}
                  onChange={(e) => setPhNat(e.target.value)}
                  placeholder="98765 43210" autoComplete="tel-national"
                  className="igset-input igset-phone-input"
                />
              </div>
              <div className="igset-tg-row">
                <button onClick={() => { setPhPhase("view"); setPhErr(null); }} disabled={phBusy} className="igset-tg-btn ghost">
                  Cancel
                </button>
                <button onClick={sendPhoneCode} disabled={phBusy || !isE164(phE164)} className="igset-tg-btn solid">
                  {phBusy ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
                  Send code
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="igset-tg-sub" style={{ marginTop: -2 }}>Code sent to <b style={{ color: "#f3ffe9" }}>{phE164}</b></div>
              <input
                type="text" inputMode="numeric" value={phOtp}
                onChange={(e) => setPhOtp(e.target.value)}
                placeholder="6-digit code" autoComplete="one-time-code" maxLength={8}
                className="igset-input igset-otp"
              />
              <button onClick={verifyPhone} disabled={phBusy || phOtp.replace(/\D/g, "").length < 4} className="igset-tg-btn solid">
                {phBusy ? <Loader2 className="h-4 w-4 spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Verify &amp; save
              </button>
              <div className="igset-tg-row">
                <button onClick={sendPhoneCode} disabled={phBusy || phResend > 0} className="igset-tg-btn ghost">
                  {phResend > 0 ? `Resend in ${phResend}s` : "Resend code"}
                </button>
                <button onClick={startPhoneEdit} disabled={phBusy} className="igset-tg-btn ghost">
                  Change number
                </button>
              </div>
            </>
          )}
        </section>

        {/* Connect Telegram */}
        <div className="igset-sec"><span>✈️</span> Connect Telegram</div>
        <section className="igset-card igset-tg">
          <div className="igset-tg-head">
            <span className={`igset-tg-ic ${tgConnected ? "on" : ""}`}>
              {tgConnected ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </span>
            <div className="igset-tg-head-txt">
              <div className="igset-tg-title">
                {tgConnected ? "Telegram connected" : "Get instant alerts on Telegram"}
              </div>
              <div className="igset-tg-sub">
                {tgConnected
                  ? "Your account is linked. We'll message you about wins, deposits & withdrawals."
                  : "Link your account to receive wins, deposits & withdrawal updates in Telegram."}
              </div>
            </div>
            {tgConnected && <span className="igset-tg-badge">LINKED</span>}
          </div>

          {tgError && <div className="igset-tg-err" role="alert">{tgError}</div>}

          {tgConnected ? (
            <button onClick={disconnectTelegram} disabled={tgBusy} className="igset-tg-btn danger">
              {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <Link2Off className="h-4 w-4" />}
              {tgBusy ? "Working…" : "Disconnect Telegram"}
            </button>
          ) : tgToken ? (
            <>
              <div className="igset-tg-code">
                <span className="igset-tg-code-l">Your one-time code</span>
                <span className="igset-tg-code-v">{tgToken}</span>
              </div>
              <p className="igset-tg-hint">
                Telegram should have opened — press <b>Start</b> there to finish. Didn't open?
                Open <b>@dtx_creatorbot</b> and send <b>/start {tgToken}</b>.
              </p>
              <div className="igset-tg-row">
                <button onClick={connectTelegram} disabled={tgBusy} className="igset-tg-btn ghost">
                  {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
                  Reopen Telegram
                </button>
                <button onClick={refreshTelegram} disabled={tgBusy} className="igset-tg-btn solid">
                  {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <RefreshCw className="h-4 w-4" />}
                  I've connected
                </button>
              </div>
            </>
          ) : (
            <button onClick={connectTelegram} disabled={tgBusy} className="igset-tg-btn solid">
              {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
              {tgBusy ? "Preparing…" : "Connect Telegram"}
            </button>
          )}
        </section>

        {/* Shortcuts */}
        <div className="igset-sec"><span>⚡</span> Shortcuts</div>
        <div className="igset-shortcuts">
          {SHORTCUTS.map((s) => (
            <button key={s.label} className="igset-short" onClick={() => navigate(s.to)}>
              <span className="igset-short-ic">{s.icon}</span>
              <span className="igset-short-l">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Account & safety */}
        <div className="igset-sec"><span>🛡️</span> Account &amp; safety</div>
        <div className="igset-rows">
          <NavRow to="/ig/kyc" icon={<FileCheck2 className="h-4 w-4" />} label="KYC Verification" navigate={navigate} />
          <NavRow to="/ig/responsible" icon={<HeartPulse className="h-4 w-4" />} label="Responsible Gaming" navigate={navigate} />
        </div>

        <button onClick={logout} className="igset-logout">
          <LogOut className="h-4 w-4" /> Logout
        </button>

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="igset-field">
      <div className="igset-field-l">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="igset-toggle" style={{ background: on ? "var(--grn)" : "rgba(9,32,20,0.7)" }}>
      <span className="igset-toggle-dot" style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

function NavRow({ to, icon, label, navigate }: { to: string; icon: React.ReactNode; label: string; navigate: (to: string) => void }) {
  return (
    <button className="igset-row" onClick={() => navigate(to)}>
      <span className="igset-row-ic">{icon}</span>
      <span className="igset-row-l">{label}</span>
      <ChevronRight className="h-4 w-4" style={{ color: "var(--mut)" }} />
    </button>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igset-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igset-main { padding:14px 14px 24px; }
.ige-hero { text-align:center; } .ige-hero img { max-width:110px; height:auto; opacity:0.9; filter:drop-shadow(0 8px 18px rgba(0,0,0,0.5)); }

/* Profile hero — cinematic gold-framed cabinet + sheen sweep */
.igset-hero { position:relative; overflow:hidden; display:flex; align-items:center; gap:13px; border:1px solid transparent; border-radius:22px; padding:16px 18px;
  background:radial-gradient(130% 120% at 100% 0%, rgba(46,224,138,0.16), transparent 60%), radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.14), transparent 58%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.46), inset 0 1.6px 0 rgba(255,255,255,0.22), inset 0 0 30px rgba(46,224,138,0.08), 0 0 26px -8px rgba(240,201,74,0.42), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igset-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igset-sweep 7s ease-in-out infinite; }
@keyframes igset-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igset-ava { position:relative; z-index:1; width:54px; height:54px; border-radius:50%; flex-shrink:0; display:grid; place-items:center; font-size:23px; font-weight:900; color:#3a2708;
  background:conic-gradient(from 210deg,#fff4cf,#37e29a,#0e7a4a,#f0c94a,#fff4cf); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 0 18px -4px rgba(240,201,74,0.6); }
.igset-hero-txt { position:relative; z-index:1; flex:1; min-width:0; }
.igset-hero-name { font-size:17px; font-weight:800; color:#f3ffe9; text-transform:capitalize; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.igset-hero-sub { font-size:12px; color:var(--mut); margin-top:2px; font-weight:600; }
.igset-hero-bal { position:relative; z-index:1; display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; }
.igset-hero-bal-k { font-size:10px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; color:var(--mut); }
.igset-hero-bal-v { font-size:20px; font-weight:900; font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 60%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

.igset-sec { display:flex; align-items:center; gap:7px; margin:22px 4px 9px; font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; color:#f3ffe9; }
.igset-sec span { font-size:13px; }
.igset-card { border:1px solid transparent; border-radius:20px; padding:16px;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }

.igset-field { margin-bottom:14px; }
.igset-field:last-of-type { margin-bottom:0; }
.igset-field-l { font-size:10px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--mut); margin-bottom:6px; }
.igset-email { font-size:13.5px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; }
.igset-input { width:100%; background:rgba(4,16,10,0.6); border:1px solid var(--line); border-radius:11px; padding:12px 13px; font-size:14px; color:var(--ink); outline:none; transition:border-color .15s, box-shadow .15s;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.05); }
.igset-input:focus { border-color:var(--grn); box-shadow:inset 0 1px 0 rgba(246,230,176,0.05), 0 0 0 3px rgba(46,224,138,0.18); }
.igset-input::placeholder { color:var(--faint); }
.igset-phone-row { display:flex; gap:8px; }
.igset-dial { flex:0 0 auto; width:82px; background:rgba(4,16,10,0.6); border:1px solid var(--line); border-radius:11px; padding:12px 10px; font-size:14px; font-weight:800; color:var(--ink); outline:none; cursor:pointer; }
.igset-dial:focus { border-color:var(--grn); box-shadow:0 0 0 3px rgba(46,224,138,0.18); }
.igset-phone-input { flex:1; }
.igset-otp { letter-spacing:6px; font-size:17px; font-weight:800; text-align:center; }
.igset-toggle-row { display:flex; align-items:center; gap:12px; cursor:pointer; user-select:none; }
.igset-note { font-size:12.5px; color:var(--mut); line-height:1.35; }
.igset-toggle { position:relative; width:44px; height:24px; border-radius:999px; border:1px solid var(--line); cursor:pointer; transition:background .2s; flex-shrink:0; box-shadow:inset 0 1px 2px rgba(0,0,0,0.4); }
.igset-toggle-dot { position:absolute; top:2px; width:20px; height:20px; background:#f6fff9; border-radius:50%; transition:left .18s ease; box-shadow:0 1px 3px rgba(0,0,0,0.45); }
.igset-save { width:100%; margin-top:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px; border-radius:13px; cursor:pointer; border:1px solid rgba(255,255,255,0.3);
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); color:#3a2708; font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6), 0 8px 18px -8px rgba(0,0,0,0.6); }
.igset-save:active { transform:translateY(1px); }
.igset-save:disabled { opacity:0.6; cursor:default; }

.igset-tg { display:flex; flex-direction:column; gap:12px; }
.igset-tg-head { display:flex; align-items:flex-start; gap:12px; }
.igset-tg-ic { width:42px; height:42px; border-radius:13px; display:grid; place-items:center; flex-shrink:0; color:var(--antique);
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.igset-tg-ic.on { color:#04180e; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); border-color:transparent; box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 0 14px -4px rgba(46,224,138,0.6); }
.igset-tg-head-txt { flex:1; min-width:0; }
.igset-tg-title { font-size:14px; font-weight:800; color:#f3ffe9; }
.igset-tg-sub { font-size:12px; color:var(--mut); margin-top:2px; line-height:1.35; }
.igset-tg-badge { flex-shrink:0; align-self:center; font-size:9.5px; font-weight:900; letter-spacing:0.8px; padding:4px 9px; border-radius:999px; color:#04180e;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 0 12px -3px rgba(46,224,138,0.6); }
.igset-tg-err { font-size:12px; font-weight:600; color:var(--loss); padding:9px 12px; border-radius:11px; background:rgba(255,107,125,0.1); border:1px solid rgba(255,107,125,0.4); }
.igset-tg-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; width:100%; border-radius:12px; cursor:pointer; border:1px solid var(--line); }
.igset-tg-btn:active { transform:translateY(1px); }
.igset-tg-btn.solid { border-color:transparent; color:#04180e; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5), 0 0 16px -4px rgba(46,224,138,0.6), 0 6px 14px -6px rgba(0,0,0,0.5); }
.igset-tg-btn.ghost { background:rgba(4,16,10,0.55); color:#eafff4; }
.igset-tg-btn.danger { background:rgba(255,107,125,0.1); border:1px solid rgba(255,107,125,0.45); color:var(--loss); }
.igset-tg-btn:disabled { opacity:0.6; cursor:default; }
.igset-tg-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.igset-tg-code { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 14px; border-radius:13px; background:rgba(4,16,10,0.6); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.06); }
.igset-tg-code-l { font-size:10px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--mut); }
.igset-tg-code-v { font-size:20px; font-weight:800; letter-spacing:3px; font-family:"Space Mono",monospace;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 60%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igset-tg-hint { font-size:12px; color:var(--mut); line-height:1.45; }
.igset-tg-hint b { color:#f3ffe9; font-weight:800; }
.spin { animation:igset-spin 0.9s linear infinite; }
@keyframes igset-spin { to { transform:rotate(360deg); } }

.igset-shortcuts { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; }
.igset-short { display:flex; flex-direction:column; align-items:center; gap:8px; padding:15px 4px; cursor:pointer; border:1px solid transparent; border-radius:16px; color:#eafff4;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); }
.igset-short:active { transform:scale(0.97); }
.igset-short-ic { width:42px; height:42px; border-radius:13px; display:grid; place-items:center; color:var(--antique); background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.igset-short-l { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; }

.igset-rows { display:flex; flex-direction:column; gap:9px; }
.igset-row { display:flex; align-items:center; gap:12px; width:100%; padding:14px 15px; cursor:pointer; text-align:left; border:1px solid transparent; border-radius:16px; color:#eafff4;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); }
.igset-row:active { transform:scale(0.99); }
.igset-row-ic { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; color:var(--antique); flex-shrink:0; background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.igset-row-l { flex:1; font-size:14px; font-weight:700; }

.igset-logout { width:100%; margin-top:22px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:14px; cursor:pointer;
  background:rgba(255,107,125,0.1); border:1px solid rgba(255,107,125,0.45); color:var(--loss); font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; }
.igset-logout:active { transform:translateY(1px); }
@media (prefers-reduced-motion: reduce) { .spin, .igset-hero::after { animation:none; } .igset-short:active, .igset-row:active, .igset-save:active, .igset-tg-btn:active, .igset-logout:active { transform:none; } }
`;
