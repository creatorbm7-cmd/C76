// IgActivity (/ig/activity) — Instagram-light account history. Same
// casino_transactions source + realtime subscription the dark TransactionsPage
// uses (read-only feed, no business logic), reskinned to the IG-light system.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

type Txn = { id: string; type: string; amount: number; status: string; createdAt: string; description?: string; gameType?: string };
type FilterKey = "all" | "deposit" | "withdraw" | "bets" | "wins" | "bonus";

const GAME_EMOJI: Record<string, string> = {
  aviator: "✈️", jetx: "🚀", spaceman: "👨‍🚀", crash: "🚀", mines: "💣", plinko: "🎯", pachinko: "🎯",
  "teen patti": "🃏", blackjack: "🃏", baccarat: "💎", rummy: "🃏", andar: "🎴", hilo: "🎴",
  roulette: "🎡", wingo: "🎡", wheel: "🎡", slots: "🎰", limbo: "📉", coinflip: "🪙", keno: "🔢",
  dragon: "🐉", starburst: "⭐", "sweet bonanza": "🍬", "wolf gold": "🐺", "book of dead": "📖", "fruit party": "🍓", dice: "🎲",
};
function gameEmoji(s: string) { const dl = s.toLowerCase(); for (const k of Object.keys(GAME_EMOJI)) if (dl.includes(k)) return GAME_EMOJI[k]; return null; }
function txnEmoji(t: Txn) {
  const k = t.type.toLowerCase();
  if (/bet|wager|win|payout/.test(k)) { const e = gameEmoji(`${t.gameType || ""} ${t.description || ""}`); if (e) return e; }
  if (k.includes("deposit")) return "⬇️";
  if (k.includes("withdraw")) return "⬆️";
  if (k.includes("bet") || k.includes("wager")) return "🎲";
  if (k.includes("win") || k.includes("payout")) return "🏆";
  if (k.includes("bonus")) return "🎁";
  if (k.includes("refund")) return "↩️";
  if (k.includes("transfer")) return "🔁";
  return "◆";
}
const KNOWN = ["crash","mines","plinko","slots","blackjack","roulette","baccarat","keno","limbo","hilo","dice","wheel","coinflip","jetx","aviator","spaceman","rummy","andar","teen patti","starburst","sweet bonanza","wolf gold","book of dead","fruit party","dragon","wingo"];
function txnLabel(t: Txn) {
  const desc = (t.description || "").trim();
  const k = t.type.toLowerCase();
  if (/bet|win|wager|payout/.test(k) && desc && KNOWN.some((g) => desc.toLowerCase().includes(g))) return desc.charAt(0).toUpperCase() + desc.slice(1);
  return t.type.replace(/_/g, " ");
}
function isCredit(t: Txn) {
  const k = t.type.toLowerCase();
  if (/deposit|win|payout|bonus|refund|transfer_in/.test(k)) return true;
  if (/withdraw|bet|wager|transfer_out|transfer/.test(k)) return false;
  return t.amount >= 0;
}
function matchFilter(f: FilterKey, t: Txn) {
  const k = t.type.toLowerCase();
  switch (f) {
    case "all": return true;
    case "deposit": return k.includes("deposit");
    case "withdraw": return k.includes("withdraw");
    case "bets": return k.includes("bet") || k.includes("wager");
    case "wins": return k.includes("win") || k.includes("payout");
    case "bonus": return k.includes("bonus");
  }
}
function dayBucket(iso: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(iso), t0 = new Date();
  const y0 = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dd.getTime() === y0.getTime()) return "Today";
  if (dd.getTime() === y0.getTime() - 86400000) return "Yesterday";
  return "Earlier";
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const fmt = (n: number) => num(n, { locale: null, max: 2 });

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" }, { key: "deposit", label: "Deposits" }, { key: "withdraw", label: "Withdrawals" },
  { key: "bets", label: "Bets" }, { key: "wins", label: "Wins" }, { key: "bonus", label: "Bonuses" },
];

