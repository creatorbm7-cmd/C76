// TelegramConnect (/telegram) — the user-facing Telegram hub.
//
// A dedicated premium page (surfaced from Profile) to link the account to the
// @dtx_creatorbot bot for instant alerts. Reuses the existing, proven server
// flow exactly — NO backend changes:
//   • create_telegram_link_token() mints a single-use code
//   • telegramDeepLink(token) opens https://t.me/<bot>?start=<token>
//   • the telegram-webhook edge fn binds profiles.telegram_chat_id on /start
//   • unlink_telegram() disconnects
//   • telegram_notifications_enabled toggles the per-user opt-in
// After opening the bot we auto-poll telegram_chat_id so the UI flips to
// "connected" on its own. Presentation + existing RPCs only.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle2, Link2Off, Loader2, RefreshCw, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { telegramDeepLink } from "@/lib/telegram-link";
import { toast } from "@/hooks/use-toast";
import C7Icon from "@/components/c7/C7Icon";

// Human support handle (matches SupportPage). Bot for alerts is @dtx_creatorbot.
const SUPPORT_TG = "https://t.me/Creator744";

// The real alert types the notify-event/notify-deposit functions send to a
// linked user (see _shared/telegramEvents.ts TELEGRAM_USER_EVENTS).
const ALERTS: { ic: JSX.Element; t: string; d: string }[] = [
  { ic: <C7Icon name="wallet" size={18} />, t: "Deposits credited", d: "The moment your balance lands" },
  { ic: <C7Icon name="receipt" size={18} />, t: "Withdrawal updates", d: "Submitted · approved · paid" },
  { ic: <C7Icon name="trophy" size={18} />, t: "Big wins & jackpots", d: "When you hit it big" },
  { ic: <C7Icon name="gift" size={18} />, t: "Referral rewards", d: "Every friend who joins & plays" },
];

function errMsg(e: unknown, fallback: string) {
  const m = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  return m || fallback;
}

