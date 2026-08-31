/**
 * AgentPage — referral / agent program dashboard (UONO HDR theme).
 * Shows the invite code/link, team size, commission earned, and a claim
 * button. Commission is a legitimate turnover rebate on referred players'
 * real wagering (L1 1% / L2 0.3% / L3 0.1%), accrued server-side and claimed
 * into the wallet via claim_agent_commission. No recruitment/sign-up income.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Users, Gift, Share2, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import LuxSpinner from '@/components/c7/shell/LuxSpinner';
import C74Frame from '@/components/c7/C74Frame';
import C7Icon from '@/components/c7/C7Icon';
import C7Asset from '@/components/c7/C7Asset';
import { useC74 } from '@/hooks/useC74';

interface Summary {
  referral_code: string | null;
  direct_referrals: number;
  team_size: number;
  total_earned: number;
  unclaimed: number;
  recent: { level: number; turnover: number; amount: number; at: string }[];
}

const CSS = `
.rf-head { position: sticky; top: 0; z-index: 10; background: linear-gradient(180deg, rgba(6,26,16,0.95), rgba(6,26,16,0.55)); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-bottom: 1px solid rgba(246,201,69,0.42); padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
.rf-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(46,230,130,0.85), rgba(255,214,120,0.95), rgba(46,230,130,0.85), transparent);
  background-size: 220% 100%; animation: rf-topglimmer 5.5s linear infinite; opacity: 0.9; }
@keyframes rf-topglimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
.rf-title { font-size: 19px; font-weight: 900; margin: 0; flex: 1; letter-spacing: -0.4px;
  background: linear-gradient(180deg, #ffffff 4%, #d6ffe9 40%, #ffe9a8 74%, #f5b423 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(46,230,130,0.4)) drop-shadow(0 1px 1px rgba(0,0,0,0.5)); }
@media (prefers-reduced-motion: reduce) { .rf-head::after { animation: none; } }
.rf-back { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,214,120,0.3); color: #ffe9a8; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.rf-mini { font-size: 10px; text-transform: uppercase; letter-spacing: 1.6px; color: rgba(230,246,236,0.5); font-weight: 800; }
.rf-card { padding: 16px; position: relative; overflow: hidden; }
.rf-hero { border-radius: 24px; padding: 24px 20px; text-align: center; position: relative; overflow: hidden;
  background: radial-gradient(120% 90% at 50% -16%, rgba(159,255,196,0.40), transparent 54%), linear-gradient(150deg, #1e7346 0%, #114e2d 55%, #0a5c33 100%);
  box-shadow: 0 16px 38px -10px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(120,240,176,0.18), inset 0 -12px 24px rgba(0,0,0,0.3); border: 1.5px solid rgba(120,240,176,0.5); }
.rf-hero .rf-mini { color: rgba(255,255,255,0.85); }
.rf-hero > *:not(.rf-hero-art) { position: relative; z-index: 2; }
.rf-hero-art { position: absolute; right: -8px; bottom: -12px; width: 104px; height: auto; z-index: 1; opacity: 0.92; pointer-events: none; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.45)); animation: rf-chestfloat 3.4s ease-in-out infinite; }
@keyframes rf-chestfloat { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-6px) rotate(3deg); } }
@media (prefers-reduced-motion: reduce) { .rf-hero-art { animation: none; } }
.rf-big { font-size: 36px; font-weight: 900; margin: 6px 0 14px; font-variant-numeric: tabular-nums; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.rf-claim { display: inline-flex; align-items: center; gap: 8px; padding: 13px 28px; border-radius: 999px; border: none; cursor: pointer; font-size: 14px; font-weight: 900; letter-spacing: 0.4px; color: #06180f;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.85), transparent 55%), linear-gradient(180deg, #eafff4, #6bf5a3);
  box-shadow: 0 6px 0 #0a5c33, inset 0 2px 0 rgba(255,255,255,0.8); transition: transform 0.12s ease; }
.rf-claim:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.7); }
.rf-claim:disabled { opacity: 0.55; cursor: not-allowed; }
.rf-earned { font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 12px; font-weight: 700; }
.rf-link { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: rgba(4,29,19,0.5); border: 1px solid rgba(246,201,69,0.32); cursor: pointer; color: #fff; }
.rf-invite-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.rf-code { font-size: 13px; color: rgba(255,255,255,0.8); }
.rf-share { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px; background: rgba(46,224,138,0.16); border: 1px solid rgba(46,224,138,0.4); color: #6bf5a3; font-size: 13px; font-weight: 800; cursor: pointer; }
.rf-wa { width: 100%; margin-top: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 13px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 900; letter-spacing: 0.3px; color: #fff;
  background: linear-gradient(180deg, #43d854, #1eb84a); box-shadow: 0 6px 0 #159a3c, inset 0 2px 0 rgba(255,255,255,0.45); transition: transform 0.12s ease; }
.rf-wa:active { transform: translateY(3px); box-shadow: 0 3px 0 #159a3c, inset 0 2px 0 rgba(255,255,255,0.45); }
.rf-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.rf-stat { padding: 14px 8px; text-align: center; }
.rf-stat svg { animation: rf-statglow 2.8s ease-in-out infinite; will-change: filter; }
.rf-stat:nth-child(2) svg { animation-delay: -0.9s; } .rf-stat:nth-child(3) svg { animation-delay: -1.8s; }
@keyframes rf-statglow { 0%,100% { filter: drop-shadow(0 0 0 transparent); } 50% { filter: drop-shadow(0 0 6px rgba(107,245,163,0.7)) brightness(1.08); } }
.rf-stat-n { font-size: 22px; font-weight: 900; margin-top: 6px; color: #fff; font-variant-numeric: tabular-nums; }
.rf-stat-l { font-size: 9.5px; color: rgba(230,246,236,0.5); text-transform: uppercase; letter-spacing: 0.6px; font-weight: 800; margin-top: 2px; }
@media (prefers-reduced-motion: reduce) { .rf-stat svg { animation: none !important; } }
.rf-rates { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rf-rate { background: radial-gradient(130% 70% at 50% 0%, rgba(53,217,138,0.1), transparent 60%), rgba(0,0,0,0.2); border: 1px solid rgba(245,180,35,0.2); border-radius: 12px; padding: 12px 4px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 700; }
.rf-rate b { display: block; font-size: 18px; color: #6bf5a3; margin-top: 4px; }
.rf-note { font-size: 11px; color: rgba(255,255,255,0.45); margin: 12px 0 0; line-height: 1.45; }
.rf-hrow { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid rgba(246,201,69,0.14); }
.rf-hrow:last-child { border-bottom: none; }
@keyframes rf-spin { to { transform: rotate(360deg); } }
.rf-spin { animation: rf-spin 1s linear infinite; }
/* C74 referral bonus card — gold "power" theme, matches the C74 wheel */
.rf-c74 { position: relative; overflow: hidden; border-radius: 20px; padding: 16px; margin-top: 14px;
  background: radial-gradient(120% 90% at 100% 0%, rgba(245,180,35,0.20), transparent 55%), linear-gradient(160deg, #2a1e06, #14110a);
  border: 1.5px solid rgba(245,180,35,0.55); box-shadow: 0 14px 32px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,236,180,0.25), 0 0 24px -10px rgba(245,180,35,0.5); }
