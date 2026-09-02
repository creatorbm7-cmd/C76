// IgInvite (/ig/invite) — luxury-dark "top-tier" Invite & Earn page. Reskinned
// from the dark AgentPage referral/agent dashboard to the C7 gold-framed cabinet
// system (RICH POLISH v2). Presentation only: the agent_summary +
// claim_agent_commission RPCs, useC74 referral bonus, the referral link/code,
// and copy/share/WhatsApp/claim handlers are preserved verbatim. A presentation-
// only `refreshing` flag wraps the existing load() for the header refresh — the
// RPC call itself is unchanged. No wallet / ledger / payment / withdrawal logic
// touched; no real-money enablement.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Users, Gift, Share2, Coins, Link2, Coins as CoinIc, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useC74 } from '@/hooks/useC74';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from "@/components/ig/IgSocialNotice";

interface Summary {
  referral_code: string | null;
  direct_referrals: number;
  team_size: number;
  total_earned: number;
  unclaimed: number;
  recent: { level: number; turnover: number; amount: number; at: string }[];
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.iginv-back, .iginv-refresh { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.iginv-refresh:disabled { opacity:0.6; cursor:default; }
.iginv-refresh:active { background:rgba(240,201,74,0.1); }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.iginv-main { padding:16px 12px; display:flex; flex-direction:column; gap:14px; }
.ige-hero { text-align:center; } .ige-hero img { max-width:120px; height:auto; opacity:0.92; filter:drop-shadow(0 8px 18px rgba(0,0,0,0.5)); }

.iginv-sec { display:flex; align-items:center; gap:7px; margin:2px 4px -4px; font-size:11px; letter-spacing:0.8px; font-weight:800; text-transform:uppercase; color:#f3ffe9; }
.iginv-sec svg { color:var(--gold); }

/* Loading skeleton */
.iginv-skel { display:flex; flex-direction:column; gap:14px; padding:16px 12px; }
.iginv-skel-h, .iginv-skel-c, .iginv-skel-r { border-radius:20px; border:1px solid var(--hair);
  background:linear-gradient(100deg, rgba(18,63,41,0.7) 30%, rgba(46,224,138,0.09) 50%, rgba(18,63,41,0.7) 70%); background-size:220% 100%; animation:iginv-sh 1.4s ease-in-out infinite; }
.iginv-skel-h { height:190px; } .iginv-skel-c { height:150px; } .iginv-skel-r { height:96px; }
@keyframes iginv-sh { 0%{background-position:180% 0;} 100%{background-position:-80% 0;} }
.iginv-spin { animation:iginv-rot 1s linear infinite; }
@keyframes iginv-rot { to { transform:rotate(360deg); } }

/* Earnings hero — cinematic gold-framed emerald cabinet + sheen sweep + gold shimmer */
.iginv-hero { position:relative; border-radius:22px; padding:22px 18px; text-align:center; overflow:hidden; border:1px solid transparent;
  background:radial-gradient(130% 120% at 50% 0%, rgba(240,201,74,0.18), transparent 56%), radial-gradient(120% 120% at 50% 6%, rgba(46,224,138,0.16), transparent 60%), linear-gradient(160deg, rgba(21,78,50,0.96), rgba(6,22,14,0.97));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.5), inset 0 1.6px 0 rgba(255,255,255,0.24), inset 0 0 30px rgba(46,224,138,0.1), 0 0 26px -8px rgba(240,201,74,0.5), 0 24px 48px -22px rgba(0,0,0,0.88); }
.iginv-hero::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.14) 50%, transparent 58%); transform:translateX(-150%); animation:iginv-sweep 7s ease-in-out infinite; }
@keyframes iginv-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.iginv-hero-mini { position:relative; z-index:1; font-size:10px; text-transform:uppercase; letter-spacing:1.4px; font-weight:900; color:var(--grn); }
.iginv-big { position:relative; z-index:1; font-size:38px; font-weight:900; margin:6px 0 14px; font-variant-numeric:tabular-nums; letter-spacing:-.5px;
  background:linear-gradient(100deg,var(--gold-lite) 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,var(--gold-lite) 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:iginv-gold 5.5s ease-in-out infinite; }
@keyframes iginv-gold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
.iginv-big span { font-size:16px; font-weight:800; -webkit-text-fill-color:var(--antique); }
.iginv-claim { position:relative; z-index:1; display:inline-flex; align-items:center; gap:8px; padding:13px 28px; border-radius:999px; border:1px solid rgba(255,255,255,0.3); cursor:pointer; font-size:14px; font-weight:900; letter-spacing:0.3px;
  color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6), 0 8px 18px -8px rgba(0,0,0,0.6); font-family:inherit; }