export default function TelegramConnect() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [notif, setNotif] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pollRef = useRef<number | null>(null);
  const connected = !!chatId;

  const stopPoll = useCallback(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Read the freshest chat-id straight from the DB (source of truth).
  const readChatId = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("telegram_chat_id").eq("id", uid).maybeSingle();
    return ((data as Record<string, unknown> | null)?.telegram_chat_id as string | null) ?? null;
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/login?next=/telegram"); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles").select("telegram_chat_id, telegram_notifications_enabled")
        .eq("id", user.id).maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        setChatId((row.telegram_chat_id as string | null) ?? null);
        setNotif((row.telegram_notifications_enabled as boolean | null) ?? true);
      }
      setLoaded(true);
    })();
    return () => stopPoll();
  }, [nav, stopPoll]);

  // Mint a single-use token, open the bot, then auto-poll for the handshake.
  const connect = async () => {
    setError(null); setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_telegram_link_token");
      if (error || !data) throw new Error(error?.message || "Could not create a link code. Please try again.");
      const t = String(data);
      setToken(t);
      window.open(telegramDeepLink(t), "_blank", "noopener,noreferrer");
      // Auto-poll up to ~90s so the card flips to "connected" without a manual tap.
      stopPoll();
      let ticks = 0;
      pollRef.current = window.setInterval(async () => {
        ticks += 1;
        if (!userId) return;
        const id = await readChatId(userId);
        if (id) {
          setChatId(id); setToken(null); stopPoll();
          toast({ title: "Telegram connected", description: "You'll now get alerts in Telegram." });
        } else if (ticks >= 30) {
          stopPoll();
        }
      }, 3000);
    } catch (e) {
      setError(errMsg(e, "Something went wrong. Please try again."));
    } finally { setBusy(false); }
  };

  const refresh = async () => {
    if (!userId) return;
    setError(null); setBusy(true);
    try {
      const id = await readChatId(userId);
      setChatId(id);
      if (id) { setToken(null); stopPoll(); toast({ title: "Telegram connected", description: "You'll now get alerts in Telegram." }); }
      else toast({ title: "Not connected yet", description: "Open the bot and press Start, then check again." });
    } catch (e) {
      setError(errMsg(e, "Could not refresh. Please try again."));
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    setError(null); setBusy(true); stopPoll();
    try {
      const { error } = await supabase.rpc("unlink_telegram");
      if (error) throw new Error(error.message);
      setChatId(null); setToken(null);
      toast({ title: "Telegram disconnected" });
    } catch (e) {
      setError(errMsg(e, "Could not disconnect. Please try again."));
    } finally { setBusy(false); }
  };

  // Persist the per-user opt-in immediately on toggle.
  const toggleNotif = async (next: boolean) => {
    if (!userId) return;
    setNotif(next); setSavingNotif(true);
    const { error } = await supabase
      .from("profiles").update({ telegram_notifications_enabled: next } as never).eq("id", userId);
    setSavingNotif(false);
    if (error) { setNotif(!next); toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); }
  };

  return (
    <div className="c7p-page tgc">
      <style>{CSS}</style>

      <header className="tgc-top">
        <button className="c7p-pg-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/v3/profile"))} aria-label="Back"><ArrowLeft size={18} /></button>
        <span className="tgc-toptx">Telegram</span>
        <span style={{ width: 34 }} />
      </header>

      <main className="tgc-main">
        {/* Status hero */}
        <section className={`c7p-panel tgc-hero${connected ? " is-on" : ""}`}>
          <span className="tgc-hero-ic">{connected ? <CheckCircle2 size={30} /> : <TgGlyph />}</span>
          <div className="tgc-hero-tx">
            <h1 className="tgc-hero-t">{connected ? "Telegram connected" : "Get instant alerts on Telegram"}</h1>
            <p className="tgc-hero-d">
              {connected
                ? "Your account is linked to @dtx_creatorbot. We'll message you the moment something happens."
                : "Link your account to @dtx_creatorbot and never miss a deposit, withdrawal or big win."}
            </p>
          </div>
          {connected && <span className="tgc-hero-badge">LINKED</span>}
        </section>

        {error && <div className="tgc-err" role="alert">{error}</div>}

        {/* Connect / disconnect flow */}
        {!loaded ? (
          <div className="c7p-skel c7p-skel--card" style={{ height: 96 }} />
        ) : connected ? (
          <button onClick={disconnect} disabled={busy} className="tgc-btn danger">
            {busy ? <Loader2 size={16} className="tgc-spin" /> : <Link2Off size={16} />} {busy ? "Working…" : "Disconnect Telegram"}
          </button>
        ) : token ? (
          <section className="c7p-panel tgc-code-card">
            <div className="tgc-code">
              <span className="tgc-code-l">Your one-time code</span>
              <span className="tgc-code-v">{token}</span>
            </div>
            <p className="tgc-hint">
              Telegram should have opened — press <b>Start</b> there to finish. Didn't open? Open
              <b> @dtx_creatorbot</b> and send <b>/start {token}</b>. Checking automatically…
            </p>
            <div className="tgc-row">
              <button onClick={connect} disabled={busy} className="c7p-btn-green tgc-btn">
                {busy ? <Loader2 size={16} className="tgc-spin" /> : <Send size={16} />} Reopen Telegram
              </button>
              <button onClick={refresh} disabled={busy} className="c7p-btn-gold tgc-btn">
                {busy ? <Loader2 size={16} className="tgc-spin" /> : <RefreshCw size={16} />} I've connected
              </button>
            </div>
          </section>
        ) : (
          <button onClick={connect} disabled={busy} className="c7p-btn-green tgc-btn tgc-btn--wide">
            {busy ? <Loader2 size={16} className="tgc-spin" /> : <Send size={16} />} {busy ? "Preparing…" : "Connect Telegram"}
          </button>
        )}

        {/* Notification opt-in */}
        <div className="c7p-sec"><span className="c7p-sec-ic"><Bell size={16} /></span><span className="c7p-sec-t">Alert preference</span><span className="c7p-sec-rule" /></div>
        <section className="c7p-panel tgc-pref">
          <div className="tgc-pref-tx">
            <b>Telegram alerts</b>
            <span>{notif ? "On — we'll ping you about wins, deposits & withdrawals" : "Off — you won't get Telegram messages"}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notif}
            aria-label="Toggle Telegram alerts"
            disabled={savingNotif}
            className={`tgc-switch${notif ? " on" : ""}`}
            onClick={() => toggleNotif(!notif)}
          ><span className="tgc-switch-dot" /></button>
        </section>

        {/* What you'll get */}
        <div className="c7p-sec"><span className="c7p-sec-ic"><C7Icon name="bolt" size={16} /></span><span className="c7p-sec-t">What you'll get</span><span className="c7p-sec-rule" /></div>
        <div className="tgc-alerts">
          {ALERTS.map((a) => (
            <div key={a.t} className="c7p-panel tgc-alert">
              <span className="tgc-alert-ic">{a.ic}</span>
              <div className="tgc-alert-tx"><b>{a.t}</b><span>{a.d}</span></div>
            </div>
          ))}
        </div>

        {/* Community / support */}
        <a className="c7p-panel tgc-community" href={SUPPORT_TG} target="_blank" rel="noopener noreferrer">
          <span className="tgc-community-ic"><TgGlyph /></span>
          <div className="tgc-alert-tx"><b>Chat with support on Telegram</b><span>Fastest help · 24/7 · @Creator744</span></div>
          <span className="tgc-community-go">Open ›</span>
        </a>
      </main>
    </div>
  );
}

