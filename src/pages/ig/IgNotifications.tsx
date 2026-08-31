// IgNotifications (/ig/notifications) — Instagram-light notifications inbox.
// Same useNotifications feed (realtime + mark-read RPCs) the dark page uses; only
// the presentation is reskinned to the IG-light system. No logic changes.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, ChevronRight } from "lucide-react";
import { useNotifications, type NotificationRow } from "@/hooks/useNotifications";
import { usd } from "@/lib/format";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
function fmtAmount(n: NotificationRow): string | null {
  const a = n.meta?.amount;
  if (a == null || isNaN(Number(a))) return null;
  return usd(Number(a), { locale: null, min: 2 });
}

const EMOJI: Record<string, string> = {
  deposit: "⬇️", withdrawal: "⬆️", withdraw: "⬆️", vip: "👑", referral: "🤝", bonus: "🎁",
  security: "🛡️", login: "🛡️", kyc: "🛡️", promo: "⭐", event: "📅", leaderboard: "🏆",
  wheel: "🎡", success: "✅", error: "🔔", warning: "🔔", info: "🔔",
};
const emojiFor = (n: NotificationRow) =>
  (n.meta?.icon ? EMOJI[String(n.meta.icon).toLowerCase()] : undefined) || EMOJI[(n.type || "").toLowerCase()] || "🔔";

const STATUS_TONE: Record<string, "good" | "bad" | "warn" | "info"> = {
  success: "good", approved: "good", credited: "good", earned: "good", upgraded: "good", completed: "good", paid: "good",
  declined: "bad", rejected: "bad", failed: "bad", cancelled: "bad",
  pending: "warn", processing: "warn",
};
const toneFor = (s?: string) => (s ? STATUS_TONE[s.toLowerCase()] ?? "info" : "info");

const FILTERS: { key: string; label: string; match: (t: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "money", label: "Money", match: (t) => ["deposit", "withdrawal", "withdraw"].includes(t) },
  { key: "rewards", label: "Rewards", match: (t) => ["bonus", "vip", "referral", "wheel", "leaderboard", "promo", "event"].includes(t) },
  { key: "security", label: "Security", match: (t) => ["security", "login", "kyc"].includes(t) },
];