.iginv-claim:active { transform:translateY(1px); }
.iginv-claim:disabled { opacity:0.55; cursor:not-allowed; }
.iginv-earned { position:relative; z-index:1; font-size:11px; color:var(--mut); margin-top:12px; font-weight:700; }

/* Cards / panels — gold-framed emerald cabinet */
.iginv-card { background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent; border-radius:20px; padding:15px;
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }
.iginv-link { display:flex; align-items:center; gap:10px; padding:13px 14px; border-radius:13px; background:rgba(4,16,10,0.6); border:1px solid var(--line); cursor:pointer; color:var(--ink); }
.iginv-link span { font-size:12px; word-break:break-all; font-family:monospace; flex:1; color:var(--ink); }
.iginv-link svg { color:var(--gold); flex-shrink:0; }
.iginv-invite-row { display:flex; align-items:center; justify-content:space-between; margin-top:12px; }
.iginv-code { font-size:13px; color:var(--mut); }
.iginv-code b { color:var(--ink); }
.iginv-share { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; border-radius:11px; color:#04180e; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5), 0 0 14px -4px rgba(46,224,138,0.6), 0 6px 14px -6px rgba(0,0,0,0.5); }
.iginv-share:active { transform:translateY(1px); }
.iginv-wa { width:100%; margin-top:12px; display:inline-flex; align-items:center; justify-content:center; gap:9px; padding:13px; border-radius:13px; border:none; cursor:pointer; font-size:14px; font-weight:900; letter-spacing:0.2px; color:#fff;
  background:linear-gradient(180deg,#2fe578,#1fb45a 55%,#178a45); box-shadow:inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 16px -6px rgba(37,211,102,0.6); font-family:inherit; }
.iginv-wa:active { transform:translateY(1px); }
.iginv-wa:disabled { opacity:0.55; cursor:not-allowed; }

/* C74 referral bonus — polished gold cabinet with sheen sweep */
.iginv-c74 { position:relative; border-radius:20px; padding:16px; color:#3a2708; border:1px solid #7a5a1e; overflow:hidden;
  background:radial-gradient(120% 120% at 0% 0%, var(--gold-lite), var(--gold) 52%, var(--gold-deep) 100%); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.6), 0 0 22px -6px rgba(240,201,74,0.55), 0 20px 40px -20px rgba(0,0,0,0.7); }
.iginv-c74::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.32) 50%, transparent 58%); transform:translateX(-150%); animation:iginv-sweep 6.5s ease-in-out infinite; }
.iginv-c74-top { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:10px; }
.iginv-c74-badge { display:inline-flex; align-items:center; gap:6px; font-size:9.5px; font-weight:900; letter-spacing:0.8px; padding:4px 11px; border-radius:999px; color:#3a2708; background:rgba(10,36,16,0.14); border:1px solid rgba(58,39,8,0.35); }
.iginv-c74-earned { text-align:right; }
.iginv-c74-earned b { font-size:20px; font-weight:900; color:#3a2708; font-variant-numeric:tabular-nums; }
.iginv-c74-earned small { display:block; font-size:8px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; color:#6b4a12; margin-top:3px; }
.iginv-c74-hero { position:relative; z-index:1; margin-top:12px; display:flex; align-items:center; gap:12px; }
.iginv-c74-coin { display:grid; place-items:center; width:46px; height:46px; border-radius:50%; flex-shrink:0; color:#3a2708;
  background:radial-gradient(120% 120% at 50% 20%, rgba(255,255,255,0.75), rgba(255,255,255,0.15)); border:1px solid rgba(58,39,8,0.3); }
.iginv-c74-hero-t b { font-size:20px; font-weight:900; color:#3a2708; font-variant-numeric:tabular-nums; }
.iginv-c74-hero-t span { display:block; font-size:12px; font-weight:700; color:#6b4a12; margin-top:2px; }

/* Team stats */
.iginv-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.iginv-stat { background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent; border-radius:18px; padding:15px 8px; text-align:center;
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.32), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); }
.iginv-stat-ic { width:38px; height:38px; margin:0 auto; display:grid; place-items:center; border-radius:12px; color:var(--antique);
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.iginv-stat-ic.gold { color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); border-color:transparent; }
.iginv-stat-n { font-size:22px; font-weight:900; margin-top:8px; color:#f3ffe9; font-variant-numeric:tabular-nums; }
.iginv-stat-l { font-size:9.5px; color:var(--mut); text-transform:uppercase; letter-spacing:0.5px; font-weight:800; margin-top:2px; }

/* Rates */
.iginv-rates { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.iginv-rate { background:rgba(4,16,10,0.55); border:1px solid var(--line); border-radius:13px; padding:12px 4px; text-align:center; font-size:11px; color:var(--mut); font-weight:700; }
.iginv-rate b { display:block; font-size:18px; margin-top:4px; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 60%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.iginv-note { font-size:11px; color:var(--mut); margin:12px 0 0; line-height:1.45; }

/* History */
.iginv-hrow { display:flex; align-items:center; justify-content:space-between; padding:12px 15px; border-bottom:1px solid var(--hair); }
.iginv-hrow:last-child { border-bottom:none; }
.iginv-hrow span:first-child { font-size:12px; color:var(--ink); }
.iginv-hrow span:last-child { font-size:12px; font-weight:800; color:var(--grn); }

@media (prefers-reduced-motion: reduce) {
  .iginv-spin, .iginv-hero::after, .iginv-c74::after, .iginv-big, .iginv-skel-h, .iginv-skel-c, .iginv-skel-r { animation:none !important; }
  .iginv-big { -webkit-text-fill-color:var(--gold); }
  .iginv-claim:active, .iginv-share:active, .iginv-wa:active { transform:none; }
}
`;

export default function IgInvite() {
  const navigate = useNavigate();
  const [s, setS] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const { summary: c74 } = useC74();
  const c74Referral = Number(c74?.earned_by_source?.referral ?? 0);
  const c74PerFriend = c74?.config?.referral_reward ?? 500;

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('agent_summary');
    if (error) toast.error(error.message);
    setS(data as Summary);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Presentation-only wrapper around the same load() for the header refresh.
  const refresh = () => { if (refreshing) return; setRefreshing(true); Promise.resolve(load()).finally(() => setRefreshing(false)); };

  const link = s?.referral_code ? `${window.location.origin}/?ref=${s.referral_code}` : '';

  const copy = () => { if (!link) return; navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const share = async () => {
    if (!link) return;
    if (navigator.share) { try { await navigator.share({ title: 'Join C7 Winners', text: 'Play & win on C7 Winners', url: link }); } catch { /* cancelled */ } }
    else copy();
  };
  const shareWhatsApp = () => {
    if (!link) return;
    const text = `🎰 Join me on C7 Winners — play & win coins! Use my link to sign up:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const claim = async () => {
    if (!s || s.unclaimed <= 0 || claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_agent_commission');
      const r = data as { success?: boolean; amount?: number; message?: string };
      if (error) toast.error(error.message);
      else if (r?.success) { toast.success(`Claimed ${r.amount} USDT to wallet`); load(); }
      else toast.message(r?.message || 'Nothing to claim');
    } finally { setClaiming(false); }
  };

  return (
    <div className="ig iginv">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="iginv-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ig/profile'))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Invite &amp; Earn</span>
        <button className="iginv-refresh" onClick={refresh} disabled={loading || refreshing} aria-label="Refresh">
          <RotateCw size={18} className={loading || refreshing ? 'iginv-spin' : ''} />
        </button>
      </header>

      {loading ? (
        <div className="iginv-skel">
          <div className="iginv-skel-h" />
          <div className="iginv-skel-c" />
          <div className="iginv-skel-r" />
        </div>
      ) : (
        <main className="ig-main iginv-main">
        <div className="ige-hero"><img src="/icons/home/feat-invite.webp" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
          {/* Earnings hero */}
          <div className="iginv-hero">
            <div className="iginv-hero-mini">Unclaimed commission</div>
            <div className="iginv-big">{(s?.unclaimed ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span>USDT</span></div>
            <button className="iginv-claim" disabled={!s || s.unclaimed <= 0 || claiming} onClick={claim}>
              {claiming ? <Loader2 size={15} className="iginv-spin" /> : <Coins size={15} />} Claim to wallet
            </button>
            <div className="iginv-earned">Total earned: {(s?.total_earned ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</div>
          </div>

          {/* Invite link */}
          <div>
            <div className="iginv-sec"><Link2 size={14} /> <span>Your invite link</span></div>
            <div className="iginv-card" style={{ marginTop: 8 }}>
              <div className="iginv-link" onClick={copy}>
                <span>{link || 'No code yet'}</span>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </div>
              <div className="iginv-invite-row">
                <div className="iginv-code">Code: <b>{s?.referral_code || '—'}</b></div>
                <button className="iginv-share" onClick={share}><Share2 size={14} /> Share</button>
              </div>
              <button className="iginv-wa" onClick={shareWhatsApp} disabled={!link}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.004c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.05h-.003a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.81.83-3.03-.2-.31a8.18 8.18 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.57.19 1.1.16 1.51.1.46-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/>
                </svg>
                Share on WhatsApp
              </button>
            </div>
          </div>

          {/* C74 referral bonus — every friend who deposits earns you C74 */}
          <div className="iginv-c74">
            <div className="iginv-c74-top">
              <span className="iginv-c74-badge"><CoinIc size={13} /> C74 REFERRAL BONUS</span>
              <div className="iginv-c74-earned">
                <b>{c74Referral.toLocaleString('en-US', { maximumFractionDigits: 0 })}</b>
                <small>C74 earned</small>
              </div>
            </div>
            <div className="iginv-c74-hero">
              <span className="iginv-c74-coin" aria-hidden="true"><CoinIc size={30} /></span>
              <div className="iginv-c74-hero-t">
                <b>+{c74PerFriend.toLocaleString('en-US', { maximumFractionDigits: 0 })} C74</b>
                <span>for every friend who joins &amp; deposits</span>
              </div>
            </div>
          </div>

          {/* Team stats */}
          <div>
            <div className="iginv-sec"><Users size={14} /> <span>Team stats</span></div>
            <div className="iginv-stats" style={{ marginTop: 8 }}>
              <div className="iginv-stat"><span className="iginv-stat-ic"><Users size={17} /></span><div className="iginv-stat-n">{s?.direct_referrals ?? 0}</div><div className="iginv-stat-l">Direct</div></div>
              <div className="iginv-stat"><span className="iginv-stat-ic"><Users size={17} /></span><div className="iginv-stat-n">{s?.team_size ?? 0}</div><div className="iginv-stat-l">Team · 3 lvl</div></div>
              <div className="iginv-stat"><span className="iginv-stat-ic gold"><Gift size={17} /></span><div className="iginv-stat-n">{(s?.total_earned ?? 0).toFixed(0)}</div><div className="iginv-stat-l">Earned</div></div>
            </div>
          </div>

          {/* Rates */}
          <div>
            <div className="iginv-sec"><Coins size={14} /> <span>Commission rates</span></div>
            <div className="iginv-card" style={{ marginTop: 8 }}>
              <div className="iginv-rates">
                <div className="iginv-rate"><span>Level 1</span><b>1.0%</b></div>
                <div className="iginv-rate"><span>Level 2</span><b>0.3%</b></div>
                <div className="iginv-rate"><span>Level 3</span><b>0.1%</b></div>
              </div>
              <p className="iginv-note">You earn a rebate on what your referred players wager — credited automatically every few minutes.</p>
            </div>
          </div>

          {/* History */}
          {s?.recent?.length > 0 && (
            <div>
              <div className="iginv-sec"><span>Recent commission</span></div>
              <div className="iginv-card" style={{ marginTop: 8, padding: 0 }}>
                {s.recent.map((c, i) => (
                  <div key={i} className="iginv-hrow">
                    <span>L{c.level} · {Number(c.turnover).toLocaleString()} turnover</span>
                    <span>+{Number(c.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <IgSocialNotice variant="line" />
        </main>
      )}

      <IgTabBar active="profile" />
    </div>
  );
}