// Telegram paper-plane glyph (gold, on-brand — no external asset).
function TgGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" style={{ display: "block" }}>
      <path d="M21.5 4.3 2.9 11.4c-1 .4-1 1.8.06 2.1l4.4 1.4 1.7 5.2c.3.9 1.4 1 1.9.3l2.4-2.9 4.6 3.4c.7.5 1.7.1 1.9-.7l3-14.2c.2-1-.8-1.9-1.8-1.5z" fill="#54a9eb" stroke="#2a1608" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M7.4 14.9 17 8.2c.3-.2.6.2.35.45L9.6 16.2l-.35 3.2z" fill="#fff" />
    </svg>
  );
}

const CSS = `
.tgc { min-height: 100dvh; color: #eafff4; font-family: Inter, system-ui, sans-serif; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
.tgc-top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px;
  background: linear-gradient(180deg, rgba(6,26,16,0.92), rgba(6,26,16,0.5)); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(246,201,69,0.22); }
.tgc-toptx { font-size: 16px; font-weight: 900; letter-spacing: 0.3px; background: linear-gradient(180deg,#fff,#d6ffe9 45%,#ffe9a8 78%,#f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tgc-main { max-width: 560px; margin: 0 auto; padding: 14px; display: flex; flex-direction: column; gap: 11px; }

/* Status hero */
.tgc-hero { position: relative; display: flex; align-items: center; gap: 13px; padding: 16px; overflow: hidden; }
.tgc-hero::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(80% 120% at 100% 0%, rgba(84,169,235,0.14), transparent 60%); }
.tgc-hero-ic { flex-shrink: 0; width: 54px; height: 54px; border-radius: 15px; display: grid; place-items: center; color: #fff; z-index: 1;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.16), transparent 55%), linear-gradient(160deg, #2f8fd6, #1c6fb0); border: 1px solid rgba(255,255,255,0.28); box-shadow: 0 8px 18px -8px rgba(40,120,200,0.8); }
.tgc-hero.is-on .tgc-hero-ic { background: radial-gradient(120% 100% at 50% 0%, rgba(200,255,225,0.2), transparent 55%), linear-gradient(160deg, #16a35a, #0a6b39); border-color: rgba(200,255,225,0.4); box-shadow: 0 8px 18px -8px rgba(20,160,90,0.8); }
.tgc-hero-tx { z-index: 1; }
.tgc-hero-t { margin: 0; font-size: 16px; font-weight: 900; color: #fff; }
.tgc-hero-d { margin: 4px 0 0; font-size: 12px; font-weight: 600; color: rgba(222,244,228,0.72); line-height: 1.45; }
.tgc-hero-badge { position: absolute; top: 12px; right: 12px; z-index: 1; font-size: 8.5px; font-weight: 900; letter-spacing: 0.6px; color: #04240f; padding: 3px 9px; border-radius: 999px; background: linear-gradient(180deg,#9CFFCB,#39FF88 55%,#00A86B); }

.tgc-err { font-size: 12px; font-weight: 700; color: #ffd7d7; padding: 10px 13px; border-radius: 12px; background: rgba(160,30,40,0.28); border: 1px solid rgba(229,72,77,0.5); }

/* Buttons */
.tgc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 18px; border-radius: 13px; font-size: 14px; font-weight: 900; font-family: inherit; cursor: pointer; border: none; -webkit-tap-highlight-color: transparent; }
.tgc-btn--wide { width: 100%; }
.tgc-btn.danger { width: 100%; color: #ffd7d7; background: linear-gradient(180deg, rgba(160,30,40,0.34), rgba(80,14,20,0.5)); border: 1px solid rgba(229,72,77,0.5); }
.tgc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.tgc-row { display: flex; gap: 10px; margin-top: 12px; }
.tgc-row .tgc-btn { flex: 1; }
.tgc-spin { animation: tgc-rot 0.9s linear infinite; }
@keyframes tgc-rot { to { transform: rotate(360deg); } }

/* One-time code card */
.tgc-code-card { padding: 15px; }
.tgc-code { display: flex; flex-direction: column; gap: 3px; align-items: center; padding: 12px; border-radius: 12px; background: rgba(0,0,0,0.28); border: 1px dashed rgba(246,201,69,0.4); }
.tgc-code-l { font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: rgba(222,244,228,0.6); }
.tgc-code-v { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ffe9a8; font-variant-numeric: tabular-nums; word-break: break-all; text-align: center; }
.tgc-hint { margin: 11px 0 0; font-size: 11.5px; font-weight: 600; color: rgba(222,244,228,0.72); line-height: 1.5; text-align: center; }
.tgc-hint b { color: #ffe9a8; }

/* Notification preference */
.tgc-pref { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; }
.tgc-pref-tx { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tgc-pref-tx b { font-size: 14px; font-weight: 900; color: #fff; }
.tgc-pref-tx span { font-size: 11.5px; font-weight: 600; color: rgba(222,244,228,0.66); }
.tgc-switch { flex-shrink: 0; width: 50px; height: 30px; border-radius: 999px; border: 1px solid rgba(246,201,69,0.3); cursor: pointer; position: relative; transition: background .18s ease; background: rgba(0,0,0,0.4); }
.tgc-switch.on { background: linear-gradient(180deg,#39FF88,#00A86B); border-color: transparent; }
.tgc-switch:disabled { opacity: 0.7; }
.tgc-switch-dot { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.4); transition: transform .18s cubic-bezier(.2,.9,.25,1.3); }
.tgc-switch.on .tgc-switch-dot { transform: translateX(20px); }

/* Alerts list */
.tgc-alerts { display: flex; flex-direction: column; gap: 9px; }
.tgc-alert { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.tgc-alert-ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(160deg, #0f6644, #05301e); border: 1px solid rgba(246,201,69,0.32); }
.tgc-alert-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tgc-alert-tx b { font-size: 13.5px; font-weight: 800; color: #fff; }
.tgc-alert-tx span { font-size: 11.5px; font-weight: 600; color: rgba(222,244,228,0.64); }

/* Community link */
.tgc-community { display: flex; align-items: center; gap: 12px; padding: 14px; margin-top: 4px; text-decoration: none; color: inherit; cursor: pointer; }
.tgc-community-ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(160deg, #2f8fd6, #1c6fb0); border: 1px solid rgba(255,255,255,0.25); }
.tgc-community-go { margin-left: auto; flex-shrink: 0; font-size: 12px; font-weight: 900; color: #6bf5a3; }

@media (prefers-reduced-motion: reduce) { .tgc-spin { animation: none; } .tgc-switch-dot { transition: none; } }
`;
