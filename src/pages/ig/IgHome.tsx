// IgHome (/ig) — premium C74 HOME. Instagram-familiar structure (sticky app bar →
// stories rail → vertical feed → 6-tab bottom nav) rendered in the C74 luxury
// visual language: deep-emerald felt ground, polished gold, glass/metal cards,
// gold hairlines and controlled glints. Same real hooks as before (balance, C74,
// games, notifications, rank) — no fabricated values; every element routes to a
// real destination. Presentation only.
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Heart, Send, MessageCircle } from "lucide-react";
import { usd as fmtUsd, num as fmtNum } from "@/lib/format";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useC74 } from "@/hooks/useC74";
import { useNotifications } from "@/hooks/useNotifications";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import { useV2Catalog, makeBadger, filterCatalog, type V2Badge } from "@/pages/v2/v2catalog";
import IgRibbon, { type IgRibbonKind } from "@/components/ig/IgRibbon";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const money = (n: number) => fmtUsd(n, { locale: null, min: 2 });

// Catalog's existing (presentation-only) badge → ribbon kind.
const HOME_RIBBON: Record<V2Badge, IgRibbonKind> = { HOT: "hot", NEW: "new", JACKPOT: "jackpot" };

// Stories rail — real routes. `ring` gives the gold story-ring.
const STORIES: { key: string; label: string; ic: C7IconName; to: string; ring?: boolean; badge?: string }[] = [
  { key: "reels", label: "C74 Reels", ic: "coin", to: "/ig/reels", ring: true },
  { key: "slots", label: "Slots", ic: "coins", to: "/ig/explore", ring: true },
  { key: "missions", label: "Missions", ic: "target", to: "/ig/missions", ring: true },
  { key: "bank", label: "Bank", ic: "bank", to: "/ig/bank", ring: true },
  { key: "gems", label: "Gems", ic: "gem", to: "/ig/explore", ring: true },
  { key: "vip", label: "VIP", ic: "crown", to: "/ig/vip", ring: true },
  { key: "refer", label: "Invite", ic: "gift", to: "/ig/invite", ring: true },
];

