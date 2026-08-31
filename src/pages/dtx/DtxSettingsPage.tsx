import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, LogOut, HeartPulse, FileCheck2, Save, ChevronRight,
  Crown, Trophy, Gift, Wallet as WalletIcon,
  Send, CheckCircle2, Link2Off, Loader2, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usd } from "@/lib/format";
import { telegramDeepLink } from "@/lib/telegram-link";
import { toast } from "@/hooks/use-toast";
import { useDtxBalance } from "@/hooks/useDtxBalance";
import { useDtxStore } from "@/store/dtxStore";
import { useProfileStats } from "@/hooks/useProfileStats";
import C7Icon from "@/components/c7/C7Icon";

/**
 * DtxSettingsPage (/settings) — premium gold+emerald 3D reskin.
 * Same data + logic (profile save, display currency, notifications, logout);
 * restyled with the shared c7p premium primitives to match Home/Wallet/Profile.
 */
export default function DtxSettingsPage() {
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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name, telegram_notifications_enabled, telegram_chat_id")
        .eq("id", user.id).maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        setName((row.full_name as string | null) ?? "");
        setNotif((row.telegram_notifications_enabled as boolean | null) ?? true);
        setTgChatId((row.telegram_chat_id as string | null) ?? null);
      }
    })();
  }, [navigate]);

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

  const STATS = [
    { k: "Wagered", v: usd(stats.total_wagered), c: "#ffe27a", hint: `${stats.bets_placed} bets` },
    { k: "Won", v: usd(stats.total_won), c: "#2ee08a" },
    { k: "Deposited", v: usd(stats.total_deposited), c: "#fff" },
    { k: "Net P/L", v: `${stats.net_profit >= 0 ? "+" : "-"}${usd(Math.abs(stats.net_profit))}`, c: stats.net_profit >= 0 ? "#2ee08a" : "#ff6a7d" },
  ];
  const SHORTCUTS = [
    { icon: <WalletIcon className="h-5 w-5" />, label: "Wallet", to: "/v3/wallet" },
    { icon: <Gift className="h-5 w-5" />, label: "Bonuses", to: "/bonuses" },
    { icon: <Crown className="h-5 w-5" />, label: "VIP", to: "/v3/profile/vip" },
    { icon: <Trophy className="h-5 w-5" />, label: "Refer", to: "/agent" },
  ];

  return (
    <div className="c7p-page c7p-pg-root">
      <style>{CSS}</style>
      <header className="c7p-pg-bar">
        <button className="c7p-pg-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/v3"))} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="c7p-pg-title c7p-gold-text">Settings</span>
      </header>
      <main className="c7p-pg-main">
        {/* Hero */}
        <section className="c7p-card-gold set-hero">
          <span className="set-shine" />
          <div className="set-hero-top">
            <div>
              <div className="set-eyebrow c7p-gold-text">MY PROFILE</div>
              <div className="set-name c7p-title tt-gold">{name || email.split("@")[0] || "Player"}</div>
              <div className="set-sub">Member since {memberSince}</div>
            </div>
            <div className="set-avatar">{initial}</div>
          </div>
          <div className="set-bal-k"><C7Icon name="coin" size={14} /> Balance</div>
          <div className="set-bal-v">{usd(balance)}</div>
          <div className="set-hero-btns">
            <button className="c7p-btn-green set-btn" onClick={() => navigate("/v3/wallet")}>Wallet</button>
            <button className="c7p-btn-gold set-btn" onClick={() => navigate("/bonuses")}>Bonuses</button>
          </div>
        </section>

        {/* Stats */}
        <div className="set-stats">
          {STATS.map((s) => (
            <div key={s.k} className="c7p-panel set-stat">
              <div className="set-stat-k">{s.k}</div>
              <div className="set-stat-v" style={{ color: s.c }}>{s.v}</div>
              {s.hint && <div className="set-stat-hint">{s.hint}</div>}
            </div>
          ))}
        </div>

        {/* Personal info */}
        <div className="c7p-sec set-sec"><span className="c7p-sec-ic"><C7Icon name="users" size={16} /></span><span className="c7p-sec-t">Personal info</span><span className="c7p-sec-rule" /></div>
        <section className="c7p-panel set-card">
          <Field label="Email"><div className="set-email">{email}</div></Field>
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" className="set-input" />
          </Field>
          <Field label="Telegram notifications">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle on={notif} onChange={setNotif} />
              <span className="set-note">Send me Telegram alerts for wins, deposits &amp; withdrawals</span>
            </label>
          </Field>
          <button onClick={save} disabled={saving} className="c7p-btn-gold set-save">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </section>

        {/* Connect Telegram */}
        <div className="c7p-sec set-sec"><span className="c7p-sec-ic">✈️</span><span className="c7p-sec-t">Connect Telegram</span><span className="c7p-sec-rule" /></div>
        <section className="c7p-panel set-card set-tg">
          <div className="set-tg-head">
            <span className={`set-tg-ic ${tgConnected ? "on" : ""}`}>
              {tgConnected ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </span>
            <div className="set-tg-head-txt">
              <div className="set-tg-title">
                {tgConnected ? "Telegram connected" : "Get instant alerts on Telegram"}
              </div>
              <div className="set-tg-sub">
                {tgConnected
                  ? "Your account is linked. We'll message you about wins, deposits & withdrawals."
                  : "Link your account to receive wins, deposits & withdrawal updates in Telegram."}
              </div>
            </div>
            {tgConnected && <span className="set-tg-badge">LINKED</span>}
          </div>

          {tgError && <div className="set-tg-err" role="alert">{tgError}</div>}

          {tgConnected ? (
            <button onClick={disconnectTelegram} disabled={tgBusy} className="set-tg-btn danger">
              {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <Link2Off className="h-4 w-4" />}
              {tgBusy ? "Working…" : "Disconnect Telegram"}
            </button>
          ) : tgToken ? (
            <>
              <div className="set-tg-code">
                <span className="set-tg-code-l">Your one-time code</span>
                <span className="set-tg-code-v">{tgToken}</span>
              </div>
              <p className="set-tg-hint">
                Telegram should have opened — press <b>Start</b> there to finish. Didn't open?
                Open <b>@dtx_creatorbot</b> and send <b>/start {tgToken}</b>.
              </p>
              <div className="set-tg-row">
                <button onClick={connectTelegram} disabled={tgBusy} className="c7p-btn-green set-tg-btn">
                  {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
                  Reopen Telegram
                </button>
                <button onClick={refreshTelegram} disabled={tgBusy} className="c7p-btn-gold set-tg-btn">
                  {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <RefreshCw className="h-4 w-4" />}
                  I've connected
                </button>
              </div>
            </>
          ) : (
            <button onClick={connectTelegram} disabled={tgBusy} className="c7p-btn-green set-tg-btn">
              {tgBusy ? <Loader2 className="h-4 w-4 spin" /> : <Send className="h-4 w-4" />}
              {tgBusy ? "Preparing…" : "Connect Telegram"}
            </button>
          )}
        </section>

        {/* Shortcuts */}
        <div className="c7p-sec set-sec"><span className="c7p-sec-ic"><C7Icon name="bolt" size={16} /></span><span className="c7p-sec-t">Shortcuts</span><span className="c7p-sec-rule" /></div>
        <div className="set-shortcuts">
          {SHORTCUTS.map((s) => (
            <button key={s.label} className="c7p-panel set-short" onClick={() => navigate(s.to)}>
              <span className="set-short-ic">{s.icon}</span>
              <span className="set-short-l">{s.label}</span>
            </button>
          ))}
        </div>

        {/* More */}
        <div className="c7p-sec set-sec"><span className="c7p-sec-ic"><C7Icon name="shield" size={16} /></span><span className="c7p-sec-t">Account &amp; safety</span><span className="c7p-sec-rule" /></div>
        <div className="space-y-2">
          <NavRow to="/kyc" icon={<FileCheck2 className="h-4 w-4" />} label="KYC Verification" navigate={navigate} />
          <NavRow to="/responsible" icon={<HeartPulse className="h-4 w-4" />} label="Responsible Gaming" navigate={navigate} />
        </div>

        <button onClick={logout} className="set-logout">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </main>
    </div>
  );
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="set-field">
      <div className="set-field-l">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="set-toggle" style={{ background: on ? "linear-gradient(180deg,#2ee08a,#12a04f)" : "rgba(255,255,255,0.14)" }}>
      <span className="set-toggle-dot" style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

function NavRow({ to, icon, label, navigate }: { to: string; icon: React.ReactNode; label: string; navigate: (to: string) => void }) {
  return (
    <button className="c7p-panel set-row" onClick={() => navigate(to)}>
      <span className="set-row-ic">{icon}</span>
      <span className="set-row-l">{label}</span>
      <ChevronRight className="h-4 w-4" style={{ color: "#6b7c72" }} />
    </button>
  );
}

const CSS = `
.set-hero { position: relative; overflow: hidden; padding: 18px; }
.set-shine { position: absolute; top: 0; left: -60%; width: 45%; height: 100%; transform: skewX(-20deg); pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent); animation: set-shine 4s ease-in-out infinite; }
@keyframes set-shine { 0% { left: -60%; } 55%,100% { left: 130%; } }
.set-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.set-eyebrow { font-size: 11px; font-weight: 900; letter-spacing: 2px; }
.set-name { font-size: 24px; font-weight: 900; line-height: 1.05; margin-top: 2px; text-transform: capitalize;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
.set-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 3px; font-weight: 600; }
.set-avatar { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
  font-size: 22px; font-weight: 900; color: #04240f; border: 2px solid rgba(255,231,160,0.7);
  background: radial-gradient(120% 100% at 50% 14%, rgba(255,255,255,0.6), transparent 52%), linear-gradient(180deg,#2ee08a,#12a04f 60%,#0a7a3c);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), 0 6px 16px -4px rgba(46,224,138,0.6); }
.set-bal-k { margin-top: 16px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.85); }
.set-bal-v { font-size: 40px; font-weight: 900; letter-spacing: -1px; color: #ffe9a8; line-height: 1.05; font-variant-numeric: tabular-nums;
  text-shadow: 0 0 18px rgba(255,180,40,0.5); }
.set-bal-v small { font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.6); margin-left: 7px; letter-spacing: 0.5px; }
.set-hero-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.set-btn { width: 100%; padding: 11px; font-size: 14px; }

.set-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.set-stat { padding: 13px 14px; }
.set-stat-k { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.5); }
.set-stat-v { font-size: 19px; font-weight: 900; font-variant-numeric: tabular-nums; margin-top: 3px; }
.set-stat-hint { font-size: 9.5px; color: rgba(255,255,255,0.45); margin-top: 2px; font-weight: 600; }

.set-title { margin: 22px 2px 10px; }
.set-card { padding: 15px 16px; }
.set-field { margin-bottom: 14px; }
.set-field:last-of-type { margin-bottom: 0; }
.set-field-l { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #8fb0a0; margin-bottom: 6px; }
.set-email { font-size: 13px; font-family: "Space Mono", monospace; color: rgba(255,255,255,0.72); overflow: hidden; text-overflow: ellipsis; }
.set-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.25); border-radius: 11px; padding: 11px 13px; font-size: 14px; color: #fff; outline: none; transition: border-color .15s; }
.set-input:focus { border-color: rgba(46,224,138,0.7); }
.set-input::placeholder { color: rgba(255,255,255,0.35); }
.set-note { font-size: 12px; color: rgba(255,255,255,0.6); }
.set-toggle { position: relative; width: 44px; height: 24px; border-radius: 999px; border: none; cursor: pointer; transition: background .2s; flex-shrink: 0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.4); }
.set-toggle-dot { position: absolute; top: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: left .18s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
.set-save { width: 100%; margin-top: 6px; padding: 13px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }

.set-tg { display: flex; flex-direction: column; gap: 12px; }
.set-tg-head { display: flex; align-items: flex-start; gap: 12px; }
.set-tg-ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; color: #2ee08a;
  background: linear-gradient(160deg, rgba(46,224,138,0.18), rgba(46,224,138,0.04)); border: 1px solid rgba(255,214,120,0.28); }
.set-tg-ic.on { color: #04240f; background: linear-gradient(180deg,#2ee08a,#12a04f); border-color: rgba(255,231,160,0.7);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px -3px rgba(46,224,138,0.55); }
.set-tg-head-txt { flex: 1; min-width: 0; }
.set-tg-title { font-size: 14px; font-weight: 800; color: #fff; }
.set-tg-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; line-height: 1.35; }
.set-tg-badge { flex-shrink: 0; align-self: center; font-size: 9.5px; font-weight: 900; letter-spacing: 1px; padding: 4px 8px; border-radius: 999px;
  color: #04240f; background: linear-gradient(180deg,#ffe27a,#e5b53a); box-shadow: 0 2px 8px -2px rgba(255,200,60,0.6); }
.set-tg-err { font-size: 12px; font-weight: 600; color: #ff8fb0; padding: 9px 12px; border-radius: 10px;
  background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.35); }
.set-tg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.5px; width: 100%; }
.set-tg-btn.danger { border-radius: 14px; cursor: pointer; background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.4); color: #ff8fb0; }
.set-tg-btn:disabled { opacity: 0.6; cursor: default; }
.set-tg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.set-tg-code { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: 12px;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.28); }
.set-tg-code-l { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #8fb0a0; }
.set-tg-code-v { font-size: 20px; font-weight: 900; letter-spacing: 3px; font-family: "Space Mono", monospace; color: #ffe9a8;
  text-shadow: 0 0 14px rgba(255,180,40,0.45); }
.set-tg-hint { font-size: 12px; color: rgba(255,255,255,0.62); line-height: 1.45; }
.set-tg-hint b { color: #ffe9a8; font-weight: 800; }
.spin { animation: set-spin 0.9s linear infinite; }
@keyframes set-spin { to { transform: rotate(360deg); } }

.set-shortcuts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.set-short { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 16px 4px; cursor: pointer; }
.set-short:active { transform: scale(0.97); }
.set-short-ic { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; color: #2ee08a;
  background: linear-gradient(160deg, rgba(46,224,138,0.18), rgba(46,224,138,0.04)); border: 1px solid rgba(255,214,120,0.28); }
.set-short-l { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

.set-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 13px 14px; cursor: pointer; text-align: left; }
.set-row:active { transform: scale(0.99); }
.set-row-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #2ee08a; flex-shrink: 0;
  background: linear-gradient(160deg, rgba(46,224,138,0.16), rgba(46,224,138,0.03)); border: 1px solid rgba(255,214,120,0.22); }
.set-row-l { flex: 1; font-size: 14px; font-weight: 700; }

.set-logout { width: 100%; margin-top: 22px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border-radius: 14px; cursor: pointer;
  background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.4); color: #ff8fb0; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
@media (prefers-reduced-motion: reduce) { .set-shine, .spin { animation: none; } }
`;
