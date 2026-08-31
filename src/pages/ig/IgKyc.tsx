// IgKyc (/ig/kyc) — luxury-dark "top-tier" reskin of KycPage. Same identity
// verification flow against the RLS-protected `kyc_submissions` table:
// users INSERT their own row (status='pending'); admins approve/reject.
// Every hook, state field, validation rule and the submit handler (Supabase
// auth + insert/update) is copied VERBATIM from the dark page. The read query
// (table/columns/filter) is unchanged — only extracted into a callable `load()`
// so the header refresh can re-read the same row. No wallet / ledger / payment /
// withdrawal logic touched; no real-money enablement. Presentation only.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Clock, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from '@/components/ig/IgSocialNotice';

const DOC_TYPES = [
  { id: 'passport',        label: 'Passport' },
  { id: 'national_id',     label: 'National ID' },
  { id: 'driving_license', label: 'Driving Licence' },
] as const;

type Status = 'none' | 'pending' | 'approved' | 'rejected' | 'verified';

interface Row {
  status: string | null;
  review_note: string | null;
  full_name: string | null;
}

export default function IgKyc() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // form
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');
  const [docType, setDocType] = useState<typeof DOC_TYPES[number]['id']>('passport');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  // Same read as the dark page (table / columns / filter unchanged), made
  // callable so the header refresh can re-read the row.
  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login?next=/kyc', { replace: true }); return; }
    const { data } = await supabase
      .from('kyc_submissions')
      .select('status, review_note, full_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setExisting(data as Row);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const status: Status = (() => {
    if (submitted) return 'pending';
    const s = (existing?.status ?? 'none').toLowerCase();
    if (s === 'approved' || s === 'verified') return 'approved';
    if (s === 'pending') return 'pending';
    if (s === 'rejected') return 'rejected';
    return 'none';
  })();

  const canEdit = status === 'none' || status === 'rejected';
  const formValid = fullName.trim().length > 1 && dob && nationality.trim() && docType;

  // Derived purely from the real status — no fabricated progress.
  const stepDone = status === 'approved' ? 3 : status === 'pending' ? 2 : status === 'rejected' ? 1 : 0;

  const submit = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login?next=/kyc', { replace: true }); return; }
      const payload = {
        user_id: user.id,
        full_name: fullName.trim(),
        date_of_birth: dob,
        nationality: nationality.trim(),
        address_text: address.trim() || null,
        document_type: docType,
        document_front_url: frontUrl.trim() || null,
        document_back_url: backUrl.trim() || null,
        selfie_url: selfieUrl.trim() || null,
        status: 'pending',
      };
      // Re-submit after a rejection updates the existing row; first time inserts.
      const { error: upErr } = existing
        ? await supabase.from('kyc_submissions').update(payload).eq('user_id', user.id)
        : await supabase.from('kyc_submissions').insert(payload);
      if (upErr) { setError(upErr.message); return; }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ig igkyc">
      <style>{CSS}</style>

      <header className="ig-top">
        <button
          className="igkyc-back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ig/settings'))}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="ig-ttl">Verification</span>
        <button className="igkyc-refresh" onClick={() => load()} disabled={loading} aria-label="Refresh">
          <RotateCw size={18} className={loading ? 'igkyc-spin' : ''} />
        </button>
      </header>

      <main className="ig-main igkyc-main">
        {/* Premium shield hero */}
        <section className="igkyc-hero">
          <div className="igkyc-shield"><ShieldCheck size={26} /></div>
          <div className="igkyc-hero-badge">KYC · REQUIRED FOR DEPOSITS</div>
          <p className="igkyc-hero-note">Verify your identity once. Required by law before any real-money deposit or withdrawal.</p>

          {/* Verification progress — reflects your real status only */}
          <div className="igkyc-steps" role="list">
            {['Submitted', 'Under review', 'Verified'].map((s, i) => {
              const n = i + 1;
              const state = n <= stepDone ? 'done' : n === stepDone + 1 ? 'active' : 'todo';
              return (
                <div key={s} className={`igkyc-step igkyc-step--${state}`} role="listitem">
                  <span className="igkyc-step-dot">{n <= stepDone ? '✓' : n}</span>
                  <span className="igkyc-step-lbl">{s}</span>
                </div>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="igkyc-loading">
            <Loader2 size={30} className="igkyc-spin" />
            <span>Loading…</span>
          </div>
        ) : status === 'approved' ? (
          <StatusCard tone="grn" icon={<CheckCircle2 size={20} />}
            title="Verified ✓" body={`Your identity is verified${existing?.full_name ? ` — ${existing.full_name}` : ''}. You're cleared to deposit when real-money is live.`} />
        ) : status === 'pending' ? (
          <StatusCard tone="gold" icon={<Clock size={20} />}
            title="Under review" body="Your documents are being reviewed by our team. This usually takes a short while — you'll be cleared to deposit once approved." />
        ) : (
          <>
            {status === 'rejected' && (
              <StatusCard tone="loss" icon={<AlertCircle size={20} />}
                title="Re-submission needed" body={existing?.review_note || 'Your previous submission could not be verified. Please re-submit with clear details.'} />
            )}

            <div className="igkyc-sec">Your details</div>
            <section className="igkyc-card">
              <Field label="Full legal name">
                <input className="igkyc-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As on your document" maxLength={120} />
              </Field>
              <div className="igkyc-two">
                <Field label="Date of birth">
                  <input className="igkyc-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                </Field>
                <Field label="Nationality">
                  <input className="igkyc-input" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Indian" maxLength={60} />
                </Field>
              </div>
              <Field label="Residential address (optional)">
                <input className="igkyc-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, postcode" maxLength={200} />
              </Field>

              <Field label="Document type">
                <div className="igkyc-doc-grid">
                  {DOC_TYPES.map((d) => (
                    <button key={d.id} type="button" className="igkyc-doc" data-active={docType === d.id} onClick={() => setDocType(d.id)}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Document front (image URL)">
                <input className="igkyc-input" value={frontUrl} onChange={(e) => setFrontUrl(e.target.value)} placeholder="Link to a clear photo of the front" maxLength={400} />
              </Field>
              <Field label="Document back (optional)">
                <input className="igkyc-input" value={backUrl} onChange={(e) => setBackUrl(e.target.value)} placeholder="Link to the back, if applicable" maxLength={400} />
              </Field>
              <Field label="Selfie holding the document (optional)">
                <input className="igkyc-input" value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} placeholder="Link to a selfie with your document" maxLength={400} />
              </Field>

              {error && (
                <div className="igkyc-err">
                  <AlertCircle size={16} /><span>{error}</span>
                </div>
              )}
            </section>

            <button onClick={submit} disabled={!formValid || submitting || !canEdit} className="igkyc-cta">
              {submitting ? (<><Loader2 size={17} className="igkyc-spin" /><span>Submitting…</span></>)
                          : (<><ShieldCheck size={17} /><span>Submit for verification</span></>)}
            </button>
            <p className="igkyc-disclaimer">Your details are stored securely and reviewed by a compliance admin. We never share them.</p>
          </>
        )}
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="igkyc-field">
      <label className="igkyc-label">{label}</label>
      {children}
    </div>
  );
}

function StatusCard({ tone, icon, title, body }: { tone: 'grn' | 'gold' | 'loss'; icon: React.ReactNode; title: string; body: string }) {
  return (
    <section className={`igkyc-status igkyc-status--${tone}`}>
      <span className="igkyc-status-ic">{icon}</span>
      <div>
        <div className="igkyc-status-t">{title}</div>
        <div className="igkyc-status-b">{body}</div>
      </div>
    </section>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igkyc-back, .igkyc-refresh { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.igkyc-refresh:disabled { opacity:0.6; cursor:default; }
.igkyc-refresh:active { background:rgba(240,201,74,0.1); }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igkyc-main { padding:16px 14px 24px; }

/* Shield hero — cinematic gold-framed cabinet */
.igkyc-hero { position:relative; overflow:hidden; text-align:center; padding:22px 18px 18px; border-radius:22px; margin-bottom:16px; border:1px solid transparent;
  background:radial-gradient(130% 120% at 50% 0%, rgba(240,201,74,0.16), transparent 56%), radial-gradient(120% 120% at 50% 8%, rgba(46,224,138,0.14), transparent 60%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.46), inset 0 1.6px 0 rgba(255,255,255,0.22), inset 0 0 30px rgba(46,224,138,0.08), 0 0 26px -8px rgba(240,201,74,0.42), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igkyc-hero::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igkyc-sweep 7s ease-in-out infinite; }
@keyframes igkyc-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igkyc-shield { position:relative; z-index:1; width:60px; height:60px; margin:0 auto 10px; border-radius:18px; display:grid; place-items:center; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 20px -3px rgba(240,201,74,0.6), 0 10px 22px -10px rgba(0,0,0,0.7); }
.igkyc-hero-badge { position:relative; z-index:1; display:inline-block; font-size:10px; font-weight:900; letter-spacing:0.12em; color:var(--antique); padding:5px 13px; border-radius:999px; background:rgba(4,16,10,0.55); border:1px solid var(--line); }
.igkyc-hero-note { position:relative; z-index:1; margin:10px auto 0; max-width:340px; font-size:12px; color:var(--mut); line-height:1.5; }

/* Verification progress rail (from real status only) */
.igkyc-steps { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:16px; }
.igkyc-step { display:flex; align-items:center; gap:7px; }
.igkyc-step-dot { width:24px; height:24px; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:900; color:var(--faint); background:rgba(4,16,10,0.6); border:1px solid var(--hair); flex-shrink:0; }
.igkyc-step-lbl { font-size:10.5px; font-weight:800; color:var(--faint); white-space:nowrap; }
.igkyc-step:not(:last-child)::after { content:""; width:16px; height:2px; border-radius:2px; background:var(--hair); margin-left:1px; }
.igkyc-step--done .igkyc-step-dot { color:#04180e; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); border-color:transparent; box-shadow:0 0 12px -3px rgba(46,224,138,0.7); }
.igkyc-step--done .igkyc-step-lbl { color:var(--grn); }
.igkyc-step--done:not(:last-child)::after { background:rgba(46,224,138,0.5); }
.igkyc-step--active .igkyc-step-dot { color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); border-color:transparent; box-shadow:0 0 12px -3px rgba(240,201,74,0.7); }
.igkyc-step--active .igkyc-step-lbl { color:var(--antique); }

.igkyc-loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:56px 0; color:var(--mut); font-size:13px; font-weight:700; }

.igkyc-status { display:flex; gap:12px; padding:15px 16px; border-radius:18px; margin-bottom:14px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igkyc-status-ic { flex-shrink:0; }
.igkyc-status-t { font-size:15px; font-weight:800; color:#f3ffe9; }
.igkyc-status-b { font-size:12.5px; color:var(--mut); margin-top:4px; line-height:1.5; }
.igkyc-status--grn { box-shadow:inset 0 0 0 1.3px rgba(46,224,138,0.5), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 0 22px -10px rgba(46,224,138,0.5), 0 24px 48px -28px rgba(0,0,0,0.9); background:radial-gradient(130% 120% at 0% 0%, rgba(46,224,138,0.18), transparent 60%), linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); }
.igkyc-status--grn .igkyc-status-ic { color:var(--grn); }
.igkyc-status--gold { box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.55), inset 0 1.5px 0 rgba(255,255,255,0.12), 0 0 22px -10px rgba(240,201,74,0.5), 0 24px 48px -28px rgba(0,0,0,0.9); background:radial-gradient(130% 120% at 0% 0%, rgba(240,201,74,0.18), transparent 60%), linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); }
.igkyc-status--gold .igkyc-status-ic { color:var(--gold); }
.igkyc-status--loss { box-shadow:inset 0 0 0 1.3px rgba(255,107,125,0.5), inset 0 1.5px 0 rgba(255,255,255,0.08), 0 0 22px -10px rgba(255,107,125,0.4), 0 24px 48px -28px rgba(0,0,0,0.9); background:radial-gradient(130% 120% at 0% 0%, rgba(255,107,125,0.15), transparent 60%), linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); }
.igkyc-status--loss .igkyc-status-ic { color:var(--loss); }

.igkyc-sec { margin:6px 4px 9px; font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; color:#f3ffe9; }
.igkyc-card { border-radius:20px; padding:16px 16px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }

.igkyc-field { margin-bottom:14px; }
.igkyc-field:last-child { margin-bottom:0; }
.igkyc-two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.igkyc-two .igkyc-field { margin-bottom:14px; }
.igkyc-label { display:block; font-size:10px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--mut); margin-bottom:6px; }
.igkyc-input { width:100%; background:rgba(4,16,10,0.6); border:1px solid var(--line); border-radius:11px; padding:12px 13px; font-size:14px; color:var(--ink); outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.05); }
.igkyc-input:focus { border-color:var(--grn); box-shadow:inset 0 1px 0 rgba(246,230,176,0.05), 0 0 0 3px rgba(46,224,138,0.18); }
.igkyc-input::placeholder { color:var(--faint); }
.igkyc-input[type="date"] { color-scheme:dark; }

.igkyc-doc-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.igkyc-doc { padding:11px 6px; border-radius:11px; border:1px solid var(--line); background:rgba(4,16,10,0.55); color:#eafff4; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .15s; }
.igkyc-doc[data-active="true"] { border-color:transparent; color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), 0 0 14px -4px rgba(240,201,74,0.6); }

.igkyc-err { display:flex; align-items:center; gap:9px; padding:11px 13px; border-radius:11px; margin-top:14px;
  border:1px solid rgba(255,107,125,0.45); background:rgba(255,107,125,0.12); color:var(--loss); font-size:12.5px; font-weight:600; }

.igkyc-cta { width:100%; margin-top:16px; display:inline-flex; align-items:center; justify-content:center; gap:9px; padding:15px; border-radius:14px; cursor:pointer;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); border:1px solid rgba(255,255,255,0.3); color:#3a2708; font-size:14px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6), 0 9px 20px -9px rgba(0,0,0,0.6); }
.igkyc-cta:active { transform:translateY(1px); }
.igkyc-cta:disabled { background:rgba(4,16,10,0.55); border:1px solid var(--line); color:var(--faint); box-shadow:none; cursor:default; }
.igkyc-disclaimer { margin:10px 0 0; text-align:center; font-size:11px; color:var(--mut); line-height:1.4; }

.igkyc-spin { animation:igkyc-spin 0.9s linear infinite; }
@keyframes igkyc-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .igkyc-spin, .igkyc-hero::after { animation:none; } .igkyc-cta:active { transform:none; } }
`;
