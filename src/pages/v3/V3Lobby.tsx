// V3 Lobby — c7winners.com home, premium emerald + gold dashboard.
//
// Layout (top → bottom): header (avatar+VIP · balance pill+deposit · rewards ·
// inbox · settings) → premium 6-tile shortcut nav → Profile + Total Balance →
// Quick Actions → Welcome Bonus + C74 Token → Money Mania jackpot → Featured
// Games. The app-wide BottomNav renders separately in App.tsx.
//
// Presentation only. Every value is wired to an EXISTING real-data hook — no
// mock data: balance/deposited/withdrawn (useProfileStats · rpc_user_stats,
// ZERO signed-out), C74 balance/tier/earn-rate (useC74 · get_c74_summary),
// rank (useC7Pulse), notifications (useNotifications), games (useV2Catalog).
// The Money Mania counter is the pre-existing cosmetic ticker (no real pool
// yet) and is preserved as-is, not newly invented.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usd as fmtUsd, num as fmtNum } from "@/lib/format";
import { Plus, ChevronRight } from "lucide-react";
import V2GameCard from "@/pages/v2/V2GameCard";
import { V2_CARD_CSS } from "@/pages/v2/v2CardCss";
import C74MegaWin from "@/games/c74originals/C74MegaWin";
import { useV2Catalog, makeBadger, filterCatalog, type CatalogGame } from "@/pages/v2/v2catalog";
import { recordPlay } from "@/pages/v2/v2live";
import { playV2 } from "@/pages/v2/v2audio";
import { toast } from "sonner";
import { useAppAssets } from "@/hooks/useAppAssets";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useNotifications } from "@/hooks/useNotifications";
import { useC74 } from "@/hooks/useC74";
import C7TierIcon from "@/components/c7/C7TierIcon";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import V3ShortcutStrip from "@/components/c7/V3ShortcutStrip";
import C7Asset from "@/components/c7/C7Asset";
import C7Icon from "@/components/c7/C7Icon";

// Money is USD (rpc_user_stats.currency === "USD"). usd() already prepends "$".
const money = (n: number) => fmtUsd(n, { locale: null, min: 2 });
const fmtRate = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

// Smoothly animates a displayed number toward `target` (easeOutCubic). Honors reduced-motion.
function useCountUp(target: number, ms = 850) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target; setVal(target); return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