.rf-c74-shine { position: absolute; top: 0; left: -60%; width: 42%; height: 100%; transform: skewX(-20deg); pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent); animation: rf-c74shine 4.6s ease-in-out infinite; }
@keyframes rf-c74shine { 0% { left: -60%; } 55%,100% { left: 130%; } }
.rf-c74-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: relative; z-index: 1; }
.rf-c74-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 900; letter-spacing: 1.2px; padding: 4px 11px; border-radius: 999px; color: #2a1a02;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 3px 10px -3px rgba(255,190,60,0.6); }
.rf-c74-earned { text-align: right; }
.rf-c74-earned b { font: 900 20px/1 Inter, system-ui, sans-serif; color: #ffe9a8; font-variant-numeric: tabular-nums; }
.rf-c74-earned small { display: block; font-size: 8px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 3px; }
.rf-c74-hero { position: relative; z-index: 1; margin-top: 12px; display: flex; align-items: center; gap: 12px; }
.rf-c74-coin { font-size: 34px; filter: drop-shadow(0 0 10px rgba(255,214,120,0.7)); animation: rf-c74float 3s ease-in-out infinite; }
@keyframes rf-c74float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.rf-c74-hero-t b { font-size: 22px; font-weight: 900; color: #fff6d8; font-variant-numeric: tabular-nums; }
.rf-c74-hero-t span { display: block; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.72); margin-top: 2px; }
@media (prefers-reduced-motion: reduce) { .rf-c74-shine, .rf-c74-coin { animation: none; } }
`;

export default function AgentPage() {
  const navigate = useNavigate();
  const [s, setS] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
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

  const link = s?.referral_code ? `${window.location.origin}/?ref=${s.referral_code}` : '';

  const copy = () => { if (!link) return; navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const share = async () => {
    if (!link) return;
    if (navigator.share) { try { await navigator.share({ title: 'Join C7 Winners', text: 'Play & win on C7 Winners', url: link }); } catch { /* cancelled */ } }
    else copy();
  };
  const shareWhatsApp = () => {
    if (!link) return;
    const text = `🎰 Join me on C7 Winners — play & win real money! Use my link to sign up:\n${link}`;
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
    <div className="c7p-page" style={{ minHeight: '100dvh', color: '#fff', paddingBottom: 'calc(128px + env(safe-area-inset-bottom, 0px))', position: 'relative', overflowX: 'hidden' }}>
      <style>{CSS}</style>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 520, margin: '0 auto' }}>
        <header className="rf-head c7-lux-head">
          <LuxFrameFX />
          <button onClick={() => navigate(-1)} aria-label="Back" className="rf-back"><ArrowLeft size={18} /></button>
          <span style={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(180deg, #12a04f, #2ee08a)' }} />
          <h1 className="rf-title c7p-title tt-emerald">Refer &amp; Earn</h1>
        </header>

        {loading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><LuxSpinner size={60} label="Loading" /></div>
        ) : (
          <>
            {/* Earnings hero */}
            <section style={{ padding: '16px 16px 0' }}>
              <div className="rf-hero">
                <C74Frame />
                <C7Asset slot="hero.chest" fallback={<img className="rf-hero-art" src="/casino/reward-invite-chest.webp" alt="" aria-hidden="true" loading="lazy" />} />
                <div className="rf-mini">Unclaimed commission</div>
                <div className="rf-big">{(s?.unclaimed ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style={{ fontSize: 16 }}>USDT</span></div>
                <button className="rf-claim" disabled={!s || s.unclaimed <= 0 || claiming} onClick={claim}>
                  {claiming ? <Loader2 size={15} className="rf-spin" /> : <Coins size={15} />} Claim to wallet
                </button>
                <div className="rf-earned">Total earned: {(s?.total_earned ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</div>
              </div>
            </section>

            {/* Invite */}
            <section style={{ padding: '14px 16px 0' }}>
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="link" /></span>
                <span className="c7p-sec-t">Your invite link</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <div className="c7p-glass rf-card">
                <div className="rf-link" onClick={copy}>
                  <span style={{ fontSize: 12, wordBreak: 'break-all', fontFamily: 'monospace' }}>{link || 'No code yet'}</span>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </div>
                <div className="rf-invite-row">
                  <div className="rf-code">Code: <b>{s?.referral_code || '—'}</b></div>
                  <button className="rf-share" onClick={share}><Share2 size={14} /> Share</button>
                </div>
                <button className="rf-wa" onClick={shareWhatsApp} disabled={!link}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.004c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.05h-.003a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.81.83-3.03-.2-.31a8.18 8.18 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.57.19 1.1.16 1.51.1.46-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/>
                  </svg>
                  Share on WhatsApp
                </button>
              </div>
            </section>

            {/* C74 referral bonus — every friend who deposits earns you C74 */}
            <section style={{ padding: '14px 16px 0' }}>
              <div className="rf-c74">
                <span className="rf-c74-shine" aria-hidden="true" />
                <div className="rf-c74-top">
                  <span className="rf-c74-badge"><C7Icon name="coin" size={14} /> C74 REFERRAL BONUS</span>
                  <div className="rf-c74-earned">
                    <b>{c74Referral.toLocaleString('en-US', { maximumFractionDigits: 0 })}</b>
                    <small>C74 earned</small>
                  </div>
                </div>
                <div className="rf-c74-hero">
                  <span className="rf-c74-coin" aria-hidden="true"><C7Icon name="coin" size={34} /></span>
                  <div className="rf-c74-hero-t">
                    <b>+{c74PerFriend.toLocaleString('en-US', { maximumFractionDigits: 0 })} C74</b>
                    <span>for every friend who joins &amp; deposits</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Team stats */}
            <section style={{ padding: '14px 16px 0' }}>
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="users" /></span>
                <span className="c7p-sec-t">Team stats</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <div className="rf-stats">
                <div className="c7p-glass rf-stat"><Users size={16} style={{ color: '#6bf5a3' }} /><div className="rf-stat-n">{s?.direct_referrals ?? 0}</div><div className="rf-stat-l">Direct</div></div>
                <div className="c7p-glass rf-stat"><Users size={16} style={{ color: '#6bf5a3' }} /><div className="rf-stat-n">{s?.team_size ?? 0}</div><div className="rf-stat-l">Team · 3 lvl</div></div>
                <div className="c7p-glass rf-stat"><Gift size={16} style={{ color: '#2ee08a' }} /><div className="rf-stat-n">{(s?.total_earned ?? 0).toFixed(0)}</div><div className="rf-stat-l">Earned</div></div>
              </div>
            </section>

            {/* Rates */}
            <section style={{ padding: '14px 16px 0' }}>
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="coin" /></span>
                <span className="c7p-sec-t">Commission rates</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <div className="c7p-glass rf-card">
                <div className="rf-rates">
                  <div className="rf-rate"><span>Level 1</span><b>1.0%</b></div>
                  <div className="rf-rate"><span>Level 2</span><b>0.3%</b></div>
                  <div className="rf-rate"><span>Level 3</span><b>0.1%</b></div>
                </div>
                <p className="rf-note">You earn a rebate on what your referred players wager — credited automatically every few minutes.</p>
              </div>
            </section>

            {/* History */}
            {s?.recent?.length > 0 && (
              <section style={{ padding: '18px 16px 0' }}>
                <div className="rf-mini" style={{ marginBottom: 8, paddingLeft: 4 }}>Recent commission</div>
                <div className="c7p-panel rf-card" style={{ padding: 0 }}>
                  {s.recent.map((c, i) => (
                    <div key={i} className="rf-hrow">
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>L{c.level} · {Number(c.turnover).toLocaleString()} turnover</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#2ee08a' }}>+{Number(c.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

    </div>
  );
}