export default function IgActivity() {
  const nav = useNavigate();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const mapRow = (r: any): Txn => ({
      id: String(r.id), type: String(r.type ?? "transaction"), amount: Number(r.amount ?? 0),
      status: String(r.status ?? ""), createdAt: String(r.created_at ?? ""),
      description: r.description ? String(r.description) : undefined, gameType: r.game_type ? String(r.game_type) : undefined,
    });
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) { if (!cancelled) { setTxns([]); setLoading(false); } return; }
        const { data, error } = await supabase.from("casino_transactions")
          .select("id, type, amount, status, created_at, description, game_type")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        if (cancelled) return;
        setTxns((data ?? []).map(mapRow));
        channel = supabase
          .channel(`ig-tx-${uid}`)
          .on("postgres_changes",
            { event: "*", schema: "public", table: "casino_transactions", filter: `user_id=eq.${uid}` },
            (payload) => {
              const r = (payload.new ?? payload.old) as any;
              if (!r?.id) return;
              const row = mapRow(r);
              setTxns((prev) => {
                if (payload.eventType === "DELETE") return prev.filter((t) => t.id !== row.id);
                const idx = prev.findIndex((t) => t.id === row.id);
                if (idx >= 0) { const n = [...prev]; n[idx] = row; return n; }
                return [row, ...prev].slice(0, 200);
              });
            })
          .subscribe();
      } catch { if (!cancelled) { setTxns([]); setError(true); } } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [reloadKey]);

  const shown = useMemo(() => txns.filter((t) => matchFilter(filter, t)), [txns, filter]);
  const groups = useMemo(() => {
    const g: Record<string, Txn[]> = {};
    for (const t of shown) { const b = dayBucket(t.createdAt); (g[b] ||= []).push(t); }
    return (["Today", "Yesterday", "Earlier"] as const).filter((d) => g[d]?.length).map((d) => ({ day: d, items: g[d] }));
  }, [shown]);

  return (
    <div className="ig iga">
      <style>{CSS}</style>
      <header className="ig-top">
        <button className="iga-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/wallet"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Activity</span>
        <button className="iga-back" onClick={() => setReloadKey((k) => k + 1)} disabled={loading} aria-label="Refresh"><RefreshCw size={18} className={loading ? "iga-spin" : ""} /></button>
      </header>

      <div className="iga-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`iga-tab${filter === t.key ? " on" : ""}`}>{t.label}</button>
        ))}
      </div>

      <main className="ig-main iga-main">
        {loading ? (
          <div className="iga-card">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="iga-row" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                <span className="iga-sk iga-sk-ic" />
                <div className="iga-body"><div className="iga-sk" style={{ width: "56%", height: 12, marginBottom: 6 }} /><div className="iga-sk" style={{ width: "32%", height: 9 }} /></div>
                <span className="iga-sk" style={{ width: 46, height: 13 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="iga-empty">
            <div className="iga-empty-em">⚠️</div>
            <div className="iga-empty-t">Couldn’t load activity</div>
            <div className="iga-empty-s">Check your connection and try again.</div>
            <button className="iga-retry" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="iga-empty">
            <div className="iga-empty-em">🧾</div>
            <div className="iga-empty-t">No activity yet</div>
            <div className="iga-empty-s">Deposits, bets, wins and bonuses will appear here.</div>
          </div>
        ) : groups.map((grp) => (
          <div key={grp.day} className="iga-group">
            <div className="iga-day">{grp.day}</div>
            <div className="iga-card">
              {grp.items.map((t, i) => {
                const credit = isCredit(t);
                return (
                  <div key={t.id} className="iga-row" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <span className={`iga-ic${credit ? " cr" : " db"}`}>{txnEmoji(t)}</span>
                    <div className="iga-body">
                      <div className="iga-label">{txnLabel(t)}</div>
                      <div className="iga-meta">
                        {timeAgo(t.createdAt)}
                        {t.status && t.status.toLowerCase() !== "completed" && <span className="iga-status">{t.status}</span>}
                      </div>
                    </div>
                    <span className={`iga-amt${credit ? " cr" : " db"}`}>{credit ? "+" : "−"}{fmt(Math.abs(t.amount))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="wallet" />
    </div>
  );
}

const CSS = `
.ig { --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a;
  --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  --line:rgba(240,201,74,0.22); --hair:rgba(255,255,255,0.06);
  min-height:100vh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  padding-bottom:calc(78px + env(safe-area-inset-bottom,0px)); -webkit-tap-highlight-color:transparent;
  background:
    radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,.10), transparent 55%),
    radial-gradient(120% 65% at 50% -4%, rgba(33,86,60,.82), transparent 58%),
    linear-gradient(180deg,#0c3320 0%, #06170e 46%, #030b07 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.iga-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.iga-back:hover { background:rgba(255,255,255,.05); } .iga-back:active { transform:scale(.9); } .iga-back:disabled { opacity:.55; }
.iga-spin { animation:iga-spin 1s linear infinite; }
@keyframes iga-spin { to { transform:rotate(360deg); } }
.ig-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }

/* Filter chips — premium, sticky under the bar */
.iga-tabs { position:sticky; top:54px; z-index:20; display:flex; gap:8px; overflow-x:auto; padding:11px 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.86), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); border-bottom:1px solid var(--line); scrollbar-width:none; }
.iga-tabs::-webkit-scrollbar { display:none; }
.iga-tab { flex-shrink:0; padding:8px 15px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; color:var(--ink); border:1px solid var(--line); background:rgba(4,16,10,.55); transition:transform .12s; }
.iga-tab.on { color:#04180e; border-color:transparent; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 0 16px -5px rgba(46,224,138,0.6), 0 6px 14px -6px rgba(0,0,0,0.5); }
.iga-tab:active { transform:translateY(1px); }

.iga-main { padding:14px 12px; }
.iga-group { margin-bottom:6px; }
.iga-day { margin:14px 4px 9px; font-size:10px; letter-spacing:0.18em; font-weight:700; text-transform:uppercase; color:var(--faint); display:flex; align-items:center; gap:9px; }
.iga-day::after { content:""; flex:1; height:1px; background:linear-gradient(90deg,var(--line),transparent); }

/* Deep gold-framed emerald activity cabinet */
.iga-card { position:relative; border:1px solid transparent; border-radius:20px; overflow:hidden;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.4), inset 0 1.5px 0 rgba(255,255,255,.13), inset 0 0 34px rgba(46,224,138,.06), 0 24px 48px -28px rgba(0,0,0,.9); }
.iga-row { display:flex; align-items:center; gap:12px; padding:13px 15px; min-height:42px; }
.iga-ic { width:40px; height:40px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; border:1px solid var(--line);
  background:radial-gradient(120% 120% at 50% 15%, rgba(46,224,138,.14), rgba(6,24,15,.45)); box-shadow:0 4px 10px -5px rgba(0,0,0,.6); }
.iga-ic.cr { background:radial-gradient(120% 120% at 50% 15%, rgba(46,224,138,0.26), rgba(6,24,15,.5)); box-shadow:0 0 12px -4px rgba(46,224,138,.5), 0 4px 10px -5px rgba(0,0,0,.6); }
.iga-ic.db { background:radial-gradient(120% 120% at 50% 15%, rgba(255,107,125,0.22), rgba(6,24,15,.5)); box-shadow:0 0 12px -4px rgba(255,107,125,.4), 0 4px 10px -5px rgba(0,0,0,.6); }
.iga-body { flex:1; min-width:0; }
.iga-label { font-size:13.5px; font-weight:700; color:var(--ink); text-transform:capitalize; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:-.005em; }
.iga-meta { font-size:11px; color:var(--mut); margin-top:2px; font-weight:600; }
.iga-status { margin-left:7px; padding:2px 7px; font-size:8.5px; font-weight:800; border-radius:999px; text-transform:uppercase; letter-spacing:0.6px; background:rgba(240,201,74,0.14); color:var(--antique); border:1px solid rgba(240,201,74,0.3); }
.iga-amt { font-size:14.5px; font-weight:800; font-variant-numeric:tabular-nums; flex-shrink:0; letter-spacing:-.01em; }
.iga-amt.cr { color:var(--grn); } .iga-amt.db { color:var(--loss); }

/* States — same premium finish */
.iga-empty { text-align:center; color:var(--mut); padding:60px 22px; margin:14px 0; border-radius:22px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.38), inset 0 1.5px 0 rgba(255,255,255,.12), inset 0 0 34px rgba(46,224,138,.06), 0 24px 48px -28px rgba(0,0,0,.9); }
.iga-empty-em { font-size:34px; margin-bottom:12px; display:inline-grid; place-items:center; width:66px; height:66px; border-radius:50%;
  background:radial-gradient(120% 120% at 50% 20%, rgba(46,224,138,.16), rgba(6,20,13,.4)); border:1px solid var(--line); filter:drop-shadow(0 4px 10px rgba(240,201,74,0.3)); }
.iga-empty-t { font-size:16px; font-weight:800; color:var(--ink); margin-bottom:5px; }
.iga-empty-s { font-size:12.5px; color:var(--mut); line-height:1.5; }
.iga-retry { margin-top:16px; padding:11px 24px; border-radius:13px; border:1px solid rgba(255,255,255,.35); font-weight:800; font-size:13px; cursor:pointer; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), 0 10px 22px -8px rgba(240,201,74,0.55); transition:filter .18s, transform .12s; }
.iga-retry:hover { filter:brightness(1.06); } .iga-retry:active { transform:translateY(1px); }

/* Skeleton */
.iga-sk { display:block; border-radius:7px; background:linear-gradient(100deg, rgba(255,255,255,.05) 30%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.05) 70%); background-size:200% 100%; animation:iga-sh 1.4s ease-in-out infinite; }
.iga-sk-ic { width:40px; height:40px; border-radius:12px; flex-shrink:0; }
@keyframes iga-sh { from { background-position:200% 0; } to { background-position:-200% 0; } }
@media (prefers-reduced-motion: reduce) { .iga-sk, .iga-spin { animation:none !important; } .iga-tab, .iga-back, .iga-retry { transition:none !important; } }
`;