export default function V3Lobby() {
  const nav = useNavigate();
  const { games: catalog, loading: catLoading } = useV2Catalog();
  const badger = useMemo(() => makeBadger(catalog), [catalog]);
  const popular = useMemo(() => {
    const hot = filterCatalog(catalog, "hot", badger);
    return (hot.length >= 6 ? hot : filterCatalog(catalog, "featured", badger)).slice(0, 8);
  }, [catalog, badger]);
  const jackpotGames = useMemo(() => filterCatalog(catalog, "jackpot", badger), [catalog, badger]);
  const maniaGame = useMemo<CatalogGame | null>(() =>
    catalog.find((x) => /money\s*mania/i.test(x.name) && /slot/i.test(x.category)) ??
    catalog.find((x) => /money\s*mania/i.test(x.name)) ??
    catalog.find((x) => /777/.test(x.name)) ??
    jackpotGames[0] ?? null,
  [catalog, jackpotGames]);

  const art = useAppAssets();
  const { stats } = useProfileStats();
  const { unreadCount } = useNotifications();
  const { summary } = useC74();
  const pulse = useC7Pulse();

  const shownBal = useCountUp(stats.balance);

  const openGame = (pg: CatalogGame) => { recordPlay(pg.uid); playV2("click"); nav(`/v3/game/${pg.uid}`); };
  const launchJackpot = () => { if (maniaGame) openGame(maniaGame); else nav("/v3/games?cat=jackpot"); };

  // Robust image fallback: if a bound (Admin Studio) URL is dead, drop to the
  // built-in local asset; if that also fails, cache-bust once, then give up
  // cleanly (hidden) rather than showing a broken-image glyph.
  const retryIcon = (t: HTMLImageElement, local?: string) => {
    const step = t.dataset.fb;
    if (!step && local && t.src.split("?")[0] !== new URL(local, location.href).href) {
      t.dataset.fb = "local"; t.src = local; return;
    }
    if (step !== "done") { t.dataset.fb = "done"; t.src = (local ?? t.src).split("?")[0] + "?r=" + Date.now(); return; }
    t.style.visibility = "hidden";
  };
  const c74Bal = summary?.balance ?? 0;
  const c74Tier = summary?.tier ?? "Spark";
  const wagerRate = summary?.config?.wager_earn_per_usdt;

  return (
    <div className="v3l">
      <style>{V2_CARD_CSS}</style>
      <style>{CSS}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="v3l-top">
        <Link to="/v3/profile" className="v3l-ava" aria-label="Profile">
          <img src={art["v3.hdr.avatar"] ?? "/icons/v3/hdr/avatar.png"} alt="" onError={(e) => retryIcon(e.currentTarget, "/icons/v3/hdr/avatar.png")} />
          <span className="v3l-ava-vip"><C7TierIcon tier={pulse.rank.name} size={10} /> VIP</span>
        </Link>
        <Link to="/v3/profile/vip" className="v3l-who" aria-label="VIP status">
          <b>{pulse.rank.name}</b>
          <small>C74 VIP Member</small>
        </Link>
        <div className="v3l-pill">
          <span className="v3l-pill-v">{money(shownBal)}</span>
          <button className="v3l-pill-plus" aria-label="Deposit" onClick={() => { playV2("deposit"); nav("/deposit"); }}><Plus size={18} /></button>
        </div>
        <Link to="/v3/rewards" className="v3l-hic" aria-label="Rewards">
          <img src={art["v3.hdr.rewards"] ?? "/icons/v3/hdr/rewards.png"} alt="" onError={(e) => retryIcon(e.currentTarget, "/icons/v3/hdr/rewards.png")} />
        </Link>
        <Link to="/notifications" className="v3l-hic" aria-label={unreadCount ? `${unreadCount} unread` : "Inbox"}>
          <img src={art["v3.hdr.inbox"] ?? "/icons/v3/hdr/inbox.png"} alt="" onError={(e) => retryIcon(e.currentTarget, "/icons/v3/hdr/inbox.png")} />
          {unreadCount > 0 && <span className="v3l-hic-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </Link>
        <Link to="/settings" className="v3l-hic" aria-label="Settings">
          <img src={art["v3.hdr.settings"] ?? "/icons/v3/hdr/settings.png"} alt="" onError={(e) => retryIcon(e.currentTarget, "/icons/v3/hdr/settings.png")} />
        </Link>
      </header>

      <main className="v3l-main">
        {/* ── Premium 6-tile shortcut nav (top) ───────────────── */}
        <V3ShortcutStrip />

        {/* ── Welcome Bonus ───────────────────────────────────────
             The TOTAL BALANCE card was removed to de-duplicate the wallet
             balance: it lives in the header pill (money(shownBal)) and in full
             on the Wallet page. C74 (a separate token balance) stays below. */}
        <button type="button" className="v3l-card v3l-bonus v3l-bonus--full" onClick={() => { playV2("click"); nav("/v3/rewards"); }} aria-label="Welcome bonus — claim in Rewards">
          <div className="v3l-bonus-tx">
            <span className="v3l-bonus-k">WELCOME BONUS</span>
            <span className="v3l-bonus-p">100% <em>UP TO</em></span>
            <span className="v3l-bonus-v">$10,000</span>
            <span className="v3l-bonus-cta">CLAIM NOW</span>
          </div>
          <C7Asset slot="hero.chest" className="v3l-bonus-art" fallback={<img className="v3l-bonus-art" src="/icons/v3/bonus-treasure.png" alt="" aria-hidden="true" decoding="async" />} />
        </button>

        {/* ── C74 Token ───────────────────────────────────────── */}
        <div className="v3l-card v3l-c74">
            <div className="v3l-c74-head">
              <span className="v3l-c74-t"><C7Asset slot="icon.token" className="v3l-c74-t-ic" fallback={<img className="v3l-c74-t-ic" src="/icons/v3/c74-token.png" alt="" aria-hidden="true" />} /> C74 TOKEN</span>
              <span className="v3l-coin-wrap"><C7Asset slot="c74.medallion" className="v3l-c74-coin" fallback={<img className="v3l-c74-coin" src="/images/reel/coin.png" alt="" onError={(e) => retryIcon(e.currentTarget, "/images/reel/coin.png")} />} /></span>
            </div>
            <div className="v3l-c74-row">
              <span className="v3l-c74-k">YOUR C74 BALANCE</span>
              <span className="v3l-c74-bal">{fmtNum(c74Bal)} <em>C74</em></span>
            </div>
            <div className="v3l-c74-meta">
              <span><b>Tier</b> <C7TierIcon tier={c74Tier} size={13} /> {c74Tier}</span>
              <span><b>Earn</b> {wagerRate != null ? `${fmtRate(wagerRate)} C74 / $1` : "—"}</span>
            </div>
            <div className="v3l-c74-acts">
              <button type="button" className="v3l-c74-btn" onClick={() => { playV2("click"); nav("/c74/mining"); }}><C7Asset slot="icon.mining" className="v3l-btn-ic" fallback={<img className="v3l-btn-ic" src="/icons/v3/mining.png" alt="" aria-hidden="true" />} /> Mining</button>
              <button type="button" className="v3l-c74-btn gold" onClick={() => { playV2("click"); nav("/c74/token"); }}>Learn More ›</button>
            </div>
            {/* Convert C74 → USDT. There is NO real user-facing C74→USDT
                redemption RPC yet (only an owner-only treasury swap that never
                touches user wallets), so this is an honest Coming-Soon affordance
                — it moves NO balance and fakes nothing. Wire the real convert →
                credit-USDT → existing withdraw flow here once that server RPC
                (rate + min + available, all server-side) exists. */}
            <button
              type="button"
              className="v3l-c74-convert"
              aria-disabled="true"
              title="C74 → USDT conversion is coming soon"
              onClick={() => { playV2("click"); toast("C74 → USDT conversion is coming soon"); }}
            >
              <span className="v3l-c74-convert-l"><C7Asset slot="icon.convert" className="v3l-btn-ic" fallback={<img className="v3l-btn-ic" src="/icons/v3/convert.png" alt="" aria-hidden="true" />} /> Convert C74 → USDT</span>
              <span className="v3l-c74-convert-soon">COMING SOON</span>
            </button>
          </div>

        {/* ── Money Mania jackpot ─────────────────────────────── */}
        {/* Supplied premium hero art (jackpot figure is baked into the image — the
            app has no real jackpot pool; this preserves the existing cosmetic
            display). Tap launches the real Money Mania catalog game. */}
        <button type="button" className="v3l-mania" onClick={launchJackpot} aria-label="Play the Money Mania jackpot">
          <img src="/icons/v2/jackpot-lotto.jpg" alt="Money Mania jackpot — tap to play" decoding="async" fetchPriority="high" />
        </button>

        {/* ── Featured Games ──────────────────────────────────── */}
        <div className="v3l-feat-head">
          <span className="v3l-feat-t"><C7Icon name="star" size={16} /> FEATURED GAMES</span>
          <button type="button" className="v3l-feat-all" onClick={() => nav("/v3/games")}>VIEW ALL <ChevronRight size={14} /></button>
        </div>
        {catLoading ? (
          <div className="v3l-feat">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="v2c v2c--mini v2c-sk" />)}</div>
        ) : popular.length === 0 ? (
          <div className="v3l-empty">No live games right now.</div>
        ) : (
          <div className="v3l-feat">
            {popular.map((g, i) => <V2GameCard key={g.uid} game={g} assets={art} badge={badger(g, i)} index={i} onPlay={openGame} />)}
          </div>
        )}

        {/* ── Action ticker — the core journey, all real routes ──── */}
        <nav className="v3l-ticker" aria-label="Quick actions">
          <C7Icon name="crown" size={13} />
          <Link to="/v3/games" className="v3l-tick">Play</Link><i className="v3l-tick-sep" aria-hidden="true" />
          <Link to="/v3/profile/vip" className="v3l-tick">Level Up</Link><i className="v3l-tick-sep" aria-hidden="true" />
          <Link to="/missions" className="v3l-tick">Earn</Link><i className="v3l-tick-sep" aria-hidden="true" />
          <Link to="/withdraw" className="v3l-tick">Withdraw</Link>
          <C7Icon name="crown" size={13} />
        </nav>
      </main>

      <C74MegaWin />
    </div>
  );
}