export default function IgHome() {
  const nav = useNavigate();
  const { stats } = useProfileStats();
  const { summary } = useC74();
  const { unreadCount } = useNotifications();
  const pulse = useC7Pulse();
  const { games: catalog } = useV2Catalog();
  const badger = useMemo(() => makeBadger(catalog), [catalog]);
  const featured = useMemo(() => {
    const hot = filterCatalog(catalog, "hot", badger);
    return (hot.length >= 6 ? hot : filterCatalog(catalog, "featured", badger)).slice(0, 6);
  }, [catalog, badger]);
  const mania = useMemo(() => catalog.find((x) => /money\s*mania/i.test(x.name)) ?? null, [catalog]);

  const c74Bal = summary?.balance ?? 0;
  const openGame = (uid: string) => nav(`/ig/game/${uid}`);
  const launchMania = () => (mania ? openGame(mania.uid) : nav("/ig/explore"));

  return (
    <div className="ig">
      <style>{CSS}</style>

      {/* ── Top app bar ─────────────────────────────────────────── */}
      <header className="ig-top">
        <span className="ig-logo">C7 <b>Winners</b></span>
        <div className="ig-top-r">
          <button className="ig-bal" onClick={() => nav("/ig/deposit")} aria-label="Balance — deposit">
            {money(stats.balance)} <span className="ig-bal-plus"><Plus size={13} strokeWidth={3} /></span>
          </button>
          <Link to="/ig/rewards" className="ig-ic" aria-label="Rewards"><Heart size={22} /></Link>
          <Link to="/ig/notifications" className="ig-ic" aria-label="Notifications">
            <Send size={21} />
            {unreadCount > 0 && <span className="ig-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </Link>
        </div>
      </header>

      <main className="ig-main">
        {/* ── Stories rail ──────────────────────────────────────── */}
        <section className="ig-stories" aria-label="Shortcuts">
          <Link to="/ig/profile" className="ig-story">
            <span className="ig-story-av ig-story-me">
              <img src="/icons/v3/hdr/avatar.png" alt="" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
              <span className="ig-story-add"><Plus size={12} strokeWidth={3} /></span>
            </span>
            <span className="ig-story-l">You</span>
          </Link>
          {STORIES.map((s) => (
            <Link key={s.key} to={s.to} className="ig-story">
              {s.badge ? (
                <span className="ig-story-av ig-story-badge">
                  <img src={s.badge} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </span>
              ) : (
                <span className={`ig-story-av${s.ring ? " ring" : ""}`}>
                  <span className="ig-story-in"><C7Icon name={s.ic} size={26} /></span>
                </span>
              )}
              <span className="ig-story-l">{s.label}</span>
            </Link>
          ))}
        </section>

        {/* ── FEED ──────────────────────────────────────────────── */}

        {/* Welcome bonus post */}
        <FeedPost icon={<C7Icon name="gift" size={18} />} title="C7 Rewards" sub="Sponsored · Welcome offer"
          onOpen={() => nav("/ig/rewards")}>
          <button className="ig-media ig-media--bonus" onClick={() => nav("/ig/rewards")} aria-label="Claim welcome bonus">
            <div className="ig-bonus-tx">
              <span className="ig-bonus-k">WELCOME BONUS</span>
              <span className="ig-bonus-v ig-sheen">10,000 Bonus Coins</span>
              <span className="ig-bonus-cta">Claim now</span>
            </div>
            <img className="ig-bonus-art ig-float" src="/icons/v3/bonus-treasure.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </button>
          <FeedActions primary="Claim" onPrimary={() => nav("/ig/rewards")} />
          <p className="ig-cap"><b>C7 Rewards</b> Claim your welcome bonus coins and start playing. 🪙</p>
        </FeedPost>

        {/* Money Mania jackpot post */}
        <FeedPost icon={<C7Icon name="trophy" size={18} />} title="Money Mania" sub="Live jackpot" live onOpen={launchMania}>
          <button className="ig-media ig-media--photo" onClick={launchMania} aria-label="Play Money Mania">
            <img src="/icons/v2/jackpot-lotto.jpg" alt="Money Mania jackpot" loading="lazy" />
          </button>
          <FeedActions primary="Play" onPrimary={launchMania} />
          <p className="ig-cap"><b>Money Mania</b> Spin the reels — be the next millionaire. 🎰</p>
        </FeedPost>

        {/* C74 token post */}
        <FeedPost icon={<C7Icon name="coin" size={18} />} title="C74 Token" sub={`Your balance · ${pulse.rank.name}`}
          onOpen={() => nav("/ig/c74")}>
          <div className="ig-media ig-media--c74">
            <img className="ig-c74-art" src="/icons/v3/c74-token.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span className="ig-c74-k">YOUR C74 BALANCE</span>
            <span className="ig-c74-v">{fmtNum(c74Bal)} <em>C74</em></span>
            <div className="ig-c74-row">
              <button className="ig-pill" onClick={() => nav("/ig/mining")}><C7Icon name="pickaxe" size={14} /> Mining</button>
              <button className="ig-pill" onClick={() => nav("/ig/earn")}><C7Icon name="coin" size={14} /> Earn</button>
              <button className="ig-pill ig-pill--solid" onClick={() => nav("/ig/c74")}>Token Center</button>
            </div>
          </div>
          <p className="ig-cap"><b>C74 Token</b> Earn C74 as you play — mine, spin & climb tiers.</p>
        </FeedPost>

        {/* Featured games post */}
        <FeedPost icon={<C7Icon name="star" size={18} />} title="Featured games" sub="Popular now"
          onOpen={() => nav("/ig/explore")}>
          <div className="ig-media ig-games">
            {featured.map((g, i) => {
              const badge = badger(g, i);
              return (
                <button key={g.uid} className="ig-game" onClick={() => openGame(g.uid)}>
                  <img src={g.thumbnail} alt={g.name} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                  {badge && <IgRibbon kind={HOME_RIBBON[badge]} sm className="ig-game-rb" />}
                  <span className="ig-game-n">{g.name}</span>
                </button>
              );
            })}
          </div>
          <FeedActions primary="View all" onPrimary={() => nav("/ig/explore")} />
        </FeedPost>

        <div className="ig-end">You're all caught up ✓</div>

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="home" />
    </div>
  );
}

// A feed "post": header (avatar + title + sub) → media/children → (actions) → caption.
function FeedPost({ icon, title, sub, live, onOpen, children }:
  { icon: React.ReactNode; title: string; sub: string; live?: boolean; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <article className="ig-post">
      <header className="ig-post-h">
        <button className="ig-post-id" onClick={onOpen}>
          <span className="ig-post-av">{icon}</span>
          <span className="ig-post-tx"><b>{title}{live && <i className="ig-live">LIVE</i>}</b><small>{sub}</small></span>
        </button>
        <button className="ig-post-more" aria-label="More" onClick={onOpen}>⋯</button>
      </header>
      {children}
    </article>
  );
}

// IG action row repurposed: like/comment/share glyphs + a real primary action.
function FeedActions({ primary, onPrimary }: { primary: string; onPrimary: () => void }) {
  return (
    <div className="ig-acts">
      <div className="ig-acts-l">
        <button className="ig-act" aria-label="Like"><Heart size={23} /></button>
        <button className="ig-act" aria-label="Comment"><MessageCircle size={23} /></button>
        <button className="ig-act" aria-label="Share"><Send size={22} /></button>
      </div>
      <button className="ig-cta" onClick={onPrimary}>{primary}</button>
    </div>
  );
}

const CSS = `
.ig { --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  --panel:#0f3322; --panel2:#123f29; --hair:rgba(240,201,74,0.26);
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:76px;
  background:
    radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%);
  background-attachment:fixed; }
.ig * { box-sizing:border-box; }

/* Top bar */
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; gap:10px;
  height:54px; padding:0 14px; background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62));
  -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--hair); }
.ig-logo { font-size:21px; font-weight:500; letter-spacing:-.3px; color:#eafff4; }
.ig-logo b { font-weight:800; background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-top-r { display:flex; align-items:center; gap:14px; }
.ig-bal { display:inline-flex; align-items:center; gap:7px; font-size:14px; font-weight:800; color:#f3ffe9; cursor:pointer;
  background:linear-gradient(180deg, rgba(18,73,47,0.9), rgba(7,32,20,0.9)); border:1px solid var(--hair);
  padding:5px 6px 5px 13px; border-radius:999px; box-shadow:inset 0 1px 0 rgba(246,230,176,0.14); font-variant-numeric:tabular-nums; }
.ig-bal-plus { display:grid; place-items:center; width:22px; height:22px; border-radius:50%; color:#0a2410;
  background:radial-gradient(120% 120% at 50% 20%, #fff3c8, #f0c94a 55%, #c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6); }
.ig-ic { position:relative; color:#d6ffe9; display:grid; place-items:center; }
.ig-badge { position:absolute; top:-6px; right:-8px; min-width:16px; height:16px; padding:0 4px; border-radius:999px; background:#ed4956; color:#fff;
  font-size:10px; font-weight:800; display:grid; place-items:center; border:2px solid #0a2410; }

.ig-main { max-width:560px; margin:0 auto; }

/* Stories */
.ig-stories { display:flex; gap:14px; overflow-x:auto; padding:13px 14px; border-bottom:1px solid var(--hair); scrollbar-width:none; }
.ig-stories::-webkit-scrollbar { display:none; }
.ig-story { flex:0 0 auto; width:66px; display:flex; flex-direction:column; align-items:center; gap:6px; text-decoration:none; color:var(--ink); }
.ig-story-av { position:relative; width:62px; height:62px; border-radius:50%; display:grid; place-items:center; }
.ig-story-av.ring { background:conic-gradient(from 210deg,#f6c945,#37e29a,#0e7a4a,#f6c945); padding:2.5px; box-shadow:0 0 14px -4px rgba(240,201,74,0.5); }
.ig-story-in { width:100%; height:100%; border-radius:50%; background:radial-gradient(120% 120% at 50% 20%, #12492f, #06180f); border:2px solid #0a2410; display:grid; place-items:center; color:#ffe9a8; }
/* premium 3D badge art — clipped to a perfect circle with a uniform gold-hairline
   rim so every badge edge is identically clean (hides any extraction fringe) */
.ig-story-badge { padding:0; background:none; position:relative; border-radius:50%; overflow:hidden;
  box-shadow:0 0 15px -4px rgba(240,201,74,0.55); animation:ig-glow 4.6s ease-in-out infinite; }
.ig-story-badge img { width:100%; height:100%; object-fit:cover; transform:scale(1.05); display:block; }
.ig-story-badge::after { content:""; position:absolute; inset:0; border-radius:50%; pointer-events:none;
  box-shadow:inset 0 0 0 2px rgba(240,201,74,0.55), inset 0 0 6px 1px rgba(0,0,0,0.4); }
.ig-story-me { border:1.5px solid var(--hair); overflow:visible; background:#0b2418; }
.ig-story-me img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
.ig-story-add { position:absolute; right:-2px; bottom:-2px; width:20px; height:20px; border-radius:50%; color:#0a2410;
  background:radial-gradient(120% 120% at 50% 20%, #fff3c8, #f0c94a 55%, #c68a2e); display:grid; place-items:center; border:2px solid #0a2410; }
.ig-story-l { font-size:11px; color:var(--mut); max-width:66px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Post — glass emerald card with gold hairline */
.ig-post { margin:12px 12px 0; border-radius:18px; overflow:hidden; position:relative;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92));
  border:1px solid var(--hair); box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.ig-post-h { display:flex; align-items:center; justify-content:space-between; padding:11px 13px; }
.ig-post-id { display:flex; align-items:center; gap:10px; background:none; border:none; padding:0; cursor:pointer; text-align:left; }
.ig-post-av { width:36px; height:36px; border-radius:50%; display:grid; place-items:center; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--hair); }
.ig-post-tx { display:flex; flex-direction:column; line-height:1.18; }
.ig-post-tx b { font-size:13.5px; font-weight:800; color:#f3ffe9; display:flex; align-items:center; gap:6px; }
.ig-post-tx small { font-size:11.5px; color:var(--mut); }
.ig-live { font-style:normal; font-size:8.5px; font-weight:800; letter-spacing:.4px; color:#fff; background:#ed4956; padding:1px 5px; border-radius:4px; box-shadow:0 0 10px -1px rgba(237,73,86,0.7); }
.ig-post-more { background:none; border:none; font-size:20px; color:var(--mut); cursor:pointer; line-height:1; }

/* Media */
.ig-media { display:block; width:100%; border:none; padding:0; cursor:pointer; }
.ig-media--photo img { display:block; width:100%; height:auto; }
.ig-media--bonus { position:relative; display:flex; align-items:center; min-height:158px; padding:20px; text-align:left; overflow:hidden;
  background:radial-gradient(130% 120% at 100% 0%, rgba(46,224,138,0.16), transparent 60%), linear-gradient(160deg,#123f29,#06180f); }
.ig-media--bonus::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.10) 50%, transparent 60%); }
.ig-bonus-tx { display:flex; flex-direction:column; gap:5px; z-index:1; }
.ig-bonus-k { font-size:12px; font-weight:800; letter-spacing:.7px; color:var(--grn); }
.ig-bonus-v { font-size:24px; font-weight:900; letter-spacing:-.5px; background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-bonus-cta { margin-top:9px; align-self:flex-start; font-size:13px; font-weight:800; color:#0a2410; padding:9px 20px; border-radius:11px;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 16px -6px rgba(240,201,74,0.6); }
.ig-bonus-art { position:absolute; right:6px; bottom:0; width:124px; height:auto; z-index:1; filter:drop-shadow(0 8px 14px rgba(0,0,0,0.5)); }
.ig-media--c74 { display:flex; flex-direction:column; gap:9px; padding:20px;
  background:radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.14), transparent 55%), linear-gradient(160deg,#12492f,#06180f); }
.ig-c74-art { position:absolute; right:14px; top:50%; transform:translateY(-50%); width:96px; height:auto; z-index:0; pointer-events:none;
  filter:drop-shadow(0 6px 12px rgba(0,0,0,0.5)); opacity:0.96; }
.ig-c74-k { position:relative; z-index:1; font-size:11px; font-weight:800; letter-spacing:.6px; color:var(--mut); }
.ig-media--c74 .ig-c74-v, .ig-media--c74 .ig-c74-row { position:relative; z-index:1; }
.ig-c74-v { font-size:30px; font-weight:900; letter-spacing:-1px; color:#f3ffe9; font-variant-numeric:tabular-nums; } .ig-c74-v em { font-style:normal; font-size:15px; color:var(--gold); }
.ig-c74-row { display:flex; gap:9px; margin-top:5px; }
.ig-pill { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:800; color:#eafff4; cursor:pointer;
  background:rgba(9,32,20,0.6); border:1px solid var(--hair); padding:9px 15px; border-radius:11px; }
.ig-pill--solid { color:#0a2410; border-color:transparent; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.ig-games { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; background:rgba(240,201,74,0.14); }
.ig-game { position:relative; aspect-ratio:1; border:none; padding:0; cursor:pointer; overflow:hidden;
  background:radial-gradient(120% 120% at 50% 20%, #12492f, #06180f 72%); box-shadow:inset 0 0 0 1px rgba(240,201,74,0.12); transition:transform .1s ease; }
.ig-game::after { content:""; position:absolute; inset:0; pointer-events:none; box-shadow:inset 0 0 22px rgba(0,0,0,0.35); }
.ig-game:active { transform:scale(0.97); }
.ig-game img { position:relative; z-index:1; width:100%; height:100%; object-fit:cover; }
.ig-game-rb { position:absolute; top:6px; left:6px; z-index:3; }
.ig-game-n { position:absolute; left:0; right:0; bottom:0; padding:12px 6px 5px; font-size:10px; font-weight:700; color:#fff; text-align:left;
  background:linear-gradient(0deg,rgba(0,0,0,.78),transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Actions + caption */
.ig-acts { display:flex; align-items:center; justify-content:space-between; padding:9px 13px 3px; }
.ig-acts-l { display:flex; gap:15px; }
.ig-act { background:none; border:none; padding:0; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-cta { font-size:13px; font-weight:800; color:#0a2410; border:none; padding:9px 20px; border-radius:10px; cursor:pointer;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5); }
.ig-cta:active { transform:translateY(1px); }
.ig-cap { margin:3px 0 13px; padding:0 13px; font-size:13px; color:#dbeee2; line-height:1.45; } .ig-cap b { font-weight:800; color:#f3ffe9; }

.ig-end { text-align:center; color:var(--mut); font-size:12.5px; padding:22px; }

/* ── premium polish pass ── */
.ig-bal, .ig-pill, .ig-post-id, .ig-media--bonus, .ig-media--photo, .ig-game, .ig-story-av { transition:transform .11s ease, opacity .11s ease; }
.ig-bal:active, .ig-pill:active { transform:translateY(1px); }
.ig-post-id:active { opacity:.82; }
.ig-media--bonus:active, .ig-media--photo:active { transform:scale(.994); }
.ig-story:active .ig-story-av { transform:scale(.93); }
/* stories: stronger ring glow + inner gloss so the gold/emerald icons pop */
.ig-story-av.ring { box-shadow:0 0 16px -3px rgba(240,201,74,0.6); }
.ig-story-in { position:relative; overflow:hidden; }
.ig-story-in::before { content:""; position:absolute; left:10%; right:10%; top:7%; height:40%; border-radius:50%; pointer-events:none; background:linear-gradient(180deg, rgba(255,246,213,0.2), transparent); }
/* cards: crisper top gloss + deeper drop */
.ig-post { box-shadow:inset 0 1px 0 rgba(246,230,176,0.16), 0 16px 38px -20px rgba(0,0,0,0.85); }
/* C74 balance card: one controlled diagonal glint, matching the bonus card */
.ig-media--c74 { position:relative; overflow:hidden; }
.ig-media--c74::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(246,230,176,0.09) 50%, transparent 58%); }
/* welcome treasure a touch larger */
.ig-bonus-art { width:132px; right:2px; }
/* featured games: legible labels + framed hero photo */
.ig-game-n { text-shadow:0 1px 3px rgba(0,0,0,0.7); letter-spacing:.2px; }
/* Money Mania / hero photo — bright gold cabinet frame + emerald+gold glow. */
.ig-media--photo { position:relative; margin:2px 12px 0; border-radius:15px; overflow:hidden;
  box-shadow:0 0 22px -6px rgba(240,201,74,0.55), 0 0 44px -14px rgba(46,224,138,0.5), 0 16px 34px -18px rgba(0,0,0,0.8); }
.ig-media--photo img { border-radius:15px; }
.ig-media--photo::before { content:""; position:absolute; inset:0; border-radius:15px; padding:2px; pointer-events:none; z-index:2;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 44%,#c68a2e 80%,#8a5a1e);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.ig-media--photo::after { content:""; position:absolute; inset:0; border-radius:15px; pointer-events:none; z-index:1; box-shadow:inset 0 -16px 28px -18px rgba(0,0,0,0.55); }

/* ── 4K gold shine — top-level ── */
@keyframes ig-sweep { 0%,66% { left:-45%; } 86%,100% { left:132%; } }
@keyframes ig-goldshift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
@keyframes ig-glow { 0%,100% { box-shadow:0 0 15px -4px rgba(240,201,74,0.5); } 50% { box-shadow:0 0 26px -2px rgba(240,201,74,0.85); } }
@keyframes ig-drift { 0%,100% { background-position:0% 0; } 50% { background-position:100% 0; } }
/* sweeping specular over the gold + green CTAs and the balance pill */
.ig-bonus-cta, .ig-bal, .ig-cta { position:relative; overflow:hidden; }
.ig-bonus-cta::after, .ig-bal::after, .ig-cta::after { content:""; position:absolute; top:0; bottom:0; left:-45%; width:34%; transform:skewX(-18deg); z-index:2;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,0.82), transparent); pointer-events:none; animation:ig-sweep 4.6s ease-in-out infinite; }
.ig-bal::after { animation-duration:6.2s; } .ig-cta::after { animation-duration:5.4s; }
/* live metallic-gold shimmer on the hero numbers + wordmark */
.ig-bonus-v, .ig-c74-v, .ig-logo b { background-image:linear-gradient(100deg,#fff8e0 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,#fff8e0 100%);
  background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;
  animation:ig-goldshift 5.5s ease-in-out infinite; }
.ig-c74-v em { -webkit-text-fill-color:initial; color:var(--gold); }
/* glowing gold story rings + drifting sheen on the feature cards */
.ig-story-av.ring { animation:ig-glow 4.6s ease-in-out infinite; }
.ig-media--bonus::after, .ig-media--c74::after { background-size:260% 100%; animation:ig-drift 7s ease-in-out infinite; }

/* ══ RICH POLISH v2 — deeper felt, gold-framed cabinet cards, warmer chrome ══
   Presentation only; no markup/logic touched. Lifts every feed card into a
   crisp gold-edged emerald "cabinet" that floats on the felt, warms the top
   bar + stories, and finishes the tail. */
/* felt ground: a touch more depth + a faint gold horizon up top */
.ig { background:
    radial-gradient(120% 60% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -6%, rgba(40,150,100,0.55) 0%, transparent 56%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%) !important; }
/* top bar: warm gold underline glow so the chrome reads premium */
.ig-top { box-shadow:0 1px 0 rgba(240,201,74,0.22), 0 10px 24px -16px rgba(0,0,0,0.7); }
.ig-bal { box-shadow:inset 0 1px 0 rgba(246,230,176,0.2), 0 0 14px -5px rgba(240,201,74,0.5); }
/* stories: brighter labels + a hair-tighter, glossier rail */
.ig-stories { border-bottom:1px solid rgba(240,201,74,0.22); }
.ig-story-l { color:#cfe9d8; font-weight:600; }
.ig-story-badge { box-shadow:0 0 15px -3px rgba(240,201,74,0.62), 0 6px 14px -7px rgba(0,0,0,0.7); }
/* FEED CARDS → gold-framed emerald cabinet: crisp gold inner ring + emerald
   inner glow + gold halo + deeper drop; the single highest-impact lift. */
.ig-post { margin:14px 12px 0; border-color:transparent;
  background:
    radial-gradient(120% 88% at 50% -12%, rgba(58,240,160,0.14), transparent 56%),
    linear-gradient(180deg, rgba(21,78,50,0.96), rgba(8,30,19,0.96));
  box-shadow:
    inset 0 0 0 1.3px rgba(240,201,74,0.5),
    inset 0 1.6px 0 rgba(255,255,255,0.3),
    inset 0 24px 42px -28px rgba(58,240,160,0.3),
    0 0 26px -12px rgba(240,201,74,0.42),
    0 22px 48px -24px rgba(0,0,0,0.86); }
/* post header identity chip: richer gold-rimmed emerald medallion */
.ig-post-av { background:radial-gradient(120% 120% at 50% 16%, #1e6543, #0b2418);
  box-shadow:inset 0 1px 0 rgba(255,246,213,0.28), 0 0 12px -4px rgba(240,201,74,0.5); border-color:rgba(240,201,74,0.4); }
/* caption gets a hairline gold divider above it for rhythm */
.ig-cap { border-top:1px solid rgba(240,201,74,0.12); padding-top:11px; margin-top:2px; }
/* tail: a finished gold-flanked "caught up" line */
.ig-end { position:relative; color:#bfe0cd; font-weight:600; }
.ig-end::before, .ig-end::after { content:""; position:absolute; top:50%; width:46px; height:1px;
  background:linear-gradient(90deg, transparent, rgba(240,201,74,0.5)); }
.ig-end::before { right:calc(50% + 92px); transform:scaleX(-1); }
.ig-end::after { left:calc(50% + 92px); }

@media (prefers-reduced-motion:reduce){ .ig *{ animation:none!important; }
  .ig-bonus-v, .ig-c74-v, .ig-logo b { background-position:0% 50%!important; }
  .ig-bal:active, .ig-pill:active, .ig-story:active .ig-story-av, .ig-game:active, .ig-media--bonus:active, .ig-media--photo:active { transform:none!important; } }
/* ══ RICH POLISH v3 — HD 2J gold frames on the Home game rail (presentation only;
   no data/routes/logic touched — matches Explore) ══ */
.ig-games { gap:10px !important; padding:11px 11px 4px !important; background:none !important; }
.ig-game { border-radius:15px !important; isolation:isolate;
  box-shadow:0 0 16px -6px rgba(240,201,74,0.45), 0 16px 34px -16px rgba(0,0,0,0.9) !important;
  transition:transform .16s ease, box-shadow .16s ease !important; }
.ig-game img { border-radius:15px !important; filter:saturate(1.14) contrast(1.07) brightness(1.02);
  transform:scale(1.001); transition:transform .35s ease, filter .35s ease; }
.ig-game::after { z-index:2 !important; border-radius:15px !important;
  box-shadow: inset 0 0 0 1.6px rgba(255,242,205,0.92), inset 0 0 0 3.4px rgba(8,22,14,0.82), inset 0 0 0 5px rgba(240,201,74,0.60), inset 0 0 22px rgba(0,0,0,0.40) !important;
  background:linear-gradient(180deg, rgba(255,246,213,0.20) 0%, transparent 22%), radial-gradient(120% 85% at 50% 120%, rgba(0,0,0,0.5), transparent 52%), radial-gradient(90% 55% at 50% 0%, rgba(240,201,74,0.14), transparent 60%) !important; }
.ig-game:hover img { transform:scale(1.055); filter:saturate(1.22) contrast(1.11) brightness(1.05); }
.ig-game:hover { box-shadow:0 0 28px -4px rgba(240,201,74,0.62), 0 24px 46px -16px rgba(0,0,0,0.96) !important; }
.ig-game:hover::after { box-shadow: inset 0 0 0 1.6px rgba(255,251,232,1), inset 0 0 0 3.4px rgba(8,22,14,0.82), inset 0 0 0 5px rgba(240,201,74,0.82), inset 0 0 22px rgba(0,0,0,0.34) !important; }
.ig-game-n { z-index:4 !important; padding:16px 9px 7px !important; font-weight:800 !important; color:#fff6dd !important;
  background:linear-gradient(0deg, rgba(3,12,7,0.95), rgba(3,12,7,0.42) 55%, transparent) !important; }
.ig-game-rb { z-index:5 !important; top:8px !important; left:8px !important; }
@media (prefers-reduced-motion:reduce){ .ig-game img, .ig-game:hover img { transform:none; transition:none; } }
/* ══ RICH POLISH v3 — story rings (presentation only; no data/routes touched) ══ */
.ig-story-av.ring { background:none !important; padding:2.7px; position:relative; box-shadow:0 0 18px -4px rgba(240,201,74,0.6); }
.ig-story-av.ring::before { content:""; position:absolute; inset:0; border-radius:50%; z-index:0;
  background:conic-gradient(from 0deg,#f6c945,#fff4cf 12%,#37e29a 34%,#0e7a4a 50%,#f6c945 74%,#fff4cf 88%,#f6c945);
  animation:ig-ringspin 6s linear infinite; }
.ig-story-av.ring .ig-story-in { position:relative; z-index:1; }
@keyframes ig-ringspin { to { transform:rotate(1turn); } }
.ig-story-badge { box-shadow:0 0 15px -5px rgba(240,201,74,0.55); }
.ig-story-badge::after { box-shadow: inset 0 0 0 2.2px rgba(240,201,74,0.85), inset 0 0 0 3.4px rgba(10,36,16,0.85) !important; }
.ig-story-me { border-color:rgba(240,201,74,0.7) !important; box-shadow:0 0 15px -5px rgba(240,201,74,0.5); }
@media (prefers-reduced-motion:reduce){ .ig-story-av.ring::before{ animation:none; } }
`;