export default function IgNotifications() {
  const nav = useNavigate();
  const { items, unreadCount, loading, error, markRead, markAllRead, refresh } = useNotifications();
  const [filter, setFilter] = useState("all");

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const shown = useMemo(() => items.filter((n) => active.match((n.type || "").toLowerCase())), [items, active]);

  const open = (n: NotificationRow) => {
    if (!n.is_read) markRead(n.id);
    const route = n.meta?.cta_route;
    if (route) nav(route);
  };

  return (
    <div className="ig ign">
      <style>{CSS}</style>
      <header className="ig-top">
        <button className="ign-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</span>
        {unreadCount > 0 ? (
          <button className="ign-markall" onClick={markAllRead}><CheckCheck size={13} /> Read all</button>
        ) : <span style={{ width: 22 }} />}
      </header>

      <div className="ign-filters">
        {FILTERS.map((f) => {
          const c = f.key === "all" ? items.length : items.filter((n) => f.match((n.type || "").toLowerCase())).length;
          return (
            <button key={f.key} className={`ign-chip${filter === f.key ? " on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}{c > 0 && <span className="ign-chip-c">{c}</span>}
            </button>
          );
        })}
      </div>

      <main className="ig-main ign-main">
        {loading ? (
          <div className="ign-list">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ign-card">
                <span className="ign-sk" style={{ width: 40, height: 40, borderRadius: 12 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ign-sk" style={{ width: "50%", height: 12, marginBottom: 8 }} />
                  <div className="ign-sk" style={{ width: "82%", height: 9, marginBottom: 8 }} />
                  <div className="ign-sk" style={{ width: "28%", height: 9 }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="ign-empty">
            <div className="ign-empty-em">⚠️</div>
            <div className="ign-empty-t">Couldn’t load notifications</div>
            <div className="ign-empty-s">Check your connection and try again.</div>
            <button className="ign-retry" onClick={() => refresh()}>Retry</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="ign-empty">
            <Bell size={30} style={{ opacity: 0.35, marginBottom: 10 }} />
            <div className="ign-empty-t">No notifications yet</div>
            <div className="ign-empty-s">Deposits, withdrawals, rewards and security alerts show up here — instantly.</div>
          </div>
        ) : (
          <div className="ign-list">
            {shown.map((n) => {
              const amt = fmtAmount(n);
              const tone = toneFor(n.meta?.status);
              const ref = n.meta?.reference ? String(n.meta.reference) : null;
              return (
                <button key={n.id} className={`ign-card${n.is_read ? "" : " unread"}`} onClick={() => open(n)}>
                  <span className="ign-ic" aria-hidden="true">{emojiFor(n)}</span>
                  <div className="ign-body">
                    <div className="ign-head">
                      <span className="ign-t">{n.title}</span>
                      {amt && <span className="ign-amt">{amt}</span>}
                    </div>
                    {n.message && <div className="ign-msg">{n.message}</div>}
                    <div className="ign-meta">
                      {n.meta?.status && <span className={`ign-pill ${tone}`}>{String(n.meta.status).toUpperCase()}</span>}
                      {ref && <span className="ign-ref">Ref: {ref.length > 14 ? ref.slice(0, 6) + "…" + ref.slice(-4) : ref}</span>}
                      <span className="ign-time">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.meta?.cta_route && <span className="ign-cta">{n.meta?.cta_label || "Open"} <ChevronRight size={12} /></span>}
                  </div>
                  {!n.is_read && <span className="ign-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="home" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  --good:#2ee08a; --bad:#ff6b7d; --warn:#f0c94a; --info:#5cc8ff;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.ign-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ign-markall { display:inline-flex; align-items:center; gap:5px; border:none; border-radius:999px; padding:8px 14px; font-size:11px; font-weight:900; cursor:pointer; color:#04180e;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5), 0 0 14px -4px rgba(46,224,138,0.6), 0 6px 14px -6px rgba(0,0,0,0.5); }
.ign-markall:active { transform:translateY(1px); }
.ig-main { max-width:560px; margin:0 auto; }

.ign-filters { position:sticky; top:54px; z-index:20; display:flex; gap:8px; padding:10px 12px; overflow-x:auto;
  background:linear-gradient(180deg, rgba(9,32,20,0.9), rgba(9,32,20,0.45)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid rgba(240,201,74,0.2); scrollbar-width:none; }
.ign-filters::-webkit-scrollbar { display:none; }
.ign-chip { flex-shrink:0; display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; font-size:12px; font-weight:800; cursor:pointer;
  color:#eafff4; border:none; background:linear-gradient(180deg, rgba(24,96,63,0.7), rgba(6,24,15,0.85)); box-shadow:inset 0 0 0 1.2px rgba(240,201,74,0.4), inset 0 1px 0 rgba(255,255,255,0.16); }
.ign-chip.on { color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 0 16px -3px rgba(240,201,74,0.7); }
.ign-chip-c { font-size:10px; font-weight:900; padding:0 5px; border-radius:999px; background:rgba(4,16,10,0.4); color:var(--antique); }
.ign-chip.on .ign-chip-c { background:rgba(10,36,16,0.3); color:#3a2708; }

.ign-main { padding:12px; }
.ign-list { display:flex; flex-direction:column; gap:10px; }
.ign-card { position:relative; width:100%; display:flex; gap:12px; align-items:flex-start; text-align:left; padding:14px 15px; border-radius:18px; cursor:pointer; font-family:inherit; color:var(--ink);
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent; box-shadow:inset 0 0 0 1.2px rgba(240,201,74,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); }
.ign-card:active { transform:translateY(1px); }
.ign-card.unread { box-shadow:inset 0 0 0 1.3px rgba(46,224,138,0.5), inset 0 1.5px 0 rgba(255,255,255,0.12), 0 0 18px -8px rgba(46,224,138,0.5), 0 20px 40px -28px rgba(0,0,0,0.9); background:radial-gradient(130% 120% at 100% 0%, rgba(46,224,138,0.14), transparent 60%), linear-gradient(165deg, rgba(20,73,47,0.95), rgba(7,24,15,0.96)); }
.ign-ic { width:42px; height:42px; border-radius:13px; display:grid; place-items:center; font-size:19px; flex-shrink:0; color:var(--antique);
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.ign-body { flex:1; min-width:0; }
.ign-head { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.ign-card.unread .ign-head { padding-right:16px; }
.ign-t { font-size:14px; font-weight:800; color:#f3ffe9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ign-amt { font-size:14px; font-weight:900; flex-shrink:0; font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 60%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ign-msg { font-size:12.5px; color:#dbeee2; margin-top:3px; line-height:1.35; }
.ign-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:8px; }
.ign-pill { padding:3px 8px; font-size:8.5px; font-weight:900; border-radius:999px; letter-spacing:0.6px; border:1px solid transparent; }
.ign-pill.good { background:rgba(46,224,138,0.14); color:var(--good); border-color:rgba(46,224,138,0.3); }
.ign-pill.bad { background:rgba(255,107,125,0.14); color:var(--bad); border-color:rgba(255,107,125,0.3); }
.ign-pill.warn { background:rgba(240,201,74,0.14); color:var(--warn); border-color:rgba(240,201,74,0.3); }
.ign-pill.info { background:rgba(92,200,255,0.14); color:var(--info); border-color:rgba(92,200,255,0.3); }
.ign-ref { font-size:10px; font-weight:700; color:var(--mut); }
.ign-time { font-size:10.5px; font-weight:600; color:var(--mut); margin-left:auto; }
.ign-cta { display:inline-flex; align-items:center; gap:3px; margin-top:9px; font-size:12px; font-weight:800; color:var(--grn); }
.ign-dot { position:absolute; top:14px; right:14px; width:9px; height:9px; border-radius:50%;
  background:radial-gradient(120% 120% at 50% 20%, #fff3c8, #f0c94a 55%, #c68a2e); box-shadow:0 0 0 3px rgba(240,201,74,0.16), 0 0 10px -1px rgba(240,201,74,0.6); }

.ign-empty { text-align:center; color:var(--mut); padding:56px 22px; margin:12px 0; border-radius:22px;
  background:radial-gradient(120% 120% at 50% 0%, rgba(46,224,138,0.12), transparent 55%), linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96));
  border:1px solid transparent; box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.36), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 24px 48px -28px rgba(0,0,0,0.9); }
.ign-empty-em { font-size:38px; margin-bottom:10px; }
.ign-empty-t { font-size:15px; font-weight:800; color:#f3ffe9; margin-bottom:4px; }
.ign-empty-s { font-size:12.5px; line-height:1.45; }
.ign-empty svg { color:var(--gold); }
.ign-retry { margin-top:16px; padding:11px 24px; border-radius:999px; border:1px solid rgba(255,255,255,0.3); cursor:pointer; font-weight:900; font-size:13px; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6); }
.ign-retry:active { transform:translateY(1px); }

.ign-sk { display:block; border-radius:6px; background:linear-gradient(90deg, rgba(18,63,41,0.7), rgba(46,224,138,0.14) 45%, rgba(240,201,74,0.1) 55%, rgba(18,63,41,0.7)); background-size:200% 100%; animation:ign-sh 1.2s linear infinite; }
@keyframes ign-sh { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
@media (prefers-reduced-motion: reduce) { .ig *{ animation:none!important; } .ign-card:active, .ign-markall:active, .ign-retry:active { transform:none; } }
`;