const CSS = `
.v3l { position: relative; min-height: 100vh; min-height: 100dvh; color: #e9f6ee; font-family: Inter, system-ui, sans-serif;
  background:
    radial-gradient(120% 50% at 50% -6%, rgba(46,224,138,0.22), transparent 60%),
    radial-gradient(90% 40% at 50% 108%, rgba(46,224,138,0.12), transparent 60%),
    linear-gradient(180deg, #05231699 0%, #041a12 40%, #020a07 100%), #030c08; }

/* Header */
.v3l-top { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 9px; padding: 10px 12px calc(10px);
  background: linear-gradient(180deg, rgba(3,13,8,0.94), rgba(3,13,8,0.66)); backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(120,240,176,0.18); }
.v3l-ava { position: relative; flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; display: block; text-decoration: none;
  border: 2px solid rgba(246,214,122,0.8); box-shadow: 0 0 0 1px rgba(0,0,0,0.5), 0 4px 12px -4px rgba(0,0,0,0.7); overflow: visible; }
.v3l-ava img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.v3l-ava-vip { position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); white-space: nowrap;
  font-size: 8px; font-weight: 900; letter-spacing: 0.3px; color: #241808; padding: 1px 6px; border-radius: 999px;
  background: linear-gradient(180deg, #ffe9a8, #e6b24a); box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.v3l-who { display: flex; flex-direction: column; justify-content: center; min-width: 0; line-height: 1.12; text-decoration: none; flex-shrink: 1; overflow: hidden; }
.v3l-who b { font-size: 12.5px; font-weight: 900; color: #ffe9a8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3l-who small { font-size: 8.5px; font-weight: 700; letter-spacing: .3px; color: #6fd6a0; white-space: nowrap; }
@media (max-width: 430px) { .v3l-who { display: none; } }
.v3l-pill { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 6px 0 16px; border-radius: 999px;
  background: linear-gradient(180deg, rgba(9,32,21,0.9), rgba(5,18,12,0.95)); border: 1px solid rgba(246,214,122,0.4);
  box-shadow: inset 0 1px 0 rgba(255,244,214,0.14); }
.v3l-pill-v { flex: 1; text-align: center; font-size: 18px; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; letter-spacing: -0.3px; }
.v3l-pill-plus { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; display: grid; place-items: center; color: #241808;
  background: radial-gradient(120% 120% at 50% 10%, #fff2c0, #f6c945 55%, #c68a2e); box-shadow: 0 2px 8px -2px rgba(245,180,35,0.7); }
.v3l-pill-plus:active { transform: scale(0.92); }
.v3l-hic { position: relative; flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; text-decoration: none;
  background: linear-gradient(160deg, rgba(13,58,40,0.7), rgba(6,22,14,0.85)); border: 1px solid rgba(246,214,122,0.3);
  box-shadow: inset 0 1px 0 rgba(255,244,214,0.12); }
.v3l-hic img { width: 22px; height: 22px; object-fit: contain; }
.v3l-hic:active { transform: scale(0.94); }
.v3l-hic-badge { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; display: grid; place-items: center;
  font-size: 9px; font-weight: 900; color: #fff; background: #e5484d; border: 1.5px solid #041a12; }

.v3l-main { max-width: 560px; margin: 0 auto; padding: 8px 10px calc(128px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; }

/* Cards base */
.v3l-card { border-radius: 15px; padding: 10px; text-align: left; text-decoration: none; cursor: default;
  background: radial-gradient(120% 90% at 50% 0%, rgba(46,224,138,0.08), transparent 60%), linear-gradient(160deg, rgba(16,54,36,0.72), rgba(6,20,13,0.86));
  border: 1px solid rgba(0,168,107,0.32); box-shadow: inset 0 1px 0 rgba(255,244,214,0.12), 0 12px 26px -16px rgba(0,0,0,0.85); }
button.v3l-card { cursor: pointer; -webkit-tap-highlight-color: transparent; }
button.v3l-card:active { transform: scale(0.985); }

/* Two-column responsive grid — stacks on phones, 2-col ≥640px */
.v3l-g2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 640px) { .v3l-g2 { grid-template-columns: 1fr 1fr; align-items: stretch; } }
.v3l-left { display: flex; flex-direction: column; gap: 12px; }

/* Profile card — full width: avatar · name+tier · ID · chevron */
.v3l-prof { display: flex; align-items: center; gap: 12px; }
.v3l-prof-ava { flex-shrink: 0; width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(246,214,122,0.75); }
.v3l-prof-tx { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.v3l-prof-name { font-size: 17px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v3l-prof-vip { align-self: flex-start; font-size: 10.5px; font-weight: 800; color: #b9f6d0; padding: 3px 10px; border-radius: 999px;
  background: rgba(8,26,18,0.7); border: 1px solid rgba(0,168,107,0.4); white-space: nowrap; }
.v3l-prof-id { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  font-size: 11px; font-weight: 700; color: rgba(222,244,228,0.7); background: none; border: none; cursor: pointer; font-variant-numeric: tabular-nums; }
.v3l-prof-id:active { color: #ffe6a2; }
.v3l-prof-chev { flex-shrink: 0; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; cursor: pointer; color: #9fd8bd;
  background: rgba(8,26,18,0.6); border: 1px solid rgba(0,168,107,0.3); }
.v3l-prof-chev:active { transform: scale(0.92); }

/* Quick actions (5) */
.v3l-qa { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.v3l-qa-b { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 62px; padding: 10px 3px; min-width: 0;
  border-radius: 14px; cursor: pointer; color: #eaf7ef; -webkit-tap-highlight-color: transparent;
  background: linear-gradient(160deg, rgba(20,58,40,0.62), rgba(8,20,13,0.74)); border: 1px solid rgba(0,168,107,0.3);
  box-shadow: inset 0 1px 0 rgba(255,244,214,0.14), 0 8px 18px -10px rgba(0,0,0,0.8); transition: transform .12s ease; }
.v3l-qa-b:active { transform: scale(0.93); }
.v3l-qa-e { font-size: 20px; line-height: 1; }
.v3l-qa-l { font-size: 9.5px; font-weight: 800; color: rgba(230,246,236,0.86); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

/* Total Balance */
.v3l-bal { display: flex; flex-direction: column; gap: 2px; }
.v3l-bal-top { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: rgba(255,236,180,0.85); }
.v3l-bal-dia { font-size: 16px; }
.v3l-bal-v { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -1px; line-height: 1.15; font-variant-numeric: tabular-nums; }
.v3l-bal-sub { font-size: 10.5px; font-weight: 600; color: rgba(222,244,228,0.62); margin-bottom: 6px; }
.v3l-bal-acts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: auto; }
.v3l-ba { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 3px; border-radius: 12px; cursor: pointer;
  font-size: 10.5px; font-weight: 800; color: #d9fbe9; -webkit-tap-highlight-color: transparent;
  background: linear-gradient(180deg, rgba(0,168,107,0.28), rgba(6,40,26,0.5)); border: 1px solid rgba(0,168,107,0.42); }
.v3l-ba:active { transform: scale(0.93); }
.v3l-ba-ic { font-size: 15px; line-height: 1; }
.v3l-ba-soon { cursor: default; opacity: 0.72; }
.v3l-ba-soonbadge { position: absolute; top: -7px; right: -4px; font-size: 7px; font-weight: 900; letter-spacing: 0.3px; color: #241808; padding: 1px 5px; border-radius: 999px;
  background: linear-gradient(180deg, #ffe9a8, #d68a1e); }

/* Welcome bonus */
.v3l-bonus { position: relative; overflow: hidden; display: flex; align-items: center; min-height: 80px;
  background: radial-gradient(120% 100% at 100% 0%, rgba(246,201,69,0.16), transparent 55%), linear-gradient(150deg, rgba(20,54,36,0.9), rgba(6,18,12,0.94)); }
/* premium gold light-sweep (thilakam) gliding across the card */
.v3l-bonus::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 42%; z-index: 2; pointer-events: none;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.16) 44%, rgba(255,236,170,0.28) 50%, rgba(255,255,255,0.16) 56%, transparent);
  transform: skewX(-14deg) translateX(-160%); animation: v3l-sheen 5.4s ease-in-out infinite; }
.v3l-bonus-tx { display: flex; flex-direction: column; gap: 2px; z-index: 1; }
.v3l-bonus-k { font-size: 11px; font-weight: 800; letter-spacing: 0.6px; color: rgba(230,246,236,0.9); }
.v3l-bonus-p { font-size: 13px; font-weight: 800; color: #ffe6a2; } .v3l-bonus-p em { font-style: normal; font-size: 10px; color: rgba(230,246,236,0.7); }
.v3l-bonus-v { font-size: 25px; font-weight: 900; letter-spacing: -1px; line-height: 1;
  background: linear-gradient(180deg, #fff6d8, #ffe9a8 42%, #f5b423 78%, #b8860b); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.v3l-bonus-cta { margin-top: 8px; align-self: flex-start; font-size: 12px; font-weight: 900; color: #05340f; padding: 8px 18px; border-radius: 999px;
  background: linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B); box-shadow: 0 6px 16px -6px rgba(57,255,136,0.6); }
.v3l-bonus-art { position: absolute; right: 6px; bottom: 2px; width: 116px; height: auto; z-index: 1;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 16px rgba(246,201,69,0.5)); opacity: 0.98; pointer-events: none;
  animation: v3l-float 4.6s ease-in-out infinite; }

/* C74 token */
.v3l-c74 { display: flex; flex-direction: column; gap: 6px; }
.v3l-c74-head { display: flex; align-items: center; justify-content: space-between; }
.v3l-c74-t { font-size: 12px; font-weight: 900; letter-spacing: 0.4px; color: #6bf5a3; }
.v3l-coin-wrap { position: relative; display: inline-flex; }
.v3l-coin-wrap::before { content: ""; position: absolute; inset: -8px; border-radius: 50%; z-index: 0; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 54deg, rgba(255,238,160,0.6) 76deg, transparent 98deg 232deg, rgba(255,238,160,0.42) 256deg, transparent 280deg);
  filter: blur(1.5px); animation: v3l-coinspin 3.1s linear infinite; }
.v3l-c74-coin { position: relative; z-index: 1; height: 34px; width: 34px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45)) drop-shadow(0 0 11px rgba(246,201,69,0.6)); animation: v3l-float 4.6s ease-in-out infinite; }
@keyframes v3l-coinspin { to { transform: rotate(360deg); } }
.v3l-c74-t-ic { width: 19px; height: 19px; object-fit: contain; vertical-align: -4px; margin-right: 5px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 7px rgba(70,224,138,0.5)); }
.v3l-btn-ic { width: 17px; height: 17px; object-fit: contain; vertical-align: -3px; margin-right: 4px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 6px rgba(246,201,69,0.45)); }
@keyframes v3l-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3.5px); } }
@keyframes v3l-sheen { 0% { transform: skewX(-14deg) translateX(-160%); } 58%, 100% { transform: skewX(-14deg) translateX(320%); } }
@media (prefers-reduced-motion: reduce) { .v3l-bonus::after, .v3l-bonus-art, .v3l-c74-coin, .v3l-coin-wrap::before { animation: none; } .v3l-bonus::after, .v3l-coin-wrap::before { display: none; } }
.v3l-c74-row { display: flex; flex-direction: column; gap: 2px; }
.v3l-c74-k { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; color: rgba(222,244,228,0.66); }
.v3l-c74-bal { font-size: 22px; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; } .v3l-c74-bal em { font-style: normal; font-size: 13px; color: #ffe6a2; }
.v3l-c74-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12px; font-weight: 700; color: #eef7f0; }
.v3l-c74-meta b { font-weight: 800; color: rgba(222,244,228,0.55); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; margin-right: 4px; }
.v3l-c74-acts { display: flex; gap: 8px; margin-top: 1px; }
.v3l-c74-btn { flex: 1; padding: 8px 8px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 900; -webkit-tap-highlight-color: transparent;
  color: #d9fbe9; background: linear-gradient(180deg, rgba(0,168,107,0.3), rgba(6,40,26,0.55)); border: 1px solid rgba(0,168,107,0.5); }
.v3l-c74-btn.gold { color: #241808; border-color: transparent; background: linear-gradient(180deg, #ffe9a8, #f6c945 55%, #d68a1e); }
.v3l-c74-btn:active { transform: scale(0.95); }
/* Convert C74 → USDT — honest Coming-Soon affordance (moves no balance). */
.v3l-c74-convert { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; margin-top: 8px;
  padding: 10px 12px; border-radius: 10px; cursor: default; font-family: inherit; text-align: left;
  color: rgba(217,251,233,0.62); background: linear-gradient(180deg, rgba(0,168,107,0.14), rgba(6,40,26,0.42));
  border: 1px dashed rgba(0,168,107,0.5); -webkit-tap-highlight-color: transparent; }
.v3l-c74-convert-l { font-size: 12.5px; font-weight: 900; letter-spacing: 0.2px; }
.v3l-c74-convert-soon { flex-shrink: 0; font-size: 8.5px; font-weight: 900; letter-spacing: 0.6px; color: #2a1608;
  padding: 3px 8px; border-radius: 999px; background: linear-gradient(180deg, #ffe9a8, #f6c945 55%, #d68a1e); }
.v3l-c74-convert:active { transform: scale(0.99); }

/* Money Mania hero */
.v3l-mania { position: relative; display: block; width: 100%; padding: 0; border: 1px solid rgba(246,214,122,0.4); border-radius: 18px; overflow: hidden; cursor: pointer;
  background: #0a0602; box-shadow: 0 16px 34px -18px rgba(0,0,0,0.85), 0 0 26px -10px rgba(245,180,35,0.4); -webkit-tap-highlight-color: transparent; }
.v3l-mania:active { transform: scale(0.99); }
.v3l-mania img { display: block; width: 100%; height: auto; }
/* Living gold light-sweep across the jackpot hero (glamour / spin-alive feel). */
.v3l-mania::after { content: ""; position: absolute; top: -20%; height: 150%; width: 28%; left: -40%; pointer-events: none;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.22) 46%, rgba(255,236,170,0.3) 50%, transparent 58%);
  transform: skewX(-16deg); animation: v3l-mania-sweep 4.6s ease-in-out infinite; }
@keyframes v3l-mania-sweep { 0% { left: -40%; } 60%, 100% { left: 130%; } }
@media (prefers-reduced-motion: reduce) { .v3l-mania::after { animation: none; opacity: 0; } }

/* Featured games */
.v3l-feat-head { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
.v3l-feat-t { font-size: 13px; font-weight: 900; color: #ffe9a8; letter-spacing: 0.3px; }
.v3l-feat-all { display: inline-flex; align-items: center; gap: 2px; background: none; border: none; cursor: pointer; color: #6bf5a3; font-size: 12px; font-weight: 800; }
.v3l-feat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 560px) { .v3l-feat { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
.v3l-empty { padding: 22px; text-align: center; font-size: 13px; color: rgba(222,244,228,0.6); border-radius: 16px; border: 1px dashed rgba(0,168,107,0.3); }
/* Action ticker */
.v3l-ticker { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; padding: 10px 12px; border-radius: 13px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(46,224,138,0.08), transparent 60%), linear-gradient(180deg, rgba(9,32,21,0.88), rgba(4,16,10,0.94));
  border: 1px solid rgba(246,214,122,0.30); box-shadow: inset 0 1px 0 rgba(255,244,214,0.10), 0 10px 22px -16px rgba(0,0,0,0.85); }
.v3l-tick { font-size: 11px; font-weight: 900; letter-spacing: 0.7px; text-transform: uppercase; text-decoration: none; color: #ffe9a8; transition: color .14s ease; }
.v3l-tick:active { transform: scale(0.94); }
@media (hover: hover) { .v3l-tick:hover { color: #fff6d2; } }
.v3l-tick-sep { width: 5px; height: 5px; border-radius: 50%; background: linear-gradient(180deg, #ffe9a8, #c68a2e); box-shadow: 0 0 6px rgba(246,201,69,0.55); flex-shrink: 0; }
`;
